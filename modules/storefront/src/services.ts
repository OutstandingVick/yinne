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

export async function publishStoreProduct(
  context: RequestContext,
  productId: string,
  input: PublishStoreProductInput,
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "storefront:publish", {
      organizationId: context.tenant.organizationId,
    });
    const [store] = await tx
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
    if (!store || store.status === "archived") notFound();
    const activeVariants = await tx
      .select({ currency: variants.currency })
      .from(variants)
      .innerJoin(
        products,
        and(
          eq(products.organizationId, variants.organizationId),
          eq(products.id, variants.productId),
        ),
      )
      .where(
        and(
          eq(products.id, productId),
          eq(products.status, "active"),
          eq(variants.status, "active"),
        ),
      );
    if (!activeVariants.length)
      throw new ApiError(
        409,
        "conflict",
        "product_not_publishable",
        "The product needs an active variant before publication.",
      );
    if (activeVariants.some((variant) => variant.currency !== store.currency)) {
      throw new ApiError(
        409,
        "conflict",
        "currency_mismatch",
        "Every published variant must use the Store currency.",
      );
    }
    const [listing] = await tx
      .insert(storeListings)
      .values({
        organizationId: context.tenant.organizationId,
        storeId: store.id,
        productId,
        status: "published",
        featured: input.featured,
        displayOrder: input.display_order,
        imageUrl: input.image_url ?? null,
        imageAlt: input.image_alt ?? null,
      })
      .onConflictDoUpdate({
        target: [storeListings.storeId, storeListings.productId],
        set: {
          status: "published",
          featured: input.featured,
          displayOrder: input.display_order,
          imageUrl: input.image_url ?? null,
          imageAlt: input.image_alt ?? null,
          version: sql`${storeListings.version} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!listing) notFound();
    await tx
      .update(stores)
      .set({ catalogueVersion: sql`${stores.catalogueVersion} + 1`, updatedAt: new Date() })
      .where(eq(stores.id, store.id));
    await recordDomainChange(tx, context, {
      action: "product.published",
      aggregateType: "store_listing",
      aggregateId: listing.id,
      aggregateVersion: listing.version,
      data: { store_id: store.id, product_id: productId },
    });
    return {
      id: listing.id,
      product_id: listing.productId,
      status: listing.status,
      featured: listing.featured,
      display_order: listing.displayOrder,
      image_url: listing.imageUrl,
      image_alt: listing.imageAlt,
    };
  });
}

export async function unpublishStoreProduct(context: RequestContext, productId: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "storefront:publish", {
      organizationId: context.tenant.organizationId,
    });
    const [store] = await tx
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
    if (!store) notFound();
    const [listing] = await tx
      .update(storeListings)
      .set({
        status: "unpublished",
        version: sql`${storeListings.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(storeListings.storeId, store.id),
          eq(storeListings.productId, productId),
          eq(storeListings.status, "published"),
        ),
      )
      .returning();
    if (!listing) notFound();
    await tx
      .update(stores)
      .set({ catalogueVersion: sql`${stores.catalogueVersion} + 1`, updatedAt: new Date() })
      .where(eq(stores.id, store.id));
    await recordDomainChange(tx, context, {
      action: "product.unpublished",
      aggregateType: "store_listing",
      aggregateId: listing.id,
      aggregateVersion: listing.version,
      data: { store_id: store.id, product_id: productId },
    });
    return { id: listing.id, product_id: listing.productId, status: listing.status };
  });
}

