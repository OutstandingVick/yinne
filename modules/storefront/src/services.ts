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
