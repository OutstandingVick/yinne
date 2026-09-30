import Link from "next/link";
import { CoreScreen, EmptyState, FinancialAmount, PageHeader, StatusBadge, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listCheckoutSessions } from "@yinne/checkout";
import { activeUserContext } from "../../../../lib/context";
import { formatMinorAmount } from "../../../../lib/money";
export default async function CheckoutSessionsPage() {
  const rows = await listCheckoutSessions(await activeUserContext(createRequestId()), {
    limit: 100,
  });
  return (
    <CoreScreen className="module-screen">
      <PageHeader
        title="Checkout Sessions"
        description="Expiring customer interactions connected to canonical orders and payments."
      />
      {!rows.data.length ? (
        <EmptyState
          title="No checkout sessions"
          description="Create one through the API or open a Payment Link."
        />
      ) : (
        <Table label="Checkout Sessions" density="compact">
          <thead>
            <tr>
              <th>Session</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Source</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {rows.data.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link className="mono" href={`/checkout/sessions/${row.id}`}>
                    {row.id.slice(0, 18)}…
                  </Link>
                </td>
                <td>
                  <FinancialAmount>{formatMinorAmount(row.amount, row.currency)}</FinancialAmount>
                </td>
                <td>
                  <StatusBadge
                    tone={
                      row.status === "completed"
                        ? "success"
                        : row.status === "open"
                          ? "warning"
                          : row.status === "processing"
                            ? "warning"
                            : "danger"
                    }
                  >
                    {row.status}
                  </StatusBadge>
                </td>
                <td>{row.payment_link_id ? "Payment Link" : "Direct"}</td>
                <td>{new Date(row.expires_at).toLocaleString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </CoreScreen>
  );
}