export async function listStoreListings(context: RequestContext) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "storefront:read", {
      organizationId: context.tenant.organizationId,
    });
    const [store] = await tx
      .select()
      .from(stores)
      .where(
        and(
          eq(stores.organizationId, context.tenant.organizationId),
          eq(stores.environment, context.tenant.environment),
        ),
      )
      .limit(1);
    if (!store) notFound();
    const rows = await tx
      .select({ product: products, listing: storeListings })
      .from(products)
      .leftJoin(
        storeListings,
        and(
          eq(storeListings.organizationId, products.organizationId),
          eq(storeListings.productId, products.id),
          eq(storeListings.storeId, store.id),
        ),
      )
      .where(eq(products.organizationId, context.tenant.organizationId))
      .orderBy(asc(products.name))
      .limit(100);
    return rows.map(({ product, listing }) => ({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      product_status: product.status,
      publication_status: listing?.status ?? "unpublished",
      featured: listing?.featured ?? false,
    }));
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

function availability(trackInventory: boolean, onHand: bigint | null) {
  if (!trackInventory) return "in_stock" as const;
  if (!onHand || onHand <= 0n) return "out_of_stock" as const;
  return onHand <= 5n ? ("low_stock" as const) : ("in_stock" as const);
}

export async function listPublicProducts(
  slug: string,
  limit = 20,
  environment: "test" | "live" = "test",
) {
  const resolved = await resolvePublicStore(slug, environment);
  const rows = await withTenantTransaction(resolved.context.tenant, (tx) =>
    tx
      .select({
        listing: storeListings,
        product: products,
        variant: variants,
        onHand: inventoryLevels.onHand,
      })
      .from(storeListings)
      .innerJoin(
        products,
        and(
          eq(products.organizationId, storeListings.organizationId),
          eq(products.id, storeListings.productId),
        ),
      )
      .innerJoin(
        variants,
        and(
          eq(variants.organizationId, products.organizationId),
          eq(variants.productId, products.id),
        ),
      )
      .leftJoin(
        inventoryLevels,
        and(
          eq(inventoryLevels.organizationId, variants.organizationId),
          eq(inventoryLevels.variantId, variants.id),
          eq(inventoryLevels.locationId, resolved.row.defaultLocationId),
        ),
      )
      .where(
        and(
          eq(storeListings.storeId, resolved.row.id),
          eq(storeListings.status, "published"),
          eq(products.status, "active"),
          eq(variants.status, "active"),
        ),
      )
      .orderBy(asc(storeListings.displayOrder), asc(storeListings.id), asc(variants.createdAt))
      .limit(Math.min(limit, 50) * 100),
  );
  const map = new Map<
    string,
    {
      slug: string;
      name: string;
      description: string | null;
      featured: boolean;
      image_url: string | null;
      image_alt: string | null;
      variants: {
        id: string;
        title: string;
        unit_amount: string;
        currency: string;
        availability: string;
      }[];
    }
  >();
  for (const row of rows) {
    const product = map.get(row.product.id) ?? {
      slug: row.product.slug,
      name: row.product.name,
      description: row.product.description,
      featured: row.listing.featured,
      image_url: row.listing.imageUrl,
      image_alt: row.listing.imageAlt,
      variants: [],
    };
    product.variants.push({
      id: row.variant.id,
      title: row.variant.title,
      unit_amount: row.variant.unitAmount.toString(),
      currency: row.variant.currency,
      availability: availability(row.variant.trackInventory, row.onHand),
    });
    map.set(row.product.id, product);
  }
  return {
    data: [...map.values()].slice(0, limit),
    has_more: map.size > limit,
    store: resolved.store,
  };
}

