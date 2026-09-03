import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { authorizedLocationIds, type RequestContext } from "@yinne/application";
import { ApiError, type AnalyticsQuery } from "@yinne/contracts";
import { invoices, withTenantTransaction } from "@yinne/database";
import { addCurrency, decimalRatio, serializeMoney } from "./math";
import { analyticsMeta, reportingWindow } from "./query";

export async function invoicesReport(context: RequestContext, query: AnalyticsQuery) {
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
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, context.tenant.organizationId),
          eq(invoices.environment, context.tenant.environment),
          window.currency ? eq(invoices.currency, window.currency) : undefined,
          scopedLocations ? inArray(invoices.locationId, scopedLocations) : undefined,
        ),
      );
    const issuedCohort = rows.filter(
      (row) => row.issuedAt && row.issuedAt >= window.from && row.issuedAt < window.to,
    );
    const collectible = issuedCohort.filter((row) => ["open", "paid"].includes(row.status));
    const paid = collectible.filter((row) => row.status === "paid");
    const outstanding: Record<string, bigint> = {};
    const overdue: Record<string, bigint> = {};
    const paidValue: Record<string, bigint> = {};
    const issuedValue: Record<string, bigint> = {};
    for (const invoice of rows.filter((row) => row.status === "open")) {
      addCurrency(outstanding, invoice.currency, invoice.totalAmount);
      if (invoice.dueAt && invoice.dueAt < window.to)
        addCurrency(overdue, invoice.currency, invoice.totalAmount);
    }
    for (const invoice of collectible)
      addCurrency(issuedValue, invoice.currency, invoice.totalAmount);
    for (const invoice of paid) addCurrency(paidValue, invoice.currency, invoice.totalAmount);
    const valueRates = Object.fromEntries(
      Object.keys(issuedValue).map((currency) => [
        currency,
        decimalRatio(paidValue[currency] ?? 0n, issuedValue[currency] ?? 0n),
      ]),
    );
    return {
      meta: analyticsMeta(window),
      counts: {
        draft: rows.filter((row) => row.status === "draft").length,
        open: rows.filter((row) => row.status === "open").length,
        paid: rows.filter((row) => row.status === "paid").length,
        void: rows.filter((row) => row.status === "void").length,
        overdue: rows.filter((row) => row.status === "open" && row.dueAt && row.dueAt < window.to)
          .length,
      },
      outstanding_value: serializeMoney(outstanding),
      overdue_value: serializeMoney(overdue),
      collection_rate_count: decimalRatio(BigInt(paid.length), BigInt(collectible.length)),
      collection_rate_value: valueRates,
    };
  });
}
