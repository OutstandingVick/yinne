import { and, eq, inArray, or, sql } from "drizzle-orm";
import {
  can,
  principalId,
  type AuthorizationContext,
  type PermissionAssignment,
  type PermissionKey,
  type Principal,
  type RoleKey,
} from "@yinne/auth";
import { ApiError } from "@yinne/contracts";
import {
  auditLogs,
  events,
  locations,
  outboxMessages,
  roleAssignments,
  roles,
  webhookDeliveries,
  webhookEndpoints,
  webhookSubscriptions,
  type TenantContext,
  type TenantTransaction,
} from "@yinne/database";
import { createEvent, type DomainEventType } from "@yinne/events";

export interface RequestContext {
  tenant: TenantContext;
  principal: Principal;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function assignmentsFor(
  tx: TenantTransaction,
  memberId: string,
): Promise<PermissionAssignment[]> {
  const rows = await tx
    .select({
      role: roles.key,
      scopeType: roleAssignments.scopeType,
      scopeId: roleAssignments.scopeId,
    })
    .from(roleAssignments)
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .where(eq(roleAssignments.memberId, memberId));
  return rows.map((row) => ({
    role: row.role as RoleKey,
    scope: { type: row.scopeType as PermissionAssignment["scope"]["type"], id: row.scopeId },
  }));
}

export async function requirePermission(
  tx: TenantTransaction,
  principal: Principal,
  permission: PermissionKey,
  target: AuthorizationContext,
): Promise<void> {
  if (principal.organizationId !== target.organizationId)
    throw new ApiError(
      404,
      "invalid_request",
      "resource_not_found",
      "The requested resource does not exist.",
    );
  if (principal.type === "api_key") {
    if (!principal.scopes.includes(permission))
      throw new ApiError(
        403,
        "authorization_error",
        "permission_denied",
        "The credential does not have the required scope.",
      );
    return;
  }
  if (principal.type === "system") return;
  const assignments = await assignmentsFor(tx, principal.memberId);
  if (!can(assignments, permission, target))
    throw new ApiError(
      403,
      "authorization_error",
      "permission_denied",
      "You do not have permission to perform this action.",
    );
}

export async function hasPermission(
  tx: TenantTransaction,
  principal: Principal,
  permission: PermissionKey,
  target: AuthorizationContext,
): Promise<boolean> {
  if (principal.organizationId !== target.organizationId) return false;
  if (principal.type === "system") return true;
  if (principal.type === "api_key") return principal.scopes.includes(permission);
  return can(await assignmentsFor(tx, principal.memberId), permission, target);
}

export async function authorizedLocationIds(
  tx: TenantTransaction,
  principal: Principal,
  permission: PermissionKey,
  organizationId: string,
): Promise<string[] | null> {
  if (principal.organizationId !== organizationId) return [];
  if (principal.type === "system") return null;
  if (principal.type === "api_key") return principal.scopes.includes(permission) ? null : [];
  const assignments = (await assignmentsFor(tx, principal.memberId)).filter((assignment) =>
    can([assignment], permission, {
      organizationId,
      ...(assignment.scope.type === "merchant" ? { merchantId: assignment.scope.id } : {}),
      ...(assignment.scope.type === "location" ? { locationId: assignment.scope.id } : {}),
    }),
  );
  if (assignments.some((assignment) => assignment.scope.type === "organization")) return null;
  const direct = assignments
    .filter((assignment) => assignment.scope.type === "location")
    .map((assignment) => assignment.scope.id);
  const merchantIds = assignments
    .filter((assignment) => assignment.scope.type === "merchant")
    .map((assignment) => assignment.scope.id);
  if (merchantIds.length) {
    const locationRows = await tx
      .select({ id: locations.id })
      .from(locations)
      .where(inArray(locations.merchantId, merchantIds));
    direct.push(...locationRows.map((row) => row.id));
  }
  return [...new Set(direct)];
}

export async function recordDomainChange(
  tx: TenantTransaction,
  context: RequestContext,
  input: {
    action: DomainEventType;
    aggregateType: string;
    aggregateId: string;
    aggregateVersion: number;
    data: Record<string, unknown>;
  },
): Promise<void> {
  const event = createEvent({
    type: input.action,
    organizationId: context.tenant.organizationId,
    environment: context.tenant.environment,
    aggregate: {
      type: input.aggregateType,
      id: input.aggregateId,
      version: input.aggregateVersion,
    },
    actor: { type: context.principal.type, id: principalId(context.principal) },
    requestId: context.requestId,
    data: input.data,
  });
  await tx.insert(auditLogs).values({
    organizationId: context.tenant.organizationId,
    actorType: context.principal.type,
    actorId: principalId(context.principal),
    action: input.action,
    targetType: input.aggregateType,
    targetId: input.aggregateId,
    requestId: context.requestId,
    metadata: input.data,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
  await tx.insert(events).values({
    id: event.id,
    organizationId: event.organizationId,
    type: event.type,
    version: event.version,
    apiVersion: event.apiVersion,
    environment: event.environment,
    aggregateType: event.aggregate.type,
    aggregateId: event.aggregate.id,
    aggregateVersion: event.aggregate.version,
    actorType: event.actor.type,
    actorId: event.actor.id,
    requestId: event.requestId,
    payload: event.data,
    occurredAt: event.occurredAt,
  });
  const [outboxMessage] = await tx
    .insert(outboxMessages)
    .values({
      organizationId: event.organizationId,
      eventId: event.id,
      topic: `domain.${input.aggregateType}`,
      state: "processing",
    })
    .returning({ id: outboxMessages.id });
  if (!outboxMessage)
    throw new ApiError(
      500,
      "internal_error",
      "outbox_enqueue_failed",
      "The event could not be queued for internal dispatch.",
    );
  await tx.execute(sql`select public.yinne_enqueue_outbox_job(
    ${event.organizationId}::uuid,
    ${event.environment}::text,
    ${outboxMessage.id}::uuid
  )`);
  const wildcard = input.action.includes(".") ? `${input.action.split(".")[0]}.*` : input.action;
  const endpointRows = await tx
    .select({ endpointId: webhookEndpoints.id })
    .from(webhookSubscriptions)
    .innerJoin(
      webhookEndpoints,
      and(
        eq(webhookEndpoints.organizationId, webhookSubscriptions.organizationId),
        eq(webhookEndpoints.id, webhookSubscriptions.endpointId),
      ),
    )
    .where(
      and(
        eq(webhookSubscriptions.organizationId, context.tenant.organizationId),
        eq(webhookEndpoints.environment, context.tenant.environment),
        eq(webhookEndpoints.status, "enabled"),
        or(
          eq(webhookSubscriptions.eventPattern, input.action),
          eq(webhookSubscriptions.eventPattern, wildcard),
          eq(webhookSubscriptions.eventPattern, "*"),
        ),
      ),
    );
  if (endpointRows.length)
    await tx
      .insert(webhookDeliveries)
      .values(
        endpointRows.map(({ endpointId }) => ({
          organizationId: context.tenant.organizationId,
          environment: context.tenant.environment,
          eventId: event.id,
          endpointId,
          status: "queued",
        })),
      )
      .onConflictDoNothing();
}
