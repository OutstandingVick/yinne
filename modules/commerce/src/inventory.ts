import { and, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import {
  authorizedLocationIds,
  recordDomainChange,
  requirePermission,
  type RequestContext,
} from "@yinne/application";
import { principalId } from "@yinne/auth";
import { ApiError, type AdjustInventoryInput } from "@yinne/contracts";
import { POSTGRES_BIGINT_MAX } from "@yinne/core";
import {
  inventoryLevels,
  inventoryMovements,
  locations,
  products,
  variants,
  withTenantTransaction,
} from "@yinne/database";
import { decodeCursor, notFound, paged } from "./helpers";

function view(row: {
  id: string;
  variantId: string;
  locationId: string;
  onHand: bigint;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  sku?: string;
  variantTitle?: string;
  productName?: string;
  locationName?: string;
}) {
  return {
    id: row.id,
    variant_id: row.variantId,
    location_id: row.locationId,
    on_hand: row.onHand.toString(),
    version: row.version,
    sku: row.sku,
    variant_title: row.variantTitle,
    product_name: row.productName,
    location_name: row.locationName,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export async function listInventoryLevels(
  context: RequestContext,
  query: {
    limit: number;
    after?: string | undefined;
    search?: string | undefined;
    location_id?: string | undefined;
    variant_id?: string | undefined;
  },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const allowed = await authorizedLocationIds(
      tx,
      context.principal,
      "inventory:read",
      context.tenant.organizationId,
    );
    if (allowed?.length === 0)
      throw new ApiError(
        403,
        "authorization_error",
        "permission_denied",
        "You do not have permission to perform this action.",
      );
    if (query.location_id)
      await requirePermission(tx, context.principal, "inventory:read", {
        organizationId: context.tenant.organizationId,
        locationId: query.location_id,
      });
    const cursor = decodeCursor(query.after);
    const conditions = [eq(inventoryLevels.organizationId, context.tenant.organizationId)];
    if (allowed) conditions.push(inArray(inventoryLevels.locationId, allowed));
    if (query.location_id) conditions.push(eq(inventoryLevels.locationId, query.location_id));
    if (query.variant_id) conditions.push(eq(inventoryLevels.variantId, query.variant_id));
    if (cursor)
      conditions.push(
        or(
          lt(inventoryLevels.createdAt, cursor.createdAt),
          and(eq(inventoryLevels.createdAt, cursor.createdAt), lt(inventoryLevels.id, cursor.id)),
        )!,
      );
    if (query.search)
      conditions.push(
        or(
          ilike(variants.sku, `%${query.search}%`),
          ilike(variants.title, `%${query.search}%`),
          ilike(products.name, `%${query.search}%`),
          ilike(locations.name, `%${query.search}%`),
        )!,
      );
    const rows = await tx
      .select({
        id: inventoryLevels.id,
        variantId: inventoryLevels.variantId,
        locationId: inventoryLevels.locationId,
        onHand: inventoryLevels.onHand,
        version: inventoryLevels.version,
        createdAt: inventoryLevels.createdAt,
        updatedAt: inventoryLevels.updatedAt,
        sku: variants.sku,
        variantTitle: variants.title,
        productName: products.name,
        locationName: locations.name,
      })
      .from(inventoryLevels)
      .innerJoin(
        variants,
        and(
          eq(variants.organizationId, inventoryLevels.organizationId),
          eq(variants.id, inventoryLevels.variantId),
        ),
      )
      .innerJoin(
        products,
        and(
          eq(products.organizationId, variants.organizationId),
          eq(products.id, variants.productId),
        ),
      )
      .innerJoin(
        locations,
        and(
          eq(locations.organizationId, inventoryLevels.organizationId),
          eq(locations.id, inventoryLevels.locationId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(inventoryLevels.createdAt), desc(inventoryLevels.id))
      .limit(query.limit + 1);
    const result = paged(rows, query.limit);
    return { ...result, data: result.data.map(view) };
  });
}

export async function adjustInventory(context: RequestContext, input: AdjustInventoryInput) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "inventory:adjust", {
      organizationId: context.tenant.organizationId,
      locationId: input.location_id,
    });
    let delta: bigint;
    try {
      delta = BigInt(input.delta);
    } catch {
      throw new ApiError(
        400,
        "invalid_request",
        "invalid_quantity",
        "The inventory delta is invalid.",
        "delta",
      );
    }
    if (delta === 0n || delta > POSTGRES_BIGINT_MAX || delta < -POSTGRES_BIGINT_MAX)
      throw new ApiError(
        400,
        "invalid_request",
        "invalid_quantity",
        "The inventory delta is outside the supported range.",
        "delta",
      );
    const [catalogue] = await tx
      .select({
        variantStatus: variants.status,
        productStatus: products.status,
        trackInventory: variants.trackInventory,
      })
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
          eq(variants.id, input.variant_id),
        ),
      )
      .limit(1);
    if (!catalogue) notFound();
    if (!catalogue.trackInventory)
      throw new ApiError(
        409,
        "conflict",
        "inventory_not_tracked",
        "This variant does not track inventory.",
      );
    if (catalogue.variantStatus === "archived" || catalogue.productStatus === "archived")
      throw new ApiError(
        409,
        "conflict",
        "catalogue_archived",
        "Archived catalogue records cannot receive inventory adjustments.",
      );
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
    if (!location) notFound();
    await tx
      .insert(inventoryLevels)
      .values({
        organizationId: context.tenant.organizationId,
        variantId: input.variant_id,
        locationId: input.location_id,
        onHand: 0n,
      })
      .onConflictDoNothing();
    const [current] = await tx
      .select()
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.organizationId, context.tenant.organizationId),
          eq(inventoryLevels.variantId, input.variant_id),
          eq(inventoryLevels.locationId, input.location_id),
        ),
      )
      .for("update")
      .limit(1);
    if (!current)
      throw new ApiError(
        500,
        "internal_error",
        "inventory_level_missing",
        "The inventory level could not be initialized.",
      );
    const resulting = current.onHand + delta;
    if (resulting < 0n)
      throw new ApiError(
        409,
        "conflict",
        "insufficient_stock",
        "The adjustment would make inventory negative.",
        "delta",
        [{ on_hand: current.onHand.toString(), requested_delta: input.delta }],
      );
    if (resulting > POSTGRES_BIGINT_MAX)
      throw new ApiError(
        400,
        "invalid_request",
        "quantity_overflow",
        "The resulting inventory is too large.",
        "delta",
      );
    const [level] = await tx
      .update(inventoryLevels)
      .set({
        onHand: resulting,
        version: sql`${inventoryLevels.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryLevels.id, current.id))
      .returning();
    if (!level)
      throw new ApiError(
        500,
        "internal_error",
        "inventory_update_failed",
        "The inventory level could not be updated.",
      );
    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        organizationId: context.tenant.organizationId,
        inventoryLevelId: level.id,
        delta,
        resultingOnHand: resulting,
        reason: input.reason,
        actorType: context.principal.type,
        actorId: principalId(context.principal),
      })
      .returning();
    if (!movement)
      throw new ApiError(
        500,
        "internal_error",
        "inventory_movement_failed",
        "The inventory movement could not be recorded.",
      );
    await recordDomainChange(tx, context, {
      action: "inventory.adjusted",
      aggregateType: "inventory_level",
      aggregateId: level.id,
      aggregateVersion: level.version,
      data: {
        inventory_level_id: level.id,
        movement_id: movement.id,
        variant_id: input.variant_id,
        location_id: input.location_id,
        delta: delta.toString(),
        resulting_on_hand: resulting.toString(),
        reason: input.reason,
      },
    });
    return {
      ...view(level),
      movement: {
        id: movement.id,
        delta: movement.delta.toString(),
        resulting_on_hand: movement.resultingOnHand.toString(),
        reason: movement.reason,
        created_at: movement.createdAt,
      },
    };
  });
}
