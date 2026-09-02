import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { recordDomainChange, requirePermission, type RequestContext } from "@yinne/application";
import { createCheckoutSession } from "@yinne/checkout";
import {
  ApiError,
  type PublishStoreProductInput,
  type StorefrontCartInput,
  type UpdateStoreInput,
} from "@yinne/contracts";
import { createId } from "@yinne/core";
import {
  database,
  inventoryLevels,
  locations,
  products,
  storeListings,
  stores,
  variants,
  withTenantTransaction,
} from "@yinne/database";
import { assertStoreTransition, type StoreStatus } from "./state";

const notFound = (): never => {
  throw new ApiError(
    404,
    "invalid_request",
    "resource_not_found",
    "The requested resource does not exist.",
  );
};

const storeView = (row: typeof stores.$inferSelect) => ({
  id: row.id,
  merchant_id: row.merchantId,
  environment: row.environment,
  public_name: row.publicName,
  slug: row.slug,
  description: row.description,
  logo_url: row.logoUrl,
  status: row.status,
  currency: row.currency,
  default_location_id: row.defaultLocationId,
  contact_email: row.contactEmail,
  contact_phone: row.contactPhone,
  appearance: row.appearance,
  catalogue_version: row.catalogueVersion,
  version: row.version,
  public_url: `/store/${row.slug}`,
  created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(),
});

const publicStoreView = (row: typeof stores.$inferSelect) => ({
  public_name: row.publicName,
  slug: row.slug,
  description: row.description,
  logo_url: row.logoUrl,
  currency: row.currency,
  contact_email: row.contactEmail,
  contact_phone: row.contactPhone,
  appearance: row.appearance,
  catalogue_version: row.catalogueVersion,
});

function systemContext(organizationId: string, environment: "test" | "live"): RequestContext {
  return {
    tenant: { organizationId, environment },
    principal: {
      type: "system",
      id: "00000000-0000-7000-8000-000000000005",
      organizationId,
      environment,
    },
    requestId: createId(),
  };
}

export async function getStore(context: RequestContext) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "storefront:read", {
      organizationId: context.tenant.organizationId,
    });
    const [row] = await tx
      .select()
      .from(stores)
      .where(
        and(
          eq(stores.organizationId, context.tenant.organizationId),
          eq(stores.environment, context.tenant.environment),
        ),
      )
      .limit(1);
    if (!row) notFound();
    return storeView(row);
  });
}

export async function updateStore(context: RequestContext, input: UpdateStoreInput) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "storefront:write", {
      organizationId: context.tenant.organizationId,
      locationId: input.default_location_id,
    });
    if (input.default_location_id) {
      const [location] = await tx
        .select({ id: locations.id })
        .from(locations)
        .where(
          and(
            eq(locations.organizationId, context.tenant.organizationId),
            eq(locations.id, input.default_location_id),
            eq(locations.status, "active"),
          ),
        )
        .limit(1);
      if (!location) notFound();
    }
    const [row] = await tx
      .update(stores)
      .set({
        ...(input.public_name !== undefined ? { publicName: input.public_name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.logo_url !== undefined ? { logoUrl: input.logo_url } : {}),
        ...(input.default_location_id !== undefined
          ? { defaultLocationId: input.default_location_id }
          : {}),
        ...(input.contact_email !== undefined ? { contactEmail: input.contact_email } : {}),
        ...(input.contact_phone !== undefined ? { contactPhone: input.contact_phone } : {}),
        ...(input.appearance !== undefined ? { appearance: input.appearance } : {}),
        version: sql`${stores.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(stores.organizationId, context.tenant.organizationId),
          eq(stores.environment, context.tenant.environment),
        ),
      )
      .returning();
    if (!row) notFound();
    await recordDomainChange(tx, context, {
      action: "store.updated",
      aggregateType: "store",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: { store_id: row.id, changed_fields: Object.keys(input) },
    });
    return storeView(row);
  });
}

export async function transitionStore(context: RequestContext, status: StoreStatus) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "storefront:publish", {
      organizationId: context.tenant.organizationId,
    });
    const [current] = await tx
      .select()
      .from(stores)
      .where(
        and(
          eq(stores.organizationId, context.tenant.organizationId),
          eq(stores.environment, context.tenant.environment),
        ),
      )
      .for("update")
      .limit(1);
    if (!current) notFound();
    assertStoreTransition(current.status as StoreStatus, status);
    if (status === "active") {
      const [listing] = await tx
        .select({ id: storeListings.id })
        .from(storeListings)
        .where(and(eq(storeListings.storeId, current.id), eq(storeListings.status, "published")))
        .limit(1);
      if (!listing)
        throw new ApiError(
          409,
          "conflict",
          "store_has_no_products",
          "Publish at least one product before activating the Store.",
        );
    }
    const [row] = await tx
      .update(stores)
      .set({
        status,
        version: sql`${stores.version} + 1`,
        updatedAt: new Date(),
        ...(status === "archived" ? { archivedAt: new Date() } : {}),
      })
      .where(eq(stores.id, current.id))
      .returning();
    if (!row) notFound();
    await recordDomainChange(tx, context, {
      action:
        status === "active"
          ? "store.activated"
          : status === "paused"
            ? "store.paused"
            : "store.archived",
      aggregateType: "store",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: { store_id: row.id, status },
    });
    return storeView(row);
  });
}

export async function resolvePublicStore(slug: string, environment: "test" | "live" = "test") {
  const rows = (await database.execute(
    sql`select * from yinne_resolve_store_slug(${slug}, ${environment})`,
  )) as unknown as {
    organization_id: string;
    environment: "test" | "live";
    resource_id: string;
  }[];
  const resolved = rows[0];
  if (!resolved) notFound();
  const context = systemContext(resolved.organization_id, resolved.environment);
  const row = await withTenantTransaction(context.tenant, async (tx) => {
    const [store] = await tx
      .select()
      .from(stores)
      .where(eq(stores.id, resolved.resource_id))
      .limit(1);
    return store;
  });
  if (!row || row.status !== "active") notFound();
  return { context, row, store: publicStoreView(row) };
}
