import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { authorizedLocationIds, type RequestContext } from "@yinne/application";
import { ApiError, type AnalyticsQuery } from "@yinne/contracts";
import { orders, paymentAttempts, payments, refunds, withTenantTransaction } from "@yinne/database";
import { addCurrency, decimalRatio, serializeMoney } from "./math";
import { analyticsMeta, reportingWindow } from "./query";

export async function paymentsReport(context: RequestContext, query: AnalyticsQuery) {
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
    const requestedLocations = window.locationId ? [window.locationId] : locations;
    if (window.locationId && locations && !locations.includes(window.locationId))
      throw new ApiError(403, "authorization_error", "permission_denied", "Permission denied.");
    const paymentRows = await tx
      .select({
        id: payments.id,
        status: payments.status,
        amount: payments.amount,
        currency: payments.currency,
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(
        and(
          eq(payments.organizationId, context.tenant.organizationId),
          eq(payments.environment, context.tenant.environment),
          gte(payments.createdAt, window.from),
          lt(payments.createdAt, window.to),
          window.currency ? eq(payments.currency, window.currency) : undefined,
          requestedLocations ? inArray(orders.locationId, requestedLocations) : undefined,
        ),
      );
    const paymentIds = paymentRows.map((payment) => payment.id);
    const attemptRows = paymentIds.length
      ? await tx
          .select({
            status: paymentAttempts.status,
            provider: paymentAttempts.provider,
            failureCode: paymentAttempts.failureCode,
          })
          .from(paymentAttempts)
          .where(
            and(
              eq(paymentAttempts.organizationId, context.tenant.organizationId),
              eq(paymentAttempts.environment, context.tenant.environment),
              inArray(paymentAttempts.paymentId, paymentIds),
            ),
          )
      : [];
    const successful = paymentRows.filter((row) =>
      ["succeeded", "partially_refunded", "refunded"].includes(row.status),
    );
    const failed = paymentRows.filter((row) => row.status === "failed");
    const pending = paymentRows.filter((row) => ["created", "pending"].includes(row.status));
    const terminal = BigInt(successful.length + failed.length);
    const pendingVolume: Record<string, bigint> = {};
    for (const payment of pending) addCurrency(pendingVolume, payment.currency, payment.amount);
    const terminalAttempts = attemptRows.filter((row) =>
      ["succeeded", "failed"].includes(row.status),
    );
    const succeededAttempts = terminalAttempts.filter((row) => row.status === "succeeded");
    const failures = new Map<string, number>();
    for (const attempt of terminalAttempts.filter((row) => row.status === "failed")) {
      const key = `${attempt.provider}:${attempt.failureCode ?? "unknown"}`;
      failures.set(key, (failures.get(key) ?? 0) + 1);
    }
    const refundedPaymentIds = successful.length
      ? await tx
          .selectDistinct({ paymentId: refunds.paymentId })
          .from(refunds)
          .where(
            and(
              eq(refunds.organizationId, context.tenant.organizationId),
              eq(refunds.environment, context.tenant.environment),
              eq(refunds.status, "succeeded"),
              inArray(
                refunds.paymentId,
                successful.map((payment) => payment.id),
              ),
            ),
          )
      : [];
    return {
      meta: analyticsMeta(window),
      payments: {
        total: paymentRows.length,
        succeeded: successful.length,
        failed: failed.length,
        pending: pending.length,
        success_rate: decimalRatio(BigInt(successful.length), terminal),
        failure_rate: decimalRatio(BigInt(failed.length), terminal),
        refunded_payment_rate: decimalRatio(
          BigInt(refundedPaymentIds.length),
          BigInt(successful.length),
        ),
        pending_volume: serializeMoney(pendingVolume),
      },
      attempts: {
        total: attemptRows.length,
        succeeded: succeededAttempts.length,
        failed: terminalAttempts.length - succeededAttempts.length,
        success_rate: decimalRatio(
          BigInt(succeededAttempts.length),
          BigInt(terminalAttempts.length),
        ),
        failures: [...failures.entries()].map(([key, count]) => {
          const [provider, code] = key.split(":");
          return { provider, code, count };
        }),
      },
    };
  });
}
