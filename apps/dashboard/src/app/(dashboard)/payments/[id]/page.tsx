import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, CoreScreen, FinancialAmount, Input, PageHeader, SectionCard, Select, StatusBadge, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getPayment } from "@yinne/payments";
import { activeUserContext } from "../../../../lib/context";
import { formatMinorAmount } from "../../../../lib/money";
import { createRefundAction } from "../../actions";
export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const payment = await getPayment(await activeUserContext(createRequestId()), (await params).id);
    return (
      <CoreScreen>
        <PageHeader
          title={`Payment ${payment.id.slice(0, 18)}…`}
          description="Canonical state, provider attempts, immutable transactions, and refunds."
        />
        <p className="core-status-line">
          <StatusBadge
            tone={
              payment.status === "succeeded"
                ? "success"
                : payment.status === "failed"
                  ? "danger"
                  : "warning"
            }
          >
            {payment.status}
          </StatusBadge>{" "}
          <StatusBadge tone="warning">{payment.environment}</StatusBadge>
        </p>
        <SectionCard className="core-total-card">
          <span className="label">Amount</span>
          <h2><FinancialAmount prominent>{formatMinorAmount(payment.amount, payment.currency)}</FinancialAmount></h2>
          <p>
            Order:{" "}
            <Link href={`/commerce/orders/${payment.order_id}`} className="mono">
              {payment.order_id}
            </Link>
          </p>
          <p>Refunded: <FinancialAmount>{formatMinorAmount(payment.refunded_amount, payment.currency)}</FinancialAmount></p>
        </SectionCard>
        {["succeeded", "partially_refunded"].includes(payment.status) ? (
          <SectionCard>
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
          </SectionCard>
        ) : null}
        <section className="core-section">
        <h2>Attempts</h2>
        <Table label="Payment attempts" density="compact">
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
                  <StatusBadge
                    tone={
                      attempt.status === "succeeded"
                        ? "success"
                        : attempt.status === "failed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {attempt.status}
                  </StatusBadge>
                </td>
                <td className="mono">{attempt.provider_reference ?? "—"}</td>
                <td>{attempt.failure_code ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        </section>
        <section className="core-section">
        <h2>Transactions</h2>
        <Table label="Transactions" density="compact">
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
                <td><FinancialAmount>{formatMinorAmount(transaction.amount, transaction.currency)}</FinancialAmount></td>
                <td className="mono">{transaction.provider_reference}</td>
                <td>{new Date(transaction.occurred_at).toLocaleString("en-NG")}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        </section>
        <section className="core-section">
        <h2>Refunds</h2>
        <Table label="Refunds" density="compact">
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
                <td><FinancialAmount>{formatMinorAmount(refund.amount, refund.currency)}</FinancialAmount></td>
                <td>
                  <StatusBadge
                    tone={
                      refund.status === "succeeded"
                        ? "success"
                        : refund.status === "failed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {refund.status}
                  </StatusBadge>
                </td>
                <td>{refund.reason}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        </section>
      </CoreScreen>
    );
  } catch {
    notFound();
  }
}
