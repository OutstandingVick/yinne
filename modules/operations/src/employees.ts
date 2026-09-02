import { and, asc, eq } from "drizzle-orm";
import { recordDomainChange, requirePermission, type RequestContext } from "@yinne/application";
import type { AssignEmployeeLocationInput } from "@yinne/contracts";
import { ApiError } from "@yinne/contracts";
import {
  locations,
  organizationMembers,
  roleAssignments,
  roles,
  users,
  withTenantTransaction,
} from "@yinne/database";

function notFound(): never {
  throw new ApiError(
    404,
    "invalid_request",
    "resource_not_found",
    "The requested resource does not exist.",
  );
}
export async function listEmployees(context: RequestContext, locationId?: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "employees:read", {
      organizationId: context.tenant.organizationId,
      ...(locationId ? { locationId } : {}),
    });
    const rows = await tx
      .select({
        member: organizationMembers,
        user: users,
        assignment: roleAssignments,
        role: roles,
        location: locations,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .leftJoin(
        roleAssignments,
        and(
          eq(roleAssignments.organizationId, organizationMembers.organizationId),
          eq(roleAssignments.memberId, organizationMembers.id),
        ),
      )
      .leftJoin(roles, eq(roles.id, roleAssignments.roleId))
      .leftJoin(
        locations,
        and(eq(roleAssignments.scopeType, "location"), eq(locations.id, roleAssignments.scopeId)),
      )
      .where(
        and(
          eq(organizationMembers.organizationId, context.tenant.organizationId),
          ...(locationId ? [eq(roleAssignments.scopeId, locationId)] : []),
        ),
      )
      .orderBy(asc(users.name));
    const grouped = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        status: string;
        staff_profile: Record<string, unknown>;
        assignments: {
          role: string;
          scope_type: string;
          scope_id: string;
          location_name: string | null;
        }[];
      }
    >();
    for (const row of rows) {
      const employee = grouped.get(row.member.id) ?? {
        id: row.member.id,
        name: row.user.name,
        email: row.user.email,
        status: row.member.status,
        staff_profile: row.member.staffProfile,
        assignments: [],
      };
      if (row.assignment && row.role)
        employee.assignments.push({
          role: row.role.key,
          scope_type: row.assignment.scopeType,
          scope_id: row.assignment.scopeId,
          location_name: row.location?.name ?? null,
        });
      grouped.set(row.member.id, employee);
    }
    return [...grouped.values()];
  });
}
export async function getEmployee(context: RequestContext, id: string) {
  const rows = await listEmployees(context);
  const employee = rows.find((row) => row.id === id);
  if (!employee) notFound();
  return employee;
}
export async function assignEmployeeLocation(
  context: RequestContext,
  memberId: string,
  input: AssignEmployeeLocationInput,
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "employees:write", {
      organizationId: context.tenant.organizationId,
      locationId: input.location_id,
    });
    const [member] = await tx
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, context.tenant.organizationId),
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.status, "active"),
        ),
      )
      .limit(1);
    const [location] = await tx
      .select({ id: locations.id })
      .from(locations)
      .where(
        and(
          eq(locations.organizationId, context.tenant.organizationId),
          eq(locations.id, input.location_id),
          eq(locations.status, "active"),
        ),
      )
      .limit(1);
    const [role] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.key, input.role))
      .limit(1);
    if (!member || !location || !role) notFound();
    const [assignment] = await tx
      .insert(roleAssignments)
      .values({
        organizationId: context.tenant.organizationId,
        memberId,
        roleId: role.id,
        scopeType: "location",
        scopeId: location.id,
      })
      .onConflictDoNothing()
      .returning();
    if (assignment)
      await recordDomainChange(tx, context, {
        action: "employee.location_assigned",
        aggregateType: "organization_member",
        aggregateId: memberId,
        aggregateVersion: 1,
        data: { member_id: memberId, location_id: location.id, role: input.role },
      });
    return { member_id: memberId, location_id: location.id, role: input.role };
  });
}
export async function unassignEmployeeLocation(
  context: RequestContext,
  memberId: string,
  locationId: string,
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "employees:write", {
      organizationId: context.tenant.organizationId,
      locationId,
    });
    const deleted = await tx
      .delete(roleAssignments)
      .where(
        and(
          eq(roleAssignments.organizationId, context.tenant.organizationId),
          eq(roleAssignments.memberId, memberId),
          eq(roleAssignments.scopeType, "location"),
          eq(roleAssignments.scopeId, locationId),
        ),
      )
      .returning();
    if (!deleted.length) notFound();
    await recordDomainChange(tx, context, {
      action: "employee.location_unassigned",
      aggregateType: "organization_member",
      aggregateId: memberId,
      aggregateVersion: 1,
      data: { member_id: memberId, location_id: locationId },
    });
    return { member_id: memberId, location_id: locationId, unassigned: true };
  });
}
