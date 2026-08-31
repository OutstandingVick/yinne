import { Badge, EmptyState, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listTransactions } from "@yinne/payments";
import { activeUserContext } from "../../../lib/context";
import { formatMinorAmount } from "../../../lib/money";
export default async function TransactionsPage() {
  const rows = await listTransactions(await activeUserContext(createRequestId()), { limit: 100 });
  return (
    <>
      <PageHeader
        title="Transactions"
        description="Append-only operational evidence. These records are not ledger balances."
      />
      {!rows.data.length ? (
        <EmptyState
          title="No transactions"
          description="A succeeded charge or refund creates one immutable transaction."
        />
      ) : (
        <Table label="Transactions">
          <thead>
            <tr>
              <th>ID</th>
              <th>Kind</th>
              <th>Amount</th>
              <th>Provider evidence</th>
              <th>Occurred</th>
            </tr>
          </thead>
          <tbody>
            {rows.data.map((row) => (
              <tr key={row.id}>
                <td className="mono">{row.id.slice(0, 16)}…</td>
                <td>
                  <Badge tone={row.kind === "charge" ? "success" : "warning"}>{row.kind}</Badge>
                </td>
                <td>{formatMinorAmount(row.amount, row.currency)}</td>
                <td className="mono">{row.provider_reference}</td>
                <td>{new Date(row.occurred_at).toLocaleString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
