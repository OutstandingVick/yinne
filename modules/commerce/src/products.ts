import { and, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { recordDomainChange, requirePermission, type RequestContext } from "@yinne/application";
import {
  ApiError,
  type CreateProductInput,
  type UpdateProductInput,
  type UpdateVariantInput,
  type VariantInput,
} from "@yinne/contracts";
import { parseMinorAmount } from "@yinne/core";
import {
  orderItems,
  products,
  variants,
  withTenantTransaction,
  type TenantTransaction,
} from "@yinne/database";
import { decodeCursor, isUniqueViolation, notFound, paged } from "./helpers";

function variantView(row: typeof variants.$inferSelect) {
  return {
    id: row.id,
    product_id: row.productId,
    sku: row.sku,
    title: row.title,
    unit_amount: row.unitAmount.toString(),
    currency: row.currency,
    track_inventory: row.trackInventory,
    status: row.status,
    version: row.version,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}
function productView(
  row: typeof products.$inferSelect,
  variantRows: (typeof variants.$inferSelect)[] = [],
) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    metadata: row.metadata,
    version: row.version,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    archived_at: row.archivedAt,
    variants: variantRows.map(variantView),
  };
}

async function productVariants(
  tx: TenantTransaction,
  organizationId: string,
  productIds: string[],
) {
  if (!productIds.length) return [];
  return tx
    .select()
    .from(variants)
    .where(
      and(eq(variants.organizationId, organizationId), inArray(variants.productId, productIds)),
    )
    .orderBy(desc(variants.createdAt));
}

export async function listProducts(
  context: RequestContext,
  query: {
    limit: number;
    after?: string | undefined;
    search?: string | undefined;
    status?: string | undefined;
  },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "products:read", {
      organizationId: context.tenant.organizationId,
    });
    const cursor = decodeCursor(query.after);
    const conditions = [eq(products.organizationId, context.tenant.organizationId)];
    if (cursor)
      conditions.push(
        or(
          lt(products.createdAt, cursor.createdAt),
          and(eq(products.createdAt, cursor.createdAt), lt(products.id, cursor.id)),
        )!,
      );
    if (query.search)
      conditions.push(
        or(ilike(products.name, `%${query.search}%`), ilike(products.slug, `%${query.search}%`))!,
      );
    if (query.status) conditions.push(eq(products.status, query.status));
    const rows = await tx
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(query.limit + 1);
    const rawPage = paged(rows, query.limit);
    const allVariants = await productVariants(
      tx,
      context.tenant.organizationId,
      rawPage.data.map((row) => row.id),
    );
    return {
      ...rawPage,
      data: rawPage.data.map((row) =>
        productView(
          row,
          allVariants.filter((variant) => variant.productId === row.id),
        ),
      ),
    };
  });
}

export async function getProduct(context: RequestContext, productId: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "products:read", {
      organizationId: context.tenant.organizationId,
    });
    const [row] = await tx
      .select()
      .from(products)
      .where(
        and(eq(products.organizationId, context.tenant.organizationId), eq(products.id, productId)),
      )
      .limit(1);
    if (!row) notFound();
    return productView(row, await productVariants(tx, context.tenant.organizationId, [row.id]));
  });
}

async function insertVariant(
  tx: TenantTransaction,
  organizationId: string,
  productId: string,
  input: VariantInput,
) {
  const [row] = await tx
    .insert(variants)
    .values({
      organizationId,
      productId,
      sku: input.sku,
      title: input.title,
      unitAmount: parseMinorAmount(input.unit_amount, "unit_amount"),
      currency: input.currency,
      trackInventory: input.track_inventory,
    })
    .returning();
  if (!row)
    throw new ApiError(
      500,
      "internal_error",
      "variant_create_failed",
      "The variant could not be created.",
    );
  return row;
}

