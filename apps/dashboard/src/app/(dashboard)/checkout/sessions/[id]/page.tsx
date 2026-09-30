import { notFound } from "next/navigation";
import { CoreScreen, FinancialAmount, PageHeader, SectionCard, StatusBadge, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getCheckoutSession } from "@yinne/checkout";
import { activeUserContext } from "../../../../../lib/context";
import { formatMinorAmount } from "../../../../../lib/money";
export default async function CheckoutDetail({ params }: { params: Promise<{ id: string }> }) {
  let row;
  try {
    row = await getCheckoutSession(await activeUserContext(createRequestId()), (await params).id);
  } catch {
    notFound();
  }
  return (
    <CoreScreen className="module-screen">
      <PageHeader
        title={`Checkout ${row.id.slice(0, 12)}`}
        description="The quote, customer association, Order, and Payment remain separate canonical records."
      />
      <div className="detail-grid">
        <SectionCard>
          <h2>Status</h2>
          <StatusBadge tone={row.status === "completed" ? "success" : "warning"}>{row.status}</StatusBadge>
          <dl>
            <dt>Total</dt>
            <dd><FinancialAmount prominent>{formatMinorAmount(row.amount, row.currency)}</FinancialAmount></dd>
            <dt>Order</dt>
            <dd className="mono">{row.order_id ?? "Not created"}</dd>
            <dt>Payment</dt>
            <dd className="mono">{row.payment_id ?? "Not created"}</dd>
            <dt>Expires</dt>
            <dd>{new Date(row.expires_at).toLocaleString("en-NG")}</dd>
          </dl>
        </SectionCard>
      </div>
      <Table label="Quote items" density="compact">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {row.items.map((item) => (
            <tr key={item.id}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td><FinancialAmount>{formatMinorAmount(item.total_amount, item.currency)}</FinancialAmount></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </CoreScreen>
  );
}
