import Link from "next/link";
import { Badge, EmptyState, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listPayments } from "@yinne/payments";
import { activeUserContext } from "../../../lib/context";
import { formatMinorAmount } from "../../../lib/money";
export default async function PaymentsPage() {
  const rows = await listPayments(await activeUserContext(createRequestId()), { limit: 100 });
  return (
    <>
      <PageHeader
        title="Payments"
        description="Canonical payment intents executed through provider-neutral attempts."
      />
      {!rows.data.length ? (
        <EmptyState
          title="No payments"
          description="Open an unpaid order and execute it with the deterministic Mock Provider."
        />
      ) : (
        <Table label="Payments">
          <thead>
            <tr>
              <th>Payment</th>
              <th>Order</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Environment</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.data.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <Link href={`/payments/${payment.id}`} className="mono">
                    {payment.id.slice(0, 18)}…
                  </Link>
                </td>
                <td className="mono">{payment.order_id.slice(0, 14)}…</td>
                <td>{formatMinorAmount(payment.amount, payment.currency)}</td>
                <td>
                  <Badge
                    tone={
                      payment.status === "succeeded"
                        ? "success"
                        : payment.status === "failed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {payment.status}
                  </Badge>
                </td>
                <td>
                  <Badge tone="warning">{payment.environment}</Badge>
                </td>
                <td>{new Date(payment.created_at).toLocaleString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
