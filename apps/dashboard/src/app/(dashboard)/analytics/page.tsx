import Link from "next/link";
import { overviewReport } from "@yinne/analytics";
import { createRequestId } from "@yinne/core";
import { Badge, PageHeader } from "@yinne/ui";
import { activeUserContext } from "../../../lib/context";
import { formatMinorAmount } from "../../../lib/money";

function lastThirtyDays() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    timezone: "Africa/Lagos",
    granularity: "day" as const,
    limit: 10,
  };
}

function MoneyValues({ values }: { values: Record<string, string> }) {
  const entries = Object.entries(values);
  if (!entries.length) return <>—</>;
  return (
    <>
      {entries.map(([currency, amount]) => (
        <span key={currency} style={{ display: "block" }}>
          {formatMinorAmount(amount, currency)}
        </span>
      ))}
    </>
  );
}

export default async function AnalyticsOverviewPage() {
  const report = await overviewReport(await activeUserContext(createRequestId()), lastThirtyDays());
  const cards = [
    ["GMV", <MoneyValues values={report.metrics.gmv} key="gmv" />, "Succeeded charge volume"],
    [
      "Net collected",
      <MoneyValues values={report.metrics.net_collected} key="net" />,
      "Charges less successful refunds",
    ],
    ["Paid orders", report.metrics.paid_order_count, "Distinct paid commerce orders"],
    [
      "Average order value",
      <MoneyValues
        values={Object.fromEntries(
          Object.entries(report.metrics.average_order_value).filter(
            (entry): entry is [string, string] => entry[1] !== null,
          ),
        )}
        key="aov"
      />,
      "Paid order volume per paid order",
    ],
  ] as const;
  const sections = [
    ["Sales", "/analytics/sales"],
    ["Payments", "/analytics/payments"],
    ["Customers", "/analytics/customers"],
    ["Subscriptions", "/analytics/subscriptions"],
    ["Invoices", "/analytics/invoices"],
    ["Locations", "/analytics/locations"],
    ["Products", "/analytics/products"],
  ] as const;
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Canonical business metrics for the last 30 days, calculated from committed operational facts."
      />
      <div className="card-grid">
        {cards.map(([name, value, description]) => (
          <div className="card" key={name}>
            <Badge tone="success">Live</Badge>
            <h2 style={{ marginTop: 14 }}>{value}</h2>
            <strong>{name}</strong>
            <p>{description}</p>
          </div>
        ))}
      </div>
      <section className="notice" style={{ marginTop: 20 }}>
        <strong>Reporting context:</strong> {report.meta.timezone} · [
        {new Date(report.meta.from).toLocaleDateString()},{" "}
        {new Date(report.meta.to).toLocaleDateString()}) · formula {report.meta.formula_version} ·
        live as of {new Date(report.meta.freshness.as_of).toLocaleString()}.
      </section>
      <div className="card-grid" style={{ marginTop: 20 }}>
        {sections.map(([name, href]) => (
          <Link className="card" href={href} key={name}>
            <strong>{name}</strong>
            <p>Inspect definitions, currency partitions, and scoped source data.</p>
          </Link>
        ))}
      </div>
    </>
  );
}
