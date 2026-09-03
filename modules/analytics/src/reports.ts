import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { authorizedLocationIds, requirePermission, type RequestContext } from "@yinne/application";
import { ApiError, type AnalyticsQuery } from "@yinne/contracts";
import {
  orders,
  payments,
  transactions,
  withTenantTransaction,
  type TenantTransaction,
} from "@yinne/database";
import { addCurrency, decimalRatio, divideRoundHalfUp, serializeMoney } from "./math";
import { analyticsMeta, reportingWindow, type ReportingWindow } from "./query";

const paidOrderStates = ["paid", "partially_refunded", "refunded"];

interface AnalyticsScope {
  locationIds: string[] | null;
}

async function resolveScope(
  tx: TenantTransaction,
  context: RequestContext,
  window: ReportingWindow,
): Promise<AnalyticsScope> {
  const authorized = await authorizedLocationIds(
    tx,
    context.principal,
    "analytics:read",
    context.tenant.organizationId,
  );
  if (window.locationId) {
    await requirePermission(tx, context.principal, "analytics:read", {
      organizationId: context.tenant.organizationId,
      locationId: window.locationId,
    });
    return { locationIds: [window.locationId] };
  }
  if (authorized?.length === 0)
    throw new ApiError(
      403,
      "authorization_error",
      "permission_denied",
      "You do not have permission to read analytics.",
    );
  return { locationIds: authorized };
}

function locationPredicate(scope: AnalyticsScope) {
  return scope.locationIds ? inArray(orders.locationId, scope.locationIds) : undefined;
}

async function loadSalesFacts(
  tx: TenantTransaction,
  context: RequestContext,
  window: ReportingWindow,
  scope: AnalyticsScope,
) {
  const transactionRows = await tx
    .select({
      kind: transactions.kind,
      amount: transactions.amount,
      currency: transactions.currency,
      occurredAt: transactions.occurredAt,
      orderId: payments.orderId,
      locationId: orders.locationId,
    })
    .from(transactions)
    .innerJoin(payments, eq(payments.id, transactions.paymentId))
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(
      and(
        eq(transactions.organizationId, context.tenant.organizationId),
        eq(transactions.environment, context.tenant.environment),
        gte(transactions.occurredAt, window.from),
        lt(transactions.occurredAt, window.to),
        window.currency ? eq(transactions.currency, window.currency) : undefined,
        locationPredicate(scope),
      ),
    );
  const orderRows = await tx
    .selectDistinct({
      id: orders.id,
      amount: orders.totalAmount,
      currency: orders.currency,
      customerId: orders.customerId,
      locationId: orders.locationId,
      channel: sql<string>`coalesce(${orders.metadata}->>'source', 'unknown')`,
      paidAt: payments.succeededAt,
    })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(
      and(
        eq(orders.organizationId, context.tenant.organizationId),
        eq(payments.environment, context.tenant.environment),
        inArray(orders.financialStatus, paidOrderStates),
        inArray(payments.status, ["succeeded", "partially_refunded", "refunded"]),
        gte(payments.succeededAt, window.from),
        lt(payments.succeededAt, window.to),
        window.currency ? eq(orders.currency, window.currency) : undefined,
        locationPredicate(scope),
      ),
    );
  return { transactionRows, orderRows };
}

export async function salesReport(context: RequestContext, query: AnalyticsQuery) {
  const window = reportingWindow(query);
  return withTenantTransaction(context.tenant, async (tx) => {
    const scope = await resolveScope(tx, context, window);
    const { transactionRows, orderRows } = await loadSalesFacts(tx, context, window, scope);
    const gmv: Record<string, bigint> = {};
    const refunds: Record<string, bigint> = {};
    const paidOrderVolume: Record<string, bigint> = {};
    const orderCount: Record<string, bigint> = {};
    const channels = new Map<string, { orders: number; volume: Record<string, bigint> }>();
    for (const transaction of transactionRows)
      addCurrency(
        transaction.kind === "charge" ? gmv : refunds,
        transaction.currency,
        transaction.amount,
      );
    for (const order of orderRows) {
      addCurrency(paidOrderVolume, order.currency, order.amount);
      addCurrency(orderCount, order.currency, 1n);
      const channel = channels.get(order.channel) ?? { orders: 0, volume: {} };
      channel.orders += 1;
      addCurrency(channel.volume, order.currency, order.amount);
      channels.set(order.channel, channel);
    }
    const currencies = new Set([...Object.keys(gmv), ...Object.keys(refunds)]);
    const netCollected: Record<string, bigint> = {};
    const refundRates: Record<string, ReturnType<typeof decimalRatio>> = {};
    for (const currency of currencies) {
      netCollected[currency] = (gmv[currency] ?? 0n) - (refunds[currency] ?? 0n);
      refundRates[currency] = decimalRatio(refunds[currency] ?? 0n, gmv[currency] ?? 0n);
    }
    const aov: Record<string, string | null> = {};
    for (const [currency, amount] of Object.entries(paidOrderVolume))
      aov[currency] = divideRoundHalfUp(amount, orderCount[currency] ?? 0n)?.toString() ?? null;
    return {
      meta: analyticsMeta(window),
      gmv: serializeMoney(gmv),
      refunds: serializeMoney(refunds),
      net_collected: serializeMoney(netCollected),
      paid_order_volume: serializeMoney(paidOrderVolume),
      paid_order_count: orderRows.length,
      average_order_value: aov,
      refund_volume_rate: refundRates,
      channels: [...channels.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([channel, values]) => ({
          channel,
          paid_order_count: values.orders,
          paid_order_volume: serializeMoney(values.volume),
        })),
    };
  });
}

export async function overviewReport(context: RequestContext, query: AnalyticsQuery) {
  const sales = await salesReport(context, query);
  return {
    meta: sales.meta,
    metrics: {
      gmv: sales.gmv,
      net_collected: sales.net_collected,
      paid_order_count: sales.paid_order_count,
      average_order_value: sales.average_order_value,
    },
  };
}

export { loadSalesFacts, resolveScope };
