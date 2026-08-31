import { Badge, EmptyState, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listRefunds } from "@yinne/payments";
import { activeUserContext } from "../../../lib/context";
import { formatMinorAmount } from "../../../lib/money";
export default async function RefundsPage() {
  const rows = await listRefunds(await activeUserContext(createRequestId()), { limit: 100 });
  return (
    <>
      <PageHeader
        title="Refunds"
        description="Full and partial reversal requests with provider-neutral lifecycle evidence."
      />
      {!rows.data.length ? (
        <EmptyState title="No refunds" description="Create a refund from a succeeded payment." />
      ) : (
        <Table label="Refunds">
          <thead>
            <tr>
              <th>ID</th>
              <th>Payment</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.data.map((row) => (
              <tr key={row.id}>
                <td className="mono">{row.id.slice(0, 16)}…</td>
                <td className="mono">{row.payment_id.slice(0, 16)}…</td>
                <td>{formatMinorAmount(row.amount, row.currency)}</td>
                <td>
                  <Badge
                    tone={
                      row.status === "succeeded"
                        ? "success"
                        : row.status === "failed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {row.status}
                  </Badge>
                </td>
                <td>{row.reason}</td>
                <td>{new Date(row.created_at).toLocaleString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
