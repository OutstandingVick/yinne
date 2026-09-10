import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { requirePermission, type RequestContext } from "@yinne/application";
import { orders, payments, transactions, withTenantTransaction } from "@yinne/database";

export interface CapitalFeatureSet {
  currency: string;
  from: Date;
  to: Date;
  observedDays: number;
  paidOrderCount: number;
  weeklyNetCollected: bigint[];
  current90NetCollected: bigint;
  previous90NetCollected: bigint;
  chargeAmount: bigint;
  refundAmount: bigint;
  identifiedBuyerCount: number;
  identityCoverage: number;
  repeatRevenueShare: number | null;
}

const dayMs = 86_400_000;

export async function capitalFeatureSet(
  context: RequestContext,
  currency: string,
  asOf: Date,
): Promise<CapitalFeatureSet> {
  const to = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  const from = new Date(to.getTime() - 180 * dayMs);
  const split = new Date(to.getTime() - 90 * dayMs);
  const weeklyStart = new Date(to.getTime() - 25 * 7 * dayMs);
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "analytics:read", {
      organizationId: context.tenant.organizationId,
    });
    const transactionRows = await tx
      .select({
        kind: transactions.kind,
        amount: transactions.amount,
        occurredAt: transactions.occurredAt,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, context.tenant.organizationId),
          eq(transactions.environment, context.tenant.environment),
          eq(transactions.currency, currency),
          gte(transactions.occurredAt, from),
          lt(transactions.occurredAt, to),
        ),
      );
    const orderRows = await tx
      .selectDistinct({
        id: orders.id,
        customerId: orders.customerId,
        amount: orders.totalAmount,
        paidAt: payments.succeededAt,
      })
      .from(orders)
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(
        and(
          eq(orders.organizationId, context.tenant.organizationId),
          eq(orders.currency, currency),
          eq(payments.environment, context.tenant.environment),
          inArray(payments.status, ["succeeded", "partially_refunded", "refunded"]),
          gte(payments.succeededAt, from),
          lt(payments.succeededAt, to),
        ),
      );
    const [first] = await tx
      .select({ paidAt: payments.succeededAt })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(
        and(
          eq(payments.organizationId, context.tenant.organizationId),
          eq(payments.environment, context.tenant.environment),
          eq(payments.currency, currency),
          inArray(payments.status, ["succeeded", "partially_refunded", "refunded"]),
          lt(payments.succeededAt, to),
        ),
      )
      .orderBy(asc(payments.succeededAt))
      .limit(1);
    const weeklyNetCollected = Array.from({ length: 25 }, () => 0n);
    let current90NetCollected = 0n;
    let previous90NetCollected = 0n;
    let chargeAmount = 0n;
    let refundAmount = 0n;
    for (const row of transactionRows) {
      const signed = row.kind === "charge" ? row.amount : -row.amount;
      if (row.occurredAt >= weeklyStart) {
        const week = Math.floor((row.occurredAt.getTime() - weeklyStart.getTime()) / (7 * dayMs));
        weeklyNetCollected[week] = (weeklyNetCollected[week] ?? 0n) + signed;
      }
      if (row.occurredAt >= split) current90NetCollected += signed;
      else previous90NetCollected += signed;
      if (row.kind === "charge") chargeAmount += row.amount;
      else refundAmount += row.amount;
    }
    const identified = orderRows.filter((order) => order.customerId);
    const customerOrders = new Map<string, typeof identified>();
    for (const order of identified) {
      const rows = customerOrders.get(order.customerId!) ?? [];
      rows.push(order);
      customerOrders.set(order.customerId!, rows);
    }
    const identifiedRevenue = identified.reduce((sum, order) => sum + order.amount, 0n);
    const repeatRevenue = [...customerOrders.values()]
      .filter((customer) => customer.length >= 2)
      .flat()
      .reduce((sum, order) => sum + order.amount, 0n);
    return {
      currency,
      from,
      to,
      observedDays: first?.paidAt
        ? Math.max(0, Math.floor((to.getTime() - first.paidAt.getTime()) / dayMs))
        : 0,
      paidOrderCount: orderRows.length,
      weeklyNetCollected,
      current90NetCollected,
      previous90NetCollected,
      chargeAmount,
      refundAmount,
      identifiedBuyerCount: customerOrders.size,
      identityCoverage: orderRows.length === 0 ? 0 : identified.length / orderRows.length,
      repeatRevenueShare:
        identifiedRevenue === 0n ? null : Number(repeatRevenue) / Number(identifiedRevenue),
    };
  });
}
