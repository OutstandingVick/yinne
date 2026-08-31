import Link from "next/link";
import { Badge, EmptyState, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listCheckoutSessions } from "@yinne/checkout";
import { activeUserContext } from "../../../../lib/context";
import { formatMinorAmount } from "../../../../lib/money";
export default async function CheckoutSessionsPage() {
  const rows = await listCheckoutSessions(await activeUserContext(createRequestId()), {
    limit: 100,
  });
  return (
    <>
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
        <Table label="Checkout Sessions">
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
                <td>{formatMinorAmount(row.amount, row.currency)}</td>
                <td>
                  <Badge
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
                  </Badge>
                </td>
                <td>{row.payment_link_id ? "Payment Link" : "Direct"}</td>
                <td>{new Date(row.expires_at).toLocaleString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
