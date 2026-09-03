import { and, eq, inArray, lt } from "drizzle-orm";
import { authorizedLocationIds, type RequestContext } from "@yinne/application";
import { ApiError, type AnalyticsQuery } from "@yinne/contracts";
import { customers, orders, payments, withTenantTransaction } from "@yinne/database";
import { decimalRatio } from "./math";
import { analyticsMeta, reportingWindow } from "./query";

export async function customersReport(context: RequestContext, query: AnalyticsQuery) {
  const window = reportingWindow(query);
  return withTenantTransaction(context.tenant, async (tx) => {
    const locations = await authorizedLocationIds(
      tx,
      context.principal,
      "analytics:read",
      context.tenant.organizationId,
    );
    if (locations?.length === 0)
      throw new ApiError(403, "authorization_error", "permission_denied", "Permission denied.");
    const scopedLocations = window.locationId ? [window.locationId] : locations;
    if (window.locationId && locations && !locations.includes(window.locationId))
      throw new ApiError(403, "authorization_error", "permission_denied", "Permission denied.");
    const totalRows = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, context.tenant.organizationId),
          lt(customers.createdAt, window.to),
        ),
      );
    const paidOrders = await tx
      .selectDistinct({
        orderId: orders.id,
        customerId: orders.customerId,
        paidAt: payments.succeededAt,
      })
      .from(orders)
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(
        and(
          eq(orders.organizationId, context.tenant.organizationId),
          eq(payments.environment, context.tenant.environment),
          inArray(orders.financialStatus, ["paid", "partially_refunded", "refunded"]),
          inArray(payments.status, ["succeeded", "partially_refunded", "refunded"]),
          lt(payments.succeededAt, window.to),
          scopedLocations ? inArray(orders.locationId, scopedLocations) : undefined,
        ),
      );
    const counts = new Map<string, { count: number; firstAt: Date }>();
    let anonymousOrders = 0;
    for (const order of paidOrders) {
      if (!order.customerId || !order.paidAt) {
        anonymousOrders += 1;
        continue;
      }
      const current = counts.get(order.customerId);
      counts.set(order.customerId, {
        count: (current?.count ?? 0) + 1,
        firstAt: current && current.firstAt < order.paidAt ? current.firstAt : order.paidAt,
      });
    }
    const buyers = counts.size;
    const repeatBuyers = [...counts.values()].filter((entry) => entry.count >= 2).length;
    const newBuyers = [...counts.values()].filter(
      (entry) => entry.firstAt >= window.from && entry.firstAt < window.to,
    ).length;
    return {
      meta: analyticsMeta(window),
      total_customers: totalRows.length,
      buyers,
      new_buyers: newBuyers,
      repeat_buyers: repeatBuyers,
      repeat_purchase_rate: decimalRatio(BigInt(repeatBuyers), BigInt(buyers)),
      identity_coverage: decimalRatio(
        BigInt(paidOrders.length - anonymousOrders),
        BigInt(paidOrders.length),
      ),
      anonymous_paid_orders: anonymousOrders,
    };
  });
}
