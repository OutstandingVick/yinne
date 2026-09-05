import { notFound } from "next/navigation";
import {
  customersReport,
  invoicesReport,
  locationsReport,
  paymentsReport,
  productsReport,
  salesReport,
  subscriptionsReport,
} from "@yinne/analytics";
import { createRequestId } from "@yinne/core";
import { Badge, PageHeader, Table } from "@yinne/ui";
import { activeUserContext } from "../../../../lib/context";

const reports = {
  sales: {
    title: "Sales analytics",
    description: "GMV, net collected, paid orders, AOV, refunds, and persisted channels.",
    load: salesReport,
  },
  payments: {
    title: "Payment analytics",
    description: "Payment outcomes, attempts, pending volume, and normalized failures.",
    load: paymentsReport,
  },
  customers: {
    title: "Customer analytics",
    description: "Buyers, first purchases, repeats, and customer identity coverage.",
    load: customersReport,
  },
  subscriptions: {
    title: "Subscription analytics",
    description: "Lifecycle states, MRR, ARR, and billing-period renewal outcomes.",
    load: subscriptionsReport,
  },
  invoices: {
    title: "Invoice analytics",
    description: "Invoice states, outstanding and overdue value, and collection rates.",
    load: invoicesReport,
  },
  locations: {
    title: "Location analytics",
    description: "Authorized location order volume and inventory warnings.",
    load: locationsReport,
  },
  products: {
    title: "Product analytics",
    description: "Historical OrderItem snapshot rankings by units sold.",
    load: productsReport,
  },
} as const;

function windowQuery() {
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 86_400_000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    timezone: "Africa/Lagos",
    granularity: "day" as const,
    limit: 20,
  };
}

function display(value: unknown): string {
  if (value === null) return "Not comparable";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) return value.length ? `${value.length} rows` : "None";
  if (value && typeof value === "object")
    return Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => `${key}: ${child === null ? "—" : display(child)}`)
      .join(" · ");
  return "—";
}

export default async function AnalyticsReportPage({
  params,
}: {
  params: Promise<{ report: string }>;
}) {
  const reportKey = (await params).report;
  if (!(reportKey in reports)) notFound();
  const definition = reports[reportKey as keyof typeof reports];
  const result = (await definition.load(
    await activeUserContext(createRequestId()),
    windowQuery(),
  )) as Record<string, unknown> & {
    meta: {
      formula_version: string;
      timezone: string;
      from: string;
      to: string;
      freshness: { as_of: string };
    };
  };
  const rows = Object.entries(result).filter(([key]) => key !== "meta");
  return (
    <>
      <PageHeader title={definition.title} description={definition.description} />
      <section className="notice">
        <Badge tone="success">Live</Badge> <strong>{result.meta.formula_version}</strong> ·{" "}
        {result.meta.timezone} · [{new Date(result.meta.from).toLocaleDateString()},{" "}
        {new Date(result.meta.to).toLocaleDateString()}) · refreshed{" "}
        {new Date(result.meta.freshness.as_of).toLocaleString()}
      </section>
      <div style={{ marginTop: 20 }}>
        <Table label={definition.title}>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Canonical result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, value]) => (
              <tr key={key}>
                <th scope="row">{key.replaceAll("_", " ")}</th>
                <td>{display(value)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        Definitions come from the canonical metric catalogue. Monetary maps remain separated by ISO
        currency; undefined ratios are shown as not comparable.
      </p>
    </>
  );
}
