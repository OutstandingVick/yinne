import { notFound } from "next/navigation";
import { ActionGroup, Button, CoreScreen, FinancialAmount, PageHeader, SectionCard, StatusBadge, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getOrder } from "@yinne/commerce";
import { activeUserContext } from "../../../../../lib/context";
import { formatMinorAmount } from "../../../../../lib/money";
import { cancelOrderAction } from "../../../actions";
import { createPaymentAction } from "../../../actions";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const order = await getOrder(await activeUserContext(createRequestId()), (await params).id);
    const actions =
      order.financial_status === "unpaid" && order.fulfilment_status === "unfulfilled" ? (
        <ActionGroup>
          <form action={createPaymentAction}>
            <input type="hidden" name="order_id" value={order.id} />
            <input type="hidden" name="mock_scenario" value="success" />
            <Button type="submit">Pay with Mock Provider</Button>
          </form>
          <form action={cancelOrderAction}>
            <input type="hidden" name="order_id" value={order.id} />
            <Button type="submit" className="button-danger">
              Cancel order
            </Button>
          </form>
        </ActionGroup>
      ) : undefined;
    return (
      <CoreScreen>
        <PageHeader
          title={order.number}
          description="Immutable price, product, SKU, and quantity snapshots."
          actions={actions}
        />
        <p className="core-status-line">
          <StatusBadge tone="warning">{order.financial_status}</StatusBadge>{" "}
          <StatusBadge tone={order.fulfilment_status === "cancelled" ? "danger" : "info"}>
            {order.fulfilment_status}
          </StatusBadge>
        </p>
        <Table label="Order items" density="compact">
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Unit price</th>
              <th>Quantity</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.product_name}</strong>
                  <div className="help">{item.variant_title}</div>
                </td>
                <td className="mono">{item.sku}</td>
                <td><FinancialAmount>{formatMinorAmount(item.unit_amount, item.currency)}</FinancialAmount></td>
                <td>{item.quantity}</td>
                <td><FinancialAmount>{formatMinorAmount(item.total_amount, item.currency)}</FinancialAmount></td>
              </tr>
            ))}
          </tbody>
        </Table>
        <SectionCard className="core-total-card">
          <span className="label">Order total</span>
          <h2><FinancialAmount prominent>{formatMinorAmount(order.total_amount, order.currency)}</FinancialAmount></h2>
          <p>
            {order.financial_status === "unpaid"
              ? "No successful payment has been recorded."
              : "Payment state is reflected in the immutable payment evidence."}
          </p>
        </SectionCard>
      </CoreScreen>
    );
  } catch {
    notFound();
  }
}
