import Link from "next/link";
import { Button, CoreScreen, EmptyState, PageHeader, StatusBadge, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listPaymentLinks } from "@yinne/checkout";
import { activeUserContext } from "../../../lib/context";
export default async function PaymentLinksPage() {
  const rows = await listPaymentLinks(await activeUserContext(createRequestId()), { limit: 100 });
  return (
    <CoreScreen className="module-screen">
      <PageHeader
        title="Payment Links"
        description="Reusable public configurations that create a fresh Checkout Session per submission."
        actions={
          <Link href="/payment-links/new">
            <Button>Create Payment Link</Button>
          </Link>
        }
      />
      {!rows.data.length ? (
        <EmptyState
          title="No Payment Links"
          description="Create a fixed, flexible, or product-backed link."
        />
      ) : (
        <Table label="Payment Links" density="compact">
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Currency</th>
              <th>Completed uses</th>
            </tr>
          </thead>
          <tbody>
            {rows.data.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.kind}</td>
                <td>
                  <StatusBadge tone={row.status === "active" ? "success" : "warning"}>
                    {row.status}
                  </StatusBadge>
                </td>
                <td>{row.currency}</td>
                <td>
                  {row.completed_usage_count}
                  {row.usage_limit ? ` / ${row.usage_limit}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </CoreScreen>
  );
}
