import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Input, PageHeader, Select, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getPayment } from "@yinne/payments";
import { activeUserContext } from "../../../../lib/context";
import { formatMinorAmount } from "../../../../lib/money";
import { createRefundAction } from "../../actions";
export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const payment = await getPayment(await activeUserContext(createRequestId()), (await params).id);
    return (
      <>
        <PageHeader
          title={`Payment ${payment.id.slice(0, 18)}…`}
          description="Canonical state, provider attempts, immutable transactions, and refunds."
        />
        <p>
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
          </Badge>{" "}
          <Badge tone="warning">{payment.environment}</Badge>
        </p>
        <section className="card">
          <span className="label">Amount</span>
          <h2>{formatMinorAmount(payment.amount, payment.currency)}</h2>
          <p>
            Order:{" "}
            <Link href={`/commerce/orders/${payment.order_id}`} className="mono">
              {payment.order_id}
            </Link>
          </p>
          <p>Refunded: {formatMinorAmount(payment.refunded_amount, payment.currency)}</p>
        </section>
        {["succeeded", "partially_refunded"].includes(payment.status) ? (
          <section className="card" style={{ marginTop: 20 }}>
            <h2>Create refund</h2>
            <form action={createRefundAction} className="form form-inline">
              <input type="hidden" name="payment_id" value={payment.id} />
              <div className="form-row">
                <label htmlFor="refund-amount">Amount (minor units; blank = full remainder)</label>
                <Input id="refund-amount" name="amount" inputMode="numeric" />
              </div>
              <div className="form-row">
                <label htmlFor="refund-reason">Reason</label>
                <Input id="refund-reason" name="reason" defaultValue="customer_request" required />
              </div>
              <div className="form-row">
                <label htmlFor="refund-scenario">Mock outcome</label>
                <Select id="refund-scenario" name="mock_scenario">
                  <option value="refund_success">Success</option>
                  <option value="refund_failure">Failure</option>
                </Select>
              </div>
              <Button type="submit">Create refund</Button>
            </form>
          </section>
        ) : null}
        <h2>Attempts</h2>
        <Table label="Payment attempts">
          <thead>
            <tr>
              <th>ID</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Reference</th>
              <th>Failure</th>
            </tr>
          </thead>
          <tbody>
            {payment.attempts.map((attempt) => (
              <tr key={attempt.id}>
                <td className="mono">{attempt.id.slice(0, 16)}…</td>
                <td>{attempt.provider}</td>
                <td>
                  <Badge
                    tone={
                      attempt.status === "succeeded"
                        ? "success"
                        : attempt.status === "failed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {attempt.status}
                  </Badge>
                </td>
                <td className="mono">{attempt.provider_reference ?? "—"}</td>
                <td>{attempt.failure_code ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <h2>Transactions</h2>
        <Table label="Transactions">
          <thead>
            <tr>
              <th>Kind</th>
              <th>Amount</th>
              <th>Reference</th>
              <th>Occurred</th>
            </tr>
          </thead>
          <tbody>
            {payment.transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.kind}</td>
                <td>{formatMinorAmount(transaction.amount, transaction.currency)}</td>
                <td className="mono">{transaction.provider_reference}</td>
                <td>{new Date(transaction.occurred_at).toLocaleString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <h2>Refunds</h2>
        <Table label="Refunds">
          <thead>
            <tr>
              <th>ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {payment.refunds.map((refund) => (
              <tr key={refund.id}>
                <td className="mono">{refund.id.slice(0, 16)}…</td>
                <td>{formatMinorAmount(refund.amount, refund.currency)}</td>
                <td>
                  <Badge
                    tone={
                      refund.status === "succeeded"
                        ? "success"
                        : refund.status === "failed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {refund.status}
                  </Badge>
                </td>
                <td>{refund.reason}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </>
    );
  } catch {
    notFound();
  }
}