export async function createProduct(context: RequestContext, input: CreateProductInput) {
  try {
    return await withTenantTransaction(context.tenant, async (tx) => {
      await requirePermission(tx, context.principal, "products:write", {
        organizationId: context.tenant.organizationId,
      });
      const [row] = await tx
        .insert(products)
        .values({
          organizationId: context.tenant.organizationId,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          metadata: input.metadata ?? {},
        })
        .returning();
      if (!row)
        throw new ApiError(
          500,
          "internal_error",
          "product_create_failed",
          "The product could not be created.",
        );
      const createdVariants = [];
      for (const variant of input.variants)
        createdVariants.push(
          await insertVariant(tx, context.tenant.organizationId, row.id, variant),
        );
      await recordDomainChange(tx, context, {
        action: "product.created",
        aggregateType: "product",
        aggregateId: row.id,
        aggregateVersion: row.version,
        data: { product_id: row.id, variant_count: createdVariants.length },
      });
      return productView(row, createdVariants);
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new ApiError(
        409,
        "conflict",
        "catalogue_identifier_conflict",
        "The slug or SKU is already in use.",
      );
    throw error;
  }
}

export async function updateProduct(
  context: RequestContext,
  productId: string,
  input: UpdateProductInput,
) {
  try {
    return await withTenantTransaction(context.tenant, async (tx) => {
      await requirePermission(
        tx,
        context.principal,
        input.status === "active" ? "products:publish" : "products:write",
        { organizationId: context.tenant.organizationId },
      );
      const [current] = await tx
        .select()
        .from(products)
        .where(
          and(
            eq(products.organizationId, context.tenant.organizationId),
            eq(products.id, productId),
          ),
        )
        .limit(1);
      if (!current) notFound();
      if (current.status === "archived")
        throw new ApiError(
          409,
          "conflict",
          "product_archived",
          "Archived products cannot be changed.",
        );
      if (input.status === "active") {
        const [activeVariant] = await tx
          .select({ id: variants.id })
          .from(variants)
          .where(
            and(
              eq(variants.organizationId, context.tenant.organizationId),
              eq(variants.productId, productId),
              eq(variants.status, "active"),
            ),
          )
          .limit(1);
        if (!activeVariant)
          throw new ApiError(
            409,
            "conflict",
            "active_variant_required",
            "A product needs an active variant before activation.",
            "status",
          );
      }
      const [row] = await tx
        .update(products)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          version: sql`${products.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.organizationId, context.tenant.organizationId),
            eq(products.id, productId),
          ),
        )
        .returning();
      if (!row) notFound();
      await recordDomainChange(tx, context, {
        action: input.status === "active" ? "product.activated" : "product.updated",
        aggregateType: "product",
        aggregateId: row.id,
        aggregateVersion: row.version,
        data: { product_id: row.id, changed_fields: Object.keys(input) },
      });
      return productView(row, await productVariants(tx, context.tenant.organizationId, [row.id]));
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new ApiError(
        409,
        "conflict",
        "catalogue_identifier_conflict",
        "The slug is already in use.",
        "slug",
      );
    throw error;
  }
}

export async function archiveProduct(context: RequestContext, productId: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "products:write", {
      organizationId: context.tenant.organizationId,
    });
    const [row] = await tx
      .update(products)
      .set({
        status: "archived",
        archivedAt: new Date(),
        updatedAt: new Date(),
        version: sql`${products.version} + 1`,
      })
      .where(
        and(
          eq(products.organizationId, context.tenant.organizationId),
          eq(products.id, productId),
          sql`${products.status} <> 'archived'`,
        ),
      )
      .returning();
    if (!row) notFound();
    await tx
      .update(variants)
      .set({
        status: "archived",
        archivedAt: new Date(),
        updatedAt: new Date(),
        version: sql`${variants.version} + 1`,
      })
      .where(
        and(
          eq(variants.organizationId, context.tenant.organizationId),
          eq(variants.productId, productId),
        ),
      );
    await recordDomainChange(tx, context, {
      action: "product.archived",
      aggregateType: "product",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: { product_id: row.id },
    });
    return productView(row, await productVariants(tx, context.tenant.organizationId, [row.id]));
  });
}

export async function createVariant(
  context: RequestContext,
  productId: string,
  input: VariantInput,
) {
  try {
    return await withTenantTransaction(context.tenant, async (tx) => {
      await requirePermission(tx, context.principal, "products:write", {
        organizationId: context.tenant.organizationId,
      });
      const [product] = await tx
        .select({ id: products.id, status: products.status })
        .from(products)
        .where(
          and(
            eq(products.organizationId, context.tenant.organizationId),
            eq(products.id, productId),
          ),
        )
        .limit(1);
      if (!product) notFound();
      if (product.status === "archived")
        throw new ApiError(
          409,
          "conflict",
          "product_archived",
          "Archived products cannot be changed.",
        );
      const row = await insertVariant(tx, context.tenant.organizationId, productId, input);
      await recordDomainChange(tx, context, {
        action: "variant.created",
        aggregateType: "variant",
        aggregateId: row.id,
        aggregateVersion: row.version,
        data: { variant_id: row.id, product_id: productId },
      });
      return variantView(row);
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new ApiError(409, "conflict", "sku_conflict", "The SKU is already in use.", "sku");
    throw error;
  }
}

export async function updateVariant(
  context: RequestContext,
  productId: string,
  variantId: string,
  input: UpdateVariantInput,
) {
  try {
    return await withTenantTransaction(context.tenant, async (tx) => {
      await requirePermission(tx, context.principal, "products:write", {
        organizationId: context.tenant.organizationId,
      });
      const [current] = await tx
        .select({ variant: variants, productStatus: products.status })
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
            eq(variants.organizationId, context.tenant.organizationId),
            eq(variants.productId, productId),
            eq(variants.id, variantId),
          ),
        )
        .limit(1);
      if (!current) notFound();
      if (current.productStatus === "archived" || current.variant.status === "archived")
        throw new ApiError(
          409,
          "conflict",
          "variant_archived",
          "Archived catalogue records cannot be changed.",
        );
      if (input.currency && input.currency !== current.variant.currency) {
        const [referenced] = await tx
          .select({ id: orderItems.id })
          .from(orderItems)
          .where(
            and(
              eq(orderItems.organizationId, context.tenant.organizationId),
              eq(orderItems.variantId, variantId),
            ),
          )
          .limit(1);
        if (referenced)
          throw new ApiError(
            409,
            "conflict",
            "variant_currency_immutable",
            "Currency cannot change after a variant has been ordered.",
            "currency",
          );
      }
      const [row] = await tx
        .update(variants)
        .set({
          ...(input.sku !== undefined ? { sku: input.sku } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.unit_amount !== undefined
            ? { unitAmount: parseMinorAmount(input.unit_amount, "unit_amount") }
            : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.track_inventory !== undefined ? { trackInventory: input.track_inventory } : {}),
          ...(input.status !== undefined ? { status: input.status, archivedAt: new Date() } : {}),
          updatedAt: new Date(),
          version: sql`${variants.version} + 1`,
        })
        .where(
          and(
            eq(variants.organizationId, context.tenant.organizationId),
            eq(variants.id, variantId),
            eq(variants.productId, productId),
          ),
        )
        .returning();
      if (!row) notFound();
      await recordDomainChange(tx, context, {
        action: "variant.updated",
        aggregateType: "variant",
        aggregateId: row.id,
        aggregateVersion: row.version,
        data: { variant_id: row.id, product_id: productId, changed_fields: Object.keys(input) },
      });
      return variantView(row);
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new ApiError(409, "conflict", "sku_conflict", "The SKU is already in use.", "sku");
    throw error;
  }
}
