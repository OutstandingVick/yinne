import { and, asc, eq, sql } from "drizzle-orm";
import { recordDomainChange, requirePermission, type RequestContext } from "@yinne/application";
import type { CreateLocationInput, UpdateLocationInput } from "@yinne/contracts";
import { ApiError } from "@yinne/contracts";
import { locations, merchants, orders, stores, withTenantTransaction } from "@yinne/database";
import { assertLocationTransition, type LocationStatus } from "./state";

function notFound(): never {
  throw new ApiError(
    404,
    "invalid_request",
    "resource_not_found",
    "The requested resource does not exist.",
  );
}
const view = (row: typeof locations.$inferSelect) => ({
  id: row.id,
  merchant_id: row.merchantId,
  name: row.name,
  code: row.code,
  type: row.type,
  timezone: row.timezone,
  status: row.status,
  address: row.address,
  version: row.version,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
});

export async function listLocations(
  context: RequestContext,
  filters: {
    limit?: number | undefined;
    status?: string | undefined;
    type?: string | undefined;
  } = {},
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "locations:read", {
      organizationId: context.tenant.organizationId,
    });
    const predicates = [eq(locations.organizationId, context.tenant.organizationId)];
    if (filters.status) predicates.push(eq(locations.status, filters.status));
    if (filters.type) predicates.push(eq(locations.type, filters.type));
    const rows = await tx
      .select()
      .from(locations)
      .where(and(...predicates))
      .orderBy(asc(locations.name))
      .limit(filters.limit ?? 20);
    return { data: rows.map(view), has_more: false, next_cursor: null };
  });
}
export async function getLocation(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "locations:read", {
      organizationId: context.tenant.organizationId,
      locationId: id,
    });
    const [row] = await tx
      .select()
      .from(locations)
      .where(and(eq(locations.organizationId, context.tenant.organizationId), eq(locations.id, id)))
      .limit(1);
    if (!row) notFound();
    return view(row);
  });
}
export async function createLocation(context: RequestContext, input: CreateLocationInput) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "locations:write", {
      organizationId: context.tenant.organizationId,
      merchantId: input.merchant_id,
    });
    const [merchant] = await tx
      .select({ id: merchants.id })
      .from(merchants)
      .where(
        and(
          eq(merchants.organizationId, context.tenant.organizationId),
          eq(merchants.id, input.merchant_id),
          eq(merchants.status, "active"),
        ),
      )
      .limit(1);
    if (!merchant) notFound();
    const [row] = await tx
      .insert(locations)
      .values({
        organizationId: context.tenant.organizationId,
        merchantId: input.merchant_id,
        name: input.name,
        code: input.code,
        type: input.type,
        timezone: input.timezone,
        address: Object.fromEntries(
          Object.entries(input.address).filter(
            (entry): entry is [string, string] => entry[1] !== undefined,
          ),
        ),
      })
      .returning();
    if (!row)
      throw new ApiError(
        500,
        "internal_error",
        "location_create_failed",
        "Location could not be created.",
      );
    await recordDomainChange(tx, context, {
      action: "location.created",
      aggregateType: "location",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: { location_id: row.id, merchant_id: row.merchantId, type: row.type },
    });
    return view(row);
  });
}
export async function updateLocation(
  context: RequestContext,
  id: string,
  input: UpdateLocationInput,
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "locations:write", {
      organizationId: context.tenant.organizationId,
      locationId: id,
    });
    const [row] = await tx
      .update(locations)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.address !== undefined
          ? {
              address: Object.fromEntries(
                Object.entries(input.address).filter(
                  (entry): entry is [string, string] => entry[1] !== undefined,
                ),
              ),
            }
          : {}),
        version: sql`${locations.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(locations.organizationId, context.tenant.organizationId),
          eq(locations.id, id),
          sql`${locations.status} <> 'archived'`,
        ),
      )
      .returning();
    if (!row) notFound();
    await recordDomainChange(tx, context, {
      action: "location.updated",
      aggregateType: "location",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: { location_id: row.id, changed_fields: Object.keys(input) },
    });
    return view(row);
  });
}
export async function transitionLocation(
  context: RequestContext,
  id: string,
  status: LocationStatus,
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "locations:write", {
      organizationId: context.tenant.organizationId,
      locationId: id,
    });
    const [current] = await tx
      .select()
      .from(locations)
      .where(and(eq(locations.organizationId, context.tenant.organizationId), eq(locations.id, id)))
      .for("update")
      .limit(1);
    if (!current) notFound();
    assertLocationTransition(current.status as LocationStatus, status);
    if (status === "archived") {
      const [used] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.locationId, id), eq(orders.financialStatus, "unpaid")))
        .limit(1);
      const [store] = await tx
        .select({ id: stores.id })
        .from(stores)
        .where(and(eq(stores.defaultLocationId, id), sql`${stores.status} <> 'archived'`))
        .limit(1);
      if (used || store)
        throw new ApiError(
          409,
          "conflict",
          "location_in_use",
          "Location has active operational work or Store configuration.",
        );
    }
    const [row] = await tx
      .update(locations)
      .set({
        status,
        version: sql`${locations.version} + 1`,
        updatedAt: new Date(),
        ...(status === "archived" ? { archivedAt: new Date() } : {}),
      })
      .where(eq(locations.id, id))
      .returning();
    if (!row) notFound();
    await recordDomainChange(tx, context, {
      action:
        status === "active"
          ? "location.activated"
          : status === "inactive"
            ? "location.deactivated"
            : "location.archived",
      aggregateType: "location",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: { location_id: row.id, status },
    });
    return view(row);
  });
}