export async function getPublicProduct(
  storeSlug: string,
  productSlug: string,
  environment: "test" | "live" = "test",
) {
  const resolved = await resolvePublicStore(storeSlug, environment);
  const rows = await withTenantTransaction(resolved.context.tenant, (tx) =>
    tx
      .select({
        listing: storeListings,
        product: products,
        variant: variants,
        onHand: inventoryLevels.onHand,
      })
      .from(storeListings)
      .innerJoin(
        products,
        and(
          eq(products.organizationId, storeListings.organizationId),
          eq(products.id, storeListings.productId),
        ),
      )
      .innerJoin(
        variants,
        and(
          eq(variants.organizationId, products.organizationId),
          eq(variants.productId, products.id),
        ),
      )
      .leftJoin(
        inventoryLevels,
        and(
          eq(inventoryLevels.organizationId, variants.organizationId),
          eq(inventoryLevels.variantId, variants.id),
          eq(inventoryLevels.locationId, resolved.row.defaultLocationId),
        ),
      )
      .where(
        and(
          eq(storeListings.storeId, resolved.row.id),
          eq(storeListings.status, "published"),
          eq(products.status, "active"),
          eq(products.slug, productSlug),
          eq(variants.status, "active"),
        ),
      )
      .orderBy(asc(variants.createdAt))
      .limit(100),
  );
  const first = rows[0];
  if (!first) notFound();
  return {
    store: resolved.store,
    product: {
      slug: first.product.slug,
      name: first.product.name,
      description: first.product.description,
      image_url: first.listing.imageUrl,
      image_alt: first.listing.imageAlt,
      variants: rows.map(({ variant, onHand }) => ({
        id: variant.id,
        title: variant.title,
        unit_amount: variant.unitAmount.toString(),
        currency: variant.currency,
        availability: availability(variant.trackInventory, onHand),
      })),
    },
  };
}

export async function createPublicStoreCheckout(
  storeSlug: string,
  input: StorefrontCartInput,
  environment: "test" | "live" = "test",
) {
  const resolved = await resolvePublicStore(storeSlug, environment);
  const ids = input.items.map((item) => item.variant_id);
  const catalogue = await withTenantTransaction(resolved.context.tenant, (tx) =>
    tx
      .select({ variant: variants, listingId: storeListings.id, onHand: inventoryLevels.onHand })
      .from(variants)
      .innerJoin(
        products,
        and(
          eq(products.organizationId, variants.organizationId),
          eq(products.id, variants.productId),
        ),
      )
      .innerJoin(
        storeListings,
        and(
          eq(storeListings.organizationId, products.organizationId),
          eq(storeListings.productId, products.id),
        ),
      )
      .leftJoin(
        inventoryLevels,
        and(
          eq(inventoryLevels.organizationId, variants.organizationId),
          eq(inventoryLevels.variantId, variants.id),
          eq(inventoryLevels.locationId, resolved.row.defaultLocationId),
        ),
      )
      .where(
        and(
          eq(storeListings.storeId, resolved.row.id),
          eq(storeListings.status, "published"),
          eq(products.status, "active"),
          eq(variants.status, "active"),
          inArray(variants.id, ids),
        ),
      ),
  );
  if (catalogue.length !== ids.length) {
    throw new ApiError(
      409,
      "conflict",
      "cart_changed",
      "One or more cart items are no longer available.",
    );
  }
  for (const item of input.items) {
    const row = catalogue.find(({ variant }) => variant.id === item.variant_id)!;
    if (row.variant.currency !== resolved.row.currency) {
      throw new ApiError(
        409,
        "conflict",
        "currency_mismatch",
        "A cart item's currency no longer matches the Store.",
      );
    }
    if (row.variant.trackInventory && (row.onHand ?? 0n) < BigInt(item.quantity)) {
      throw new ApiError(
        409,
        "conflict",
        "insufficient_inventory",
        "A cart item no longer has enough inventory.",
      );
    }
  }
  const checkout = await createCheckoutSession(
    resolved.context,
    {
      merchant_id: resolved.row.merchantId,
      location_id: resolved.row.defaultLocationId,
      currency: resolved.row.currency,
      items: input.items,
      customer_capture: { name: true, email: true, phone: false },
      expires_in_seconds: 1_800,
      metadata: {
        channel: "storefront",
        store_id: resolved.row.id,
        store_slug: resolved.row.slug,
        catalogue_version: resolved.row.catalogueVersion,
      },
    },
    input.idempotency_key,
  );
  return checkout;
}
