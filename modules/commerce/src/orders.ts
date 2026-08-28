import { createHash } from "node:crypto";
import { and, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import {
  authorizedLocationIds,
  recordDomainChange,
  requirePermission,
  type RequestContext,
} from "@yinne/application";
import { principalId } from "@yinne/auth";
import { ApiError, type CreateOrderInput } from "@yinne/contracts";
import { addMinorAmounts, createId, multiplyMinorAmount } from "@yinne/core";
import {
  customers,
  idempotencyRecords,
  inventoryLevels,
  locations,
  merchants,
  orderItems,
  orders,
  products,
  variants,
  withTenantTransaction,
  type TenantTransaction,
} from "@yinne/database";
import { decodeCursor, notFound, paged } from "./helpers";

function orderView(
  row: typeof orders.$inferSelect,
  items: (typeof orderItems.$inferSelect)[] = [],
) {
  return {
    id: row.id,
    number: row.number,
    merchant_id: row.merchantId,
    location_id: row.locationId,
    customer_id: row.customerId,
    financial_status: row.financialStatus,
    fulfilment_status: row.fulfilmentStatus,
    currency: row.currency,
    subtotal_amount: row.subtotalAmount.toString(),
    total_amount: row.totalAmount.toString(),
    metadata: row.metadata,
    version: row.version,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    cancelled_at: row.cancelledAt,
    items: items.map((item) => ({
      id: item.id,
      variant_id: item.variantId,
      product_name: item.productName,
      variant_title: item.variantTitle,
      sku: item.sku,
      unit_amount: item.unitAmount.toString(),
      currency: item.currency,
      quantity: item.quantity,
      total_amount: item.totalAmount.toString(),
    })),
  };
}
type OrderView = ReturnType<typeof orderView>;

async function itemsFor(tx: TenantTransaction, organizationId: string, orderIds: string[]) {
  if (!orderIds.length) return [];
  return tx
    .select()
    .from(orderItems)
    .where(
      and(eq(orderItems.organizationId, organizationId), inArray(orderItems.orderId, orderIds)),
    )
    .orderBy(orderItems.createdAt);
}

export async function listOrders(
  context: RequestContext,
  query: {
    limit: number;
    after?: string | undefined;
    search?: string | undefined;
    location_id?: string | undefined;
    customer_id?: string | undefined;
    financial_status?: string | undefined;
    fulfilment_status?: string | undefined;
  },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const allowed = await authorizedLocationIds(
      tx,
      context.principal,
      "orders:read",
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
      await requirePermission(tx, context.principal, "orders:read", {
        organizationId: context.tenant.organizationId,
        locationId: query.location_id,
      });
    const cursor = decodeCursor(query.after);
    const conditions = [eq(orders.organizationId, context.tenant.organizationId)];
    if (allowed) conditions.push(inArray(orders.locationId, allowed));
    if (query.location_id) conditions.push(eq(orders.locationId, query.location_id));
    if (query.customer_id) conditions.push(eq(orders.customerId, query.customer_id));
    if (query.financial_status) conditions.push(eq(orders.financialStatus, query.financial_status));
    if (query.fulfilment_status)
      conditions.push(eq(orders.fulfilmentStatus, query.fulfilment_status));
    if (query.search)
      conditions.push(
        or(
          ilike(orders.number, `%${query.search}%`),
          ilike(customers.name, `%${query.search}%`),
          ilike(customers.email, `%${query.search}%`),
        )!,
      );
    if (cursor)
      conditions.push(
        or(
          lt(orders.createdAt, cursor.createdAt),
          and(eq(orders.createdAt, cursor.createdAt), lt(orders.id, cursor.id)),
        )!,
      );
    const rows = await tx
      .select({ order: orders })
      .from(orders)
      .leftJoin(
        customers,
        and(
          eq(customers.organizationId, orders.organizationId),
          eq(customers.id, orders.customerId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(query.limit + 1);
    const raw = paged(
      rows.map((row) => row.order),
      query.limit,
    );
    const itemRows = await itemsFor(
      tx,
      context.tenant.organizationId,
      raw.data.map((row) => row.id),
    );
    return {
      ...raw,
      data: raw.data.map((row) =>
        orderView(
          row,
          itemRows.filter((item) => item.orderId === row.id),
        ),
      ),
    };
  });
}

export async function getOrder(context: RequestContext, orderId: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const [row] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.organizationId, context.tenant.organizationId), eq(orders.id, orderId)))
      .limit(1);
    if (!row) notFound();
    await requirePermission(tx, context.principal, "orders:read", {
      organizationId: context.tenant.organizationId,
      merchantId: row.merchantId,
      locationId: row.locationId,
    });
    return orderView(row, await itemsFor(tx, context.tenant.organizationId, [row.id]));
  });
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function createOrder(
  context: RequestContext,
  input: CreateOrderInput,
  idempotencyKey: string,
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "orders:write", {
      organizationId: context.tenant.organizationId,
      merchantId: input.merchant_id,
      locationId: input.location_id,
    });
    const operation = "orders.create";
    const actorId = principalId(context.principal);
    const keyDigest = digest(idempotencyKey);
    const requestDigest = digest(JSON.stringify(input));
    const lockScope = `${context.tenant.organizationId}:${context.tenant.environment}:${actorId}:${operation}:${keyDigest}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockScope}, 0))`);
    const [existing] = await tx
      .select()
      .from(idempotencyRecords)
      .where(
        and(
          eq(idempotencyRecords.organizationId, context.tenant.organizationId),
          eq(idempotencyRecords.principalId, actorId),
          eq(idempotencyRecords.operation, operation),
          eq(idempotencyRecords.environment, context.tenant.environment),
          eq(idempotencyRecords.keyDigest, keyDigest),
        ),
      )
      .limit(1);
    if (existing) {
      if (existing.requestDigest !== requestDigest)
        throw new ApiError(
          409,
          "conflict",
          "idempotency_key_reused",
          "The idempotency key was already used with different input.",
          "Idempotency-Key",
        );
      if (existing.responseBody) return existing.responseBody as unknown as OrderView;
      throw new ApiError(
        409,
        "conflict",
        "idempotency_request_in_progress",
        "A request with this idempotency key is still in progress.",
      );
    }
    const [record] = await tx
      .insert(idempotencyRecords)
      .values({
        organizationId: context.tenant.organizationId,
        principalId: actorId,
        operation,
        environment: context.tenant.environment,
        keyDigest,
        requestDigest,
        lockedUntil: new Date(Date.now() + 60_000),
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      })
      .returning();
    if (!record)
      throw new ApiError(
        500,
        "internal_error",
        "idempotency_create_failed",
        "The idempotency record could not be created.",
      );
    const [fulfilment] = await tx
      .select({ locationId: locations.id, merchantId: locations.merchantId })
      .from(locations)
      .innerJoin(
        merchants,
        and(
          eq(merchants.organizationId, locations.organizationId),
          eq(merchants.id, locations.merchantId),
        ),
      )
      .where(
        and(
          eq(locations.organizationId, context.tenant.organizationId),
          eq(locations.id, input.location_id),
          eq(locations.merchantId, input.merchant_id),
          eq(locations.status, "active"),
          eq(merchants.status, "active"),
        ),
      )
      .limit(1);
    if (!fulfilment) notFound();
    if (input.customer_id) {
      const [customer] = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, context.tenant.organizationId),
            eq(customers.id, input.customer_id),
          ),
        )
        .limit(1);
      if (!customer) notFound();
    }
    const variantIds = input.items.map((item) => item.variant_id);
    const catalogue = await tx
      .select({ variant: variants, productName: products.name, productStatus: products.status })
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
          inArray(variants.id, variantIds),
        ),
      );
    if (catalogue.length !== variantIds.length) notFound();
    const levels = await tx
      .select()
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.organizationId, context.tenant.organizationId),
          eq(inventoryLevels.locationId, input.location_id),
          inArray(inventoryLevels.variantId, variantIds),
        ),
      );
    const lines = input.items.map((item) => {
      const found = catalogue.find((entry) => entry.variant.id === item.variant_id);
      if (!found) notFound();
      if (found.variant.status !== "active" || found.productStatus !== "active")
        throw new ApiError(
          409,
          "conflict",
          "catalogue_not_active",
          "Only active products and variants may be ordered.",
          "items",
        );
      if (found.variant.currency !== input.currency)
        throw new ApiError(
          400,
          "invalid_request",
          "currency_mismatch",
          "Every item must use the order currency.",
          "currency",
        );
      if (found.variant.trackInventory) {
        const level = levels.find((entry) => entry.variantId === item.variant_id);
        if (!level || level.onHand < BigInt(item.quantity))
          throw new ApiError(
            409,
            "conflict",
            "insufficient_stock",
            "There is not enough stock for an item at this location.",
            "items",
            [
              {
                variant_id: item.variant_id,
                available: level?.onHand.toString() ?? "0",
                requested: item.quantity,
              },
            ],
          );
      }
      return {
        source: found,
        quantity: item.quantity,
        total: multiplyMinorAmount(found.variant.unitAmount, item.quantity),
      };
    });
    const total = addMinorAmounts(lines.map((line) => line.total));
    const orderId = createId();
    const [order] = await tx
      .insert(orders)
      .values({
        id: orderId,
        organizationId: context.tenant.organizationId,
        merchantId: input.merchant_id,
        locationId: input.location_id,
        customerId: input.customer_id ?? null,
        number: `ORD-${orderId.replaceAll("-", "").slice(0, 12).toUpperCase()}`,
        currency: input.currency,
        subtotalAmount: total,
        totalAmount: total,
        metadata: input.metadata ?? {},
      })
      .returning();
    if (!order)
      throw new ApiError(
        500,
        "internal_error",
        "order_create_failed",
        "The order could not be created.",
      );
    const createdItems = await tx
      .insert(orderItems)
      .values(
        lines.map((line) => ({
          organizationId: context.tenant.organizationId,
          orderId: order.id,
          variantId: line.source.variant.id,
          productName: line.source.productName,
          variantTitle: line.source.variant.title,
          sku: line.source.variant.sku,
          unitAmount: line.source.variant.unitAmount,
          currency: line.source.variant.currency,
          quantity: line.quantity,
          totalAmount: line.total,
        })),
      )
      .returning();
    await recordDomainChange(tx, context, {
      action: "order.created",
      aggregateType: "order",
      aggregateId: order.id,
      aggregateVersion: order.version,
      data: {
        order_id: order.id,
        order_number: order.number,
        merchant_id: order.merchantId,
        location_id: order.locationId,
        customer_id: order.customerId,
        currency: order.currency,
        total_amount: order.totalAmount.toString(),
        item_count: createdItems.length,
        inventory_effect: "validated_not_decremented",
      },
    });
    const response = orderView(order, createdItems);
    await tx
      .update(idempotencyRecords)
      .set({
        responseStatus: 201,
        responseBody: response as unknown as Record<string, unknown>,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(idempotencyRecords.id, record.id));
    return response;
  });
}

