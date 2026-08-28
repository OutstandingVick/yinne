import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { permissionKeys, type PermissionKey, type RoleKey } from "@yinne/auth/rbac";
import { generateApiKey } from "@yinne/auth/api-keys";
import {
  recordDomainChange as record,
  requirePermission,
  type RequestContext,
} from "@yinne/application";
import { ApiError } from "@yinne/contracts";
import {
  apiKeys,
  auditLogs,
  events,
  locations,
  merchants,
  organizationMembers,
  organizations,
  roleAssignments,
  roles,
  users,
  withTenantTransaction,
  type TenantTransaction,
} from "@yinne/database";
export type { RequestContext } from "@yinne/application";

export async function getOrganization(context: RequestContext) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "organization:read", {
      organizationId: context.tenant.organizationId,
    });
    const [organization] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, context.tenant.organizationId))
      .limit(1);
    if (!organization)
      throw new ApiError(
        404,
        "invalid_request",
        "resource_not_found",
        "The requested resource does not exist.",
      );
    return organization;
  });
}

export async function updateOrganization(
  context: RequestContext,
  input: { name?: string; defaultCurrency?: string; timezone?: string },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "organization:write", {
      organizationId: context.tenant.organizationId,
    });
    const [organization] = await tx
      .update(organizations)
      .set({
        ...input,
        version: sql`${organizations.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, context.tenant.organizationId))
      .returning();
    if (!organization)
      throw new ApiError(
        404,
        "invalid_request",
        "resource_not_found",
        "The requested resource does not exist.",
      );
    await record(tx, context, {
      action: "organization.updated",
      aggregateType: "organization",
      aggregateId: organization.id,
      aggregateVersion: organization.version,
      data: { organization_id: organization.id, changed_fields: Object.keys(input) },
    });
    return organization;
  });
}

export async function listMembers(context: RequestContext) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "members:read", {
      organizationId: context.tenant.organizationId,
    });
    return tx
      .select({
        id: organizationMembers.id,
        status: organizationMembers.status,
        name: users.name,
        email: users.email,
        role: roles.key,
        scopeType: roleAssignments.scopeType,
        scopeId: roleAssignments.scopeId,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .leftJoin(roleAssignments, eq(roleAssignments.memberId, organizationMembers.id))
      .leftJoin(roles, eq(roles.id, roleAssignments.roleId))
      .where(eq(organizationMembers.organizationId, context.tenant.organizationId))
      .orderBy(asc(users.name));
  });
}

async function validateScope(
  tx: TenantTransaction,
  organizationId: string,
  type: "organization" | "merchant" | "location",
  id: string,
): Promise<void> {
  if (type === "organization") {
    if (id !== organizationId)
      throw new ApiError(
        404,
        "invalid_request",
        "resource_not_found",
        "The requested scope does not exist.",
      );
    return;
  }
  const table = type === "merchant" ? merchants : locations;
  const [scope] = await tx
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.organizationId, organizationId), eq(table.id, id)))
    .limit(1);
  if (!scope)
    throw new ApiError(
      404,
      "invalid_request",
      "resource_not_found",
      "The requested scope does not exist.",
    );
}

export async function inviteMember(
  context: RequestContext,
  input: {
    email: string;
    role: RoleKey;
    scope: { type: "organization" | "merchant" | "location"; id: string };
  },
) {
  if (input.role === "owner")
    throw new ApiError(
      400,
      "invalid_request",
      "owner_transfer_required",
      "Owner must be changed through the ownership transfer flow.",
      "role",
    );
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "members:invite", {
      organizationId: context.tenant.organizationId,
      ...(input.scope.type === "location" ? { locationId: input.scope.id } : {}),
      ...(input.scope.type === "merchant" ? { merchantId: input.scope.id } : {}),
    });
    await validateScope(tx, context.tenant.organizationId, input.scope.type, input.scope.id);
    const normalizedEmail = input.email.trim().toLowerCase();
    let [user] = await tx
      .select()
      .from(users)
      .where(eq(users.normalizedEmail, normalizedEmail))
      .limit(1);
    if (!user)
      [user] = await tx
        .insert(users)
        .values({
          email: normalizedEmail,
          normalizedEmail,
          name: normalizedEmail.split("@")[0] ?? "Invited member",
          status: "active",
        })
        .returning();
    if (!user)
      throw new ApiError(
        500,
        "internal_error",
        "member_invite_failed",
        "The member could not be invited.",
      );
    const [member] = await tx
      .insert(organizationMembers)
      .values({ organizationId: context.tenant.organizationId, userId: user.id, status: "invited" })
      .onConflictDoUpdate({
        target: [organizationMembers.organizationId, organizationMembers.userId],
        set: {
          status: "invited",
          deactivatedAt: null,
          updatedAt: new Date(),
          version: sql`${organizationMembers.version} + 1`,
        },
      })
      .returning();
    if (!member)
      throw new ApiError(
        500,
        "internal_error",
        "member_invite_failed",
        "The member could not be invited.",
      );
    const [role] = await tx.select().from(roles).where(eq(roles.key, input.role)).limit(1);
    if (!role)
      throw new ApiError(
        500,
        "internal_error",
        "role_not_configured",
        "The role is not configured.",
      );
    await tx
      .insert(roleAssignments)
      .values({
        organizationId: context.tenant.organizationId,
        memberId: member.id,
        roleId: role.id,
        scopeType: input.scope.type,
        scopeId: input.scope.id,
      })
      .onConflictDoNothing();
    await record(tx, context, {
      action: "member.invited",
      aggregateType: "member",
      aggregateId: member.id,
      aggregateVersion: member.version,
      data: { member_id: member.id, role: input.role, scope: input.scope },
    });
    return {
      id: member.id,
      status: member.status,
      email: user.email,
      role: input.role,
      scope: input.scope,
    };
  });
}

export async function updateMemberRole(
  context: RequestContext,
  memberId: string,
  input: {
    role: RoleKey;
    scope: { type: "organization" | "merchant" | "location"; id: string };
  },
) {
  if (input.role === "owner")
    throw new ApiError(
      400,
      "invalid_request",
      "owner_transfer_required",
      "Owner must be changed through the ownership transfer flow.",
      "role",
    );
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "members:update_role", {
      organizationId: context.tenant.organizationId,
      ...(input.scope.type === "location" ? { locationId: input.scope.id } : {}),
      ...(input.scope.type === "merchant" ? { merchantId: input.scope.id } : {}),
    });
    await validateScope(tx, context.tenant.organizationId, input.scope.type, input.scope.id);
    const [assignment] = await tx
      .select({ id: roleAssignments.id, currentRole: roles.key })
      .from(roleAssignments)
      .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
      .where(
        and(
          eq(roleAssignments.organizationId, context.tenant.organizationId),
          eq(roleAssignments.memberId, memberId),
          eq(roleAssignments.scopeType, input.scope.type),
          eq(roleAssignments.scopeId, input.scope.id),
        ),
      )
      .limit(1);
    if (!assignment)
      throw new ApiError(
        404,
        "invalid_request",
        "resource_not_found",
        "The requested role assignment does not exist.",
      );
    if (assignment.currentRole === "owner")
      throw new ApiError(
        400,
        "invalid_request",
        "owner_transfer_required",
        "Owner must be changed through the ownership transfer flow.",
      );
    const [role] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, input.role));
    if (!role)
      throw new ApiError(
        500,
        "internal_error",
        "role_not_configured",
        "The role is not configured.",
      );
    await tx
      .update(roleAssignments)
      .set({ roleId: role.id, updatedAt: new Date() })
      .where(eq(roleAssignments.id, assignment.id));
    const [member] = await tx
      .update(organizationMembers)
      .set({ version: sql`${organizationMembers.version} + 1`, updatedAt: new Date() })
      .where(
        and(
          eq(organizationMembers.organizationId, context.tenant.organizationId),
          eq(organizationMembers.id, memberId),
        ),
      )
      .returning({ id: organizationMembers.id, version: organizationMembers.version });
    if (!member)
      throw new ApiError(
        404,
        "invalid_request",
        "resource_not_found",
        "The requested member does not exist.",
      );
    await record(tx, context, {
      action: "member.role_updated",
      aggregateType: "member",
      aggregateId: member.id,
      aggregateVersion: member.version,
      data: {
        member_id: member.id,
        previous_role: assignment.currentRole,
        role: input.role,
        scope: input.scope,
      },
    });
    return { id: member.id, role: input.role, scope: input.scope };
  });
}

export async function listRoles(context: RequestContext) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "organization:read", {
      organizationId: context.tenant.organizationId,
    });
    return tx
      .select({ key: roles.key, name: roles.name, description: roles.description })
      .from(roles)
      .orderBy(asc(roles.name));
  });
}

export async function createApiKey(
  context: RequestContext,
  input: { name: string; environment: "test" | "live"; scopes: string[] },
  pepper: string,
) {
  if (input.environment !== context.tenant.environment)
    throw new ApiError(
      400,
      "invalid_request",
      "environment_mismatch",
      "The API key environment must match the active environment.",
      "environment",
    );
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "api_keys:create", {
      organizationId: context.tenant.organizationId,
    });
    const validated = input.scopes.map((scope) => {
      if (!permissionKeys.includes(scope as PermissionKey))
        throw new ApiError(
          400,
          "invalid_request",
          "invalid_api_scope",
          "An API key scope is not recognized.",
          "scopes",
        );
      return scope as PermissionKey;
    });
    for (const permission of validated)
      await requirePermission(tx, context.principal, permission, {
        organizationId: context.tenant.organizationId,
      });
    if (context.principal.type !== "user")
      throw new ApiError(
        403,
        "authorization_error",
        "interactive_auth_required",
        "API keys must be created by an authenticated member.",
      );
    const generated = generateApiKey(input.environment, pepper);
    const [key] = await tx
      .insert(apiKeys)
      .values({
        organizationId: context.tenant.organizationId,
        name: input.name,
        prefix: generated.prefix,
        secretDigest: generated.digest,
        scopes: validated,
        environment: input.environment,
        createdBy: context.principal.userId,
      })
      .returning();
    if (!key)
      throw new ApiError(
        500,
        "internal_error",
        "api_key_create_failed",
        "The API key could not be created.",
      );
    await record(tx, context, {
      action: "api_key.created",
      aggregateType: "api_key",
      aggregateId: key.id,
      aggregateVersion: key.version,
      data: {
        api_key_id: key.id,
        prefix: key.prefix,
        scopes: validated,
        environment: key.environment,
      },
    });
    return {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      secret: generated.secret,
      scopes: validated,
      environment: key.environment,
      createdAt: key.createdAt,
    };
  });
}

export async function listApiKeys(context: RequestContext) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "api_keys:read", {
      organizationId: context.tenant.organizationId,
    });
    return tx
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        scopes: apiKeys.scopes,
        environment: apiKeys.environment,
        status: apiKeys.status,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
        revokedAt: apiKeys.revokedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, context.tenant.organizationId))
      .orderBy(desc(apiKeys.createdAt));
  });
}

export async function revokeApiKey(context: RequestContext, apiKeyId: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "api_keys:revoke", {
      organizationId: context.tenant.organizationId,
    });
    const [key] = await tx
      .update(apiKeys)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        updatedAt: new Date(),
        version: sql`${apiKeys.version} + 1`,
      })
      .where(
        and(
          eq(apiKeys.organizationId, context.tenant.organizationId),
          eq(apiKeys.id, apiKeyId),
          eq(apiKeys.status, "active"),
        ),
      )
      .returning();
    if (!key)
      throw new ApiError(
        404,
        "invalid_request",
        "resource_not_found",
        "The requested resource does not exist.",
      );
    await record(tx, context, {
      action: "api_key.revoked",
      aggregateType: "api_key",
      aggregateId: key.id,
      aggregateVersion: key.version,
      data: { api_key_id: key.id, prefix: key.prefix },
    });
    return { id: key.id, status: key.status, revokedAt: key.revokedAt };
  });
}

export async function listEvents(context: RequestContext, limit: number, after?: Date) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "events:read", {
      organizationId: context.tenant.organizationId,
    });
    const condition = after
      ? and(eq(events.organizationId, context.tenant.organizationId), lt(events.createdAt, after))
      : eq(events.organizationId, context.tenant.organizationId);
    return tx
      .select()
      .from(events)
      .where(condition)
      .orderBy(desc(events.createdAt))
      .limit(limit + 1);
  });
}

export async function listAuditLogs(context: RequestContext, limit: number, after?: Date) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "audit_logs:read", {
      organizationId: context.tenant.organizationId,
    });
    const condition = after
      ? and(
          eq(auditLogs.organizationId, context.tenant.organizationId),
          lt(auditLogs.createdAt, after),
        )
      : eq(auditLogs.organizationId, context.tenant.organizationId);
    return tx
      .select()
      .from(auditLogs)
      .where(condition)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit + 1);
  });
}
