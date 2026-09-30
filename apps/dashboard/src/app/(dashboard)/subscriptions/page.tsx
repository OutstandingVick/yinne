import Link from "next/link";
import { Button, CoreScreen, EmptyState, FinancialAmount, PageHeader, StatusBadge, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listSubscriptions } from "@yinne/subscriptions";
import { formatMinorAmount } from "../../../lib/money";
import { activeUserContext } from "../../../lib/context";
export default async function SubscriptionsPage() {
  const rows = await listSubscriptions(await activeUserContext(createRequestId()), { limit: 100 });
  return (
    <CoreScreen className="module-screen">
      <PageHeader
        title="Subscriptions"
        description="Canonical recurring revenue lifecycle and renewal state."
        actions={
          <Link href="/subscriptions/new">
            <Button>Create subscription</Button>
          </Link>
        }
      />
      {!rows.data.length ? (
        <EmptyState
          title="No subscriptions"
          description="Subscribe a Customer to an active recurring Price."
        />
      ) : (
        <Table label="Subscriptions" density="compact">
          <thead>
            <tr>
              <th>Subscription</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Next billing</th>
            </tr>
          </thead>
          <tbody>
            {rows.data.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/subscriptions/${row.id}`}>{row.id.slice(0, 8)}</Link>
                </td>
                <td>
                  <FinancialAmount>{formatMinorAmount(row.unit_amount, row.currency)}</FinancialAmount> / {row.interval}
                </td>
                <td>
                  <StatusBadge
                    tone={
                      row.status === "active"
                        ? "success"
                        : row.status === "past_due"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {row.status}
                  </StatusBadge>
                </td>
                <td>
                  {row.next_billing_at ? new Date(row.next_billing_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </CoreScreen>
  );
}
