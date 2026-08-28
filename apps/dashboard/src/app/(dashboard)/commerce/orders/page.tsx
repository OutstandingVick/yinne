import Link from "next/link";
import { Badge, Button, EmptyState, Input, PageHeader, Select, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getOrderCreationOptions, listOrders } from "@yinne/commerce";
import { activeUserContext } from "../../../../lib/context";
import { formatMinorAmount } from "../../../../lib/money";
import { cancelOrderAction, createOrderAction } from "../../actions";
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; location_id?: string; fulfilment_status?: string }>;
}) {
  const query = await searchParams;
  const context = await activeUserContext(createRequestId());
  const [orders, options] = await Promise.all([
    listOrders(context, { limit: 100, ...query }),
    getOrderCreationOptions(context),
  ]);
  return (
    <>
      <PageHeader
        title="Orders"
        description="Commercial records only. Phase 2 orders are unpaid; no action here can mark one paid or fulfilled."
      />
      <div className="notice" style={{ marginBottom: 20 }}>
        <strong>Payment boundary:</strong> creating an order validates stock but does not reserve or
        decrement it. Payment success will own that atomic stock change in Payments Core.
      </div>
      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Create unpaid order</h2>
        <form action={createOrderAction} className="form form-inline">
          <div className="form-row">
            <label htmlFor="order-location">Fulfilment</label>
            <Select id="order-location" name="fulfilment" required>
              {options.locations.map((location) => (
                <option value={`${location.id}:${location.merchant_id}`} key={location.id}>
                  {location.merchant_name} · {location.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="form-row">
            <label htmlFor="order-customer">Customer</label>
            <Select id="order-customer" name="customer_id">
              <option value="">Guest</option>
              {options.customers.map((customer) => (
                <option value={customer.id} key={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="form-row">
            <label htmlFor="order-variant">Item</label>
            <Select id="order-variant" name="variant_id" required>
              {options.variants.map((variant) => (
                <option value={variant.id} key={variant.id}>
                  {variant.product_name} · {variant.title} ·{" "}
                  {formatMinorAmount(variant.unit_amount, variant.currency)}
                </option>
              ))}
            </Select>
          </div>
          <div className="form-row">
            <label htmlFor="quantity">Quantity</label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              max={10000}
              defaultValue={1}
              required
            />
          </div>
          <input type="hidden" name="currency" value="NGN" />
          <Button type="submit">Create unpaid order</Button>
        </form>
      </section>
      <form className="filter-bar">
        <Input name="search" defaultValue={query.search} placeholder="Search order or customer" />
        <Select name="location_id" defaultValue={query.location_id ?? ""}>
          <option value="">All locations</option>
          {options.locations.map((location) => (
            <option value={location.id} key={location.id}>
              {location.name}
            </option>
          ))}
        </Select>
        <Select name="fulfilment_status" defaultValue={query.fulfilment_status ?? ""}>
          <option value="">All states</option>
          <option value="unfulfilled">Unfulfilled</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Button type="submit" className="button-secondary">
          Filter
        </Button>
      </form>
      {!orders.data.length ? (
        <EmptyState title="No orders" description="Create the first unpaid commercial order." />
      ) : (
        <Table label="Orders">
          <thead>
            <tr>
              <th>Order</th>
              <th>State</th>
              <th>Items</th>
              <th>Total</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.data.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link href={`/commerce/orders/${order.id}`}>
                    <strong>{order.number}</strong>
                  </Link>
                </td>
                <td>
                  <Badge tone="warning">{order.financial_status}</Badge>{" "}
                  <Badge tone={order.fulfilment_status === "cancelled" ? "danger" : "info"}>
                    {order.fulfilment_status}
                  </Badge>
                </td>
                <td>{order.items.length}</td>
                <td>{formatMinorAmount(order.total_amount, order.currency)}</td>
                <td>{new Date(order.created_at).toLocaleDateString("en-NG")}</td>
                <td>
                  {order.financial_status === "unpaid" &&
                  order.fulfilment_status === "unfulfilled" ? (
                    <form action={cancelOrderAction}>
                      <input type="hidden" name="order_id" value={order.id} />
                      <Button type="submit" className="button-danger">
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
