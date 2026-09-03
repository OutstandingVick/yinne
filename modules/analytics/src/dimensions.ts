import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { authorizedLocationIds, type RequestContext } from "@yinne/application";
import { ApiError, type AnalyticsQuery } from "@yinne/contracts";
import {
  inventoryLevels,
  locations,
  orderItems,
  orders,
  payments,
  withTenantTransaction,
} from "@yinne/database";
import { addCurrency, serializeMoney } from "./math";
import { analyticsMeta, reportingWindow } from "./query";

async function scopedLocations(
  tx: Parameters<Parameters<typeof withTenantTransaction>[1]>[0],
  context: RequestContext,
  requested?: string,
) {
  const authorized = await authorizedLocationIds(
    tx,
    context.principal,
    "analytics:read",
    context.tenant.organizationId,
  );
  if (authorized?.length === 0)
    throw new ApiError(403, "authorization_error", "permission_denied", "Permission denied.");
  if (requested && authorized && !authorized.includes(requested))
    throw new ApiError(403, "authorization_error", "permission_denied", "Permission denied.");
  return requested ? [requested] : authorized;
}

export async function locationsReport(context: RequestContext, query: AnalyticsQuery) {
  const window = reportingWindow(query);
  return withTenantTransaction(context.tenant, async (tx) => {
    const allowed = await scopedLocations(tx, context, window.locationId);
    const rows = await tx
      .select({
        id: locations.id,
        name: locations.name,
        orderId: orders.id,
        financialStatus: orders.financialStatus,
        currency: orders.currency,
        amount: orders.totalAmount,
      })
      .from(locations)
      .leftJoin(orders, eq(orders.locationId, locations.id))
      .leftJoin(
        payments,
        and(
          eq(payments.orderId, orders.id),
          eq(payments.environment, context.tenant.environment),
          inArray(payments.status, ["succeeded", "partially_refunded", "refunded"]),
          gte(payments.succeededAt, window.from),
          lt(payments.succeededAt, window.to),
        ),
      )
      .where(
        and(
          eq(locations.organizationId, context.tenant.organizationId),
          allowed ? inArray(locations.id, allowed) : undefined,
          window.currency ? eq(orders.currency, window.currency) : undefined,
        ),
      );
    const warnings = await tx
      .select({ locationId: inventoryLevels.locationId, count: sql<number>`count(*)::int` })
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.organizationId, context.tenant.organizationId),
          allowed ? inArray(inventoryLevels.locationId, allowed) : undefined,
          sql`${inventoryLevels.onHand} <= 5`,
        ),
      )
      .groupBy(inventoryLevels.locationId);
    const grouped = new Map<
      string,
      { name: string; orders: Set<string>; paid: Set<string>; volume: Record<string, bigint> }
    >();
    for (const row of rows) {
      const item = grouped.get(row.id) ?? {
        name: row.name,
        orders: new Set(),
        paid: new Set(),
        volume: {},
      };
      if (row.orderId) item.orders.add(row.orderId);
      if (
        row.orderId &&
        row.currency &&
        row.amount !== null &&
        ["paid", "partially_refunded", "refunded"].includes(row.financialStatus ?? "")
      ) {
        item.paid.add(row.orderId);
        addCurrency(item.volume, row.currency, row.amount);
      }
      grouped.set(row.id, item);
    }
    return {
      meta: analyticsMeta(window),
      locations: [...grouped.entries()].map(([id, value]) => ({
        id,
        name: value.name,
        order_count: value.orders.size,
        paid_order_count: value.paid.size,
        paid_order_volume: serializeMoney(value.volume),
        inventory_warnings: warnings.find((warning) => warning.locationId === id)?.count ?? 0,
      })),
    };
  });
}

export async function productsReport(context: RequestContext, query: AnalyticsQuery) {
  const window = reportingWindow(query);
  return withTenantTransaction(context.tenant, async (tx) => {
    const allowed = await scopedLocations(tx, context, window.locationId);
    const rows = await tx
      .select({
        orderId: orderItems.orderId,
        sku: orderItems.sku,
        productName: orderItems.productName,
        variantTitle: orderItems.variantTitle,
        quantity: orderItems.quantity,
        totalAmount: orderItems.totalAmount,
        currency: orderItems.currency,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(
        and(
          eq(orderItems.organizationId, context.tenant.organizationId),
          eq(payments.environment, context.tenant.environment),
          inArray(orders.financialStatus, ["paid", "partially_refunded", "refunded"]),
          inArray(payments.status, ["succeeded", "partially_refunded", "refunded"]),
          gte(payments.succeededAt, window.from),
          lt(payments.succeededAt, window.to),
          allowed ? inArray(orders.locationId, allowed) : undefined,
          window.currency ? eq(orderItems.currency, window.currency) : undefined,
        ),
      );
    const grouped = new Map<
      string,
      {
        sku: string;
        name: string;
        variant: string;
        units: number;
        orders: Set<string>;
        volume: Record<string, bigint>;
      }
    >();
    for (const row of rows) {
      const key = `${row.sku}:${row.productName}:${row.variantTitle}`;
      const item = grouped.get(key) ?? {
        sku: row.sku,
        name: row.productName,
        variant: row.variantTitle,
        units: 0,
        orders: new Set(),
        volume: {},
      };
      item.units += row.quantity;
      item.orders.add(row.orderId);
      addCurrency(item.volume, row.currency, row.totalAmount);
      grouped.set(key, item);
    }
    return {
      meta: analyticsMeta(window),
      ranking_metric: "units_sold",
      products: [...grouped.values()]
        .sort((left, right) => right.units - left.units || left.sku.localeCompare(right.sku))
        .slice(0, window.limit)
        .map((item) => ({
          sku: item.sku,
          product_name: item.name,
          variant_title: item.variant,
          units_sold: item.units,
          paid_order_count: item.orders.size,
          paid_order_volume: serializeMoney(item.volume),
        })),
    };
  });
}
