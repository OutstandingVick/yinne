import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { authorizedLocationIds, type RequestContext } from "@yinne/application";
import { ApiError, type AnalyticsQuery } from "@yinne/contracts";
import { subscriptionRenewals, subscriptions, withTenantTransaction } from "@yinne/database";
import { addCurrency, decimalRatio, normalizeMrr, serializeMoney } from "./math";
import { analyticsMeta, reportingWindow } from "./query";

export async function subscriptionsReport(context: RequestContext, query: AnalyticsQuery) {
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
    const rows = await tx
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.organizationId, context.tenant.organizationId),
          eq(subscriptions.environment, context.tenant.environment),
          window.currency ? eq(subscriptions.currency, window.currency) : undefined,
          scopedLocations ? inArray(subscriptions.locationId, scopedLocations) : undefined,
        ),
      );
    const ids = rows.map((subscription) => subscription.id);
    const renewalRows = ids.length
      ? await tx
          .select()
          .from(subscriptionRenewals)
          .where(
            and(
              eq(subscriptionRenewals.organizationId, context.tenant.organizationId),
              eq(subscriptionRenewals.environment, context.tenant.environment),
              inArray(subscriptionRenewals.subscriptionId, ids),
              gte(subscriptionRenewals.createdAt, window.from),
              lt(subscriptionRenewals.createdAt, window.to),
            ),
          )
      : [];
    const stateCounts = Object.fromEntries(
      ["trialing", "active", "past_due", "paused", "cancelled", "ended"].map((status) => [
        status,
        rows.filter((row) => row.status === status).length,
      ]),
    );
    const mrr: Record<string, bigint> = {};
    for (const subscription of rows.filter((row) => row.status === "active"))
      addCurrency(
        mrr,
        subscription.currency,
        normalizeMrr(
          subscription.unitAmount,
          subscription.interval as "month" | "year",
          subscription.intervalCount,
        ),
      );
    const arr = Object.fromEntries(
      Object.entries(mrr).map(([currency, amount]) => [currency, (amount * 12n).toString()]),
    );
    const terminalRenewals = renewalRows.filter((row) =>
      ["succeeded", "failed"].includes(row.status),
    );
    const succeededRenewals = terminalRenewals.filter((row) => row.status === "succeeded");
    const created = rows.filter((row) => row.createdAt >= window.from && row.createdAt < window.to);
    const cancelled = rows.filter(
      (row) => row.cancelledAt && row.cancelledAt >= window.from && row.cancelledAt < window.to,
    );
    return {
      meta: analyticsMeta(window),
      states: stateCounts,
      mrr: serializeMoney(mrr),
      arr,
      subscriptions_created: created.length,
      new_active_subscriptions: created.filter((subscription) =>
        renewalRows.some(
          (renewal) => renewal.subscriptionId === subscription.id && renewal.status === "succeeded",
        ),
      ).length,
      cancelled_subscriptions: cancelled.length,
      renewals: {
        attempted: renewalRows.length,
        pending: renewalRows.length - terminalRenewals.length,
        succeeded: succeededRenewals.length,
        failed: terminalRenewals.length - succeededRenewals.length,
        success_rate: decimalRatio(
          BigInt(succeededRenewals.length),
          BigInt(terminalRenewals.length),
        ),
        failed_rate: decimalRatio(
          BigInt(terminalRenewals.length - succeededRenewals.length),
          BigInt(terminalRenewals.length),
        ),
      },
      deferred: ["logo_churn"],
    };
  });
}
