import { describe, expect, it } from "vitest";
import type { RequestContext } from "@yinne/application";
import { invoicesReport } from "./invoices";
import { salesReport } from "./reports";
import { subscriptionsReport } from "./subscriptions";

const run = process.env.MIGRATION_DATABASE_URL ? describe : describe.skip;
const organizationId = "0198f000-0000-7000-8000-000000000001";
const context: RequestContext = {
  tenant: { organizationId, environment: "test" },
  principal: {
    type: "system",
    id: "analytics-integration",
    organizationId,
    environment: "test",
  },
  requestId: "req_analytics_integration",
};
const query = {
  from: "2026-08-01T00:00:00.000Z",
  to: "2026-09-01T00:00:00.000Z",
  timezone: "Africa/Lagos",
  granularity: "day" as const,
  limit: 20,
};

run("Analytics PostgreSQL reports", () => {
  it("keeps currencies separate and reconciles net collected", async () => {
    const report = await salesReport(context, query);
    expect(report.gmv.USD).toBe("2500");
    expect(report.paid_order_volume.USD).toBe("2500");
    expect(BigInt(report.gmv.NGN!) - BigInt(report.refunds.NGN!)).toBe(
      BigInt(report.net_collected.NGN!),
    );
    expect(report.meta.formula_version).toBe("analytics.v1");
  });

  it("derives ARR only from canonical MRR", async () => {
    const report = await subscriptionsReport(context, query);
    expect(BigInt(report.arr.NGN!)).toBe(BigInt(report.mrr.NGN!) * 12n);
    expect(report.states.cancelled).toBeGreaterThanOrEqual(1);
  });

  it("separates outstanding and overdue invoice value", async () => {
    const report = await invoicesReport(context, query);
    expect(BigInt(report.outstanding_value.NGN!)).toBeGreaterThanOrEqual(
      BigInt(report.overdue_value.NGN!),
    );
    expect(report.counts.open).toBeGreaterThanOrEqual(report.counts.overdue);
  });
});