export async function cancelOrder(context: RequestContext, orderId: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const [current] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.organizationId, context.tenant.organizationId), eq(orders.id, orderId)))
      .for("update")
      .limit(1);
    if (!current) notFound();
    await requirePermission(tx, context.principal, "orders:write", {
      organizationId: context.tenant.organizationId,
      merchantId: current.merchantId,
      locationId: current.locationId,
    });
    if (current.financialStatus !== "unpaid" || current.fulfilmentStatus !== "unfulfilled")
      throw new ApiError(
        409,
        "conflict",
        "order_cannot_be_cancelled",
        "Only unpaid, unfulfilled orders may be cancelled.",
      );
    const [row] = await tx
      .update(orders)
      .set({
        fulfilmentStatus: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
        version: sql`${orders.version} + 1`,
      })
      .where(eq(orders.id, current.id))
      .returning();
    if (!row)
      throw new ApiError(
        500,
        "internal_error",
        "order_cancel_failed",
        "The order could not be cancelled.",
      );
    await recordDomainChange(tx, context, {
      action: "order.cancelled",
      aggregateType: "order",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: { order_id: row.id, order_number: row.number },
    });
    return orderView(row, await itemsFor(tx, context.tenant.organizationId, [row.id]));
  });
}

export async function getOrderCreationOptions(context: RequestContext) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const allowed = await authorizedLocationIds(
      tx,
      context.principal,
      "orders:write",
      context.tenant.organizationId,
    );
    if (allowed?.length === 0)
      throw new ApiError(
        403,
        "authorization_error",
        "permission_denied",
        "You do not have permission to create orders.",
      );
    const locationConditions = [
      eq(locations.organizationId, context.tenant.organizationId),
      eq(locations.status, "active"),
    ];
    if (allowed) locationConditions.push(inArray(locations.id, allowed));
    const locationRows = await tx
      .select({
        id: locations.id,
        name: locations.name,
        merchantId: locations.merchantId,
        merchantName: merchants.displayName,
      })
      .from(locations)
      .innerJoin(
        merchants,
        and(
          eq(merchants.organizationId, locations.organizationId),
          eq(merchants.id, locations.merchantId),
        ),
      )
      .where(and(...locationConditions))
      .orderBy(locations.name);
    const customerRows = await tx
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.organizationId, context.tenant.organizationId))
      .orderBy(customers.name)
      .limit(500);
    const variantRows = await tx
      .select({
        id: variants.id,
        sku: variants.sku,
        title: variants.title,
        unitAmount: variants.unitAmount,
        currency: variants.currency,
        productName: products.name,
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
          eq(variants.status, "active"),
          eq(products.status, "active"),
        ),
      )
      .orderBy(products.name, variants.title)
      .limit(500);
    return {
      locations: locationRows.map((row) => ({
        id: row.id,
        name: row.name,
        merchant_id: row.merchantId,
        merchant_name: row.merchantName,
      })),
      customers: customerRows,
      variants: variantRows.map((row) => ({
        id: row.id,
        sku: row.sku,
        title: row.title,
        product_name: row.productName,
        unit_amount: row.unitAmount.toString(),
        currency: row.currency,
      })),
    };
  });
}
