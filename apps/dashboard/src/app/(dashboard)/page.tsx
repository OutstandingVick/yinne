import Link from "next/link";
import {
  Badge,
  CoreScreen,
  EmptyState,
  FinancialAmount,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusBadge,
  Table,
} from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listCustomers, listInventoryLevels, listOrders, listProducts } from "@yinne/commerce";
import { activeUserContext } from "../../lib/context";
import { formatMinorAmount } from "../../lib/money";

export default async function HomePage() {
  const context = await activeUserContext(createRequestId());
  const [customersResult, productsResult, inventoryResult, ordersResult] = await Promise.allSettled(
    [
      listCustomers(context, { limit: 100 }),
      listProducts(context, { limit: 100 }),
      listInventoryLevels(context, { limit: 100 }),
      listOrders(context, { limit: 100 }),
    ],
  );
  const customers = customersResult.status === "fulfilled" ? customersResult.value.data : null;
  const products = productsResult.status === "fulfilled" ? productsResult.value.data : null;
  const inventory = inventoryResult.status === "fulfilled" ? inventoryResult.value.data : null;
  const orders = ordersResult.status === "fulfilled" ? ordersResult.value.data : null;
  const cards = [
    [
      "Orders",
      orders?.length ?? null,
      "/commerce/orders",
      "Unpaid commercial records; payments remain a later capability.",
    ],
    [
      "Customers",
      customers?.length ?? null,
      "/commerce/customers",
      "People and organizations purchasing from Acme.",
    ],
    [
      "Products",
      products?.length ?? null,
      "/commerce/products",
      "Catalogue products with trusted variant prices.",
    ],
    [
      "Inventory levels",
      inventory?.length ?? null,
      "/commerce/inventory",
      "Tracked stock positions across fulfilment locations.",
    ],
  ] as const;
  return (
    <CoreScreen className="overview-screen">
      <PageHeader
        title="Commerce overview"
        description="Live test-mode data from the tenant-isolated commerce system."
        actions={
          <div className="overview-actions">
            <Link className="button button-secondary" href="/analytics">
              Analytics
            </Link>
            <Link className="button" href="/commerce/orders">
              Orders
            </Link>
          </div>
        }
      />
      <div className="overview-primary">
        <div className="overview-metrics" aria-label="Commerce summary">
          {cards.map(([name, value, href, description]) => (
            <Link
              href={href}
              key={name}
              className={name === "Orders" ? "overview-featured-metric" : ""}
            >
              <MetricCard
                label={name}
                value={value ?? "—"}
                description={description}
                status={
                  <Badge tone={value === null ? "neutral" : "success"}>
                    {value === null ? "Restricted" : "Active"}
                  </Badge>
                }
              />
            </Link>
          ))}
        </div>
        <SectionCard className="overview-recent-orders">
          <div className="overview-section-heading">
            <div>
              <span className="overview-eyebrow">Commerce activity</span>
              <h2>Recent orders</h2>
            </div>
            <Link href="/commerce/orders" className="overview-text-link">
              View orders <span aria-hidden="true">↗</span>
            </Link>
          </div>
          {orders === null ? (
            <EmptyState
              title="Orders unavailable"
              description="Open Orders to inspect this data."
            />
          ) : orders.length === 0 ? (
            <EmptyState title="No orders" description="Create the first unpaid commercial order." />
          ) : (
            <Table label="Recent orders" density="compact">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 8).map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/commerce/orders/${order.id}`}>{order.number}</Link>
                    </td>
                    <td>
                      <FinancialAmount>
                        {formatMinorAmount(order.total_amount, order.currency)}
                      </FinancialAmount>
                    </td>
                    <td>
                      <StatusBadge
                        tone={
                          order.financial_status === "paid"
                            ? "success"
                            : order.financial_status === "refunded"
                              ? "info"
                              : "warning"
                        }
                      >
                        {order.financial_status}
                      </StatusBadge>
                    </td>
                    <td>{new Date(order.created_at).toLocaleDateString("en-NG")}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </SectionCard>
      </div>
      <div className="overview-secondary">
        <SectionCard className="overview-operational-card">
          <div className="overview-section-heading">
            <div>
              <span className="overview-eyebrow">Operational view</span>
              <h2>Inventory levels</h2>
            </div>
            <Link href="/commerce/inventory" className="overview-text-link">
              View inventory <span aria-hidden="true">↗</span>
            </Link>
          </div>
          {inventory === null ? (
            <p className="overview-unavailable">Restricted</p>
          ) : inventory.length === 0 ? (
            <p className="overview-unavailable">No inventory levels</p>
          ) : (
            <ul className="overview-operational-list">
              {inventory.slice(0, 3).map((level) => (
                <li key={level.id}>
                  <span>
                    <strong>{level.product_name}</strong>
                    <small>
                      {level.location_name} · {level.variant_title}
                    </small>
                  </span>
                  <span className="overview-list-value">{level.on_hand}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard className="overview-operational-card">
          <div className="overview-section-heading">
            <div>
              <span className="overview-eyebrow">Catalogue view</span>
              <h2>Products</h2>
            </div>
            <Link href="/commerce/products" className="overview-text-link">
              View products <span aria-hidden="true">↗</span>
            </Link>
          </div>
          {products === null ? (
            <p className="overview-unavailable">Restricted</p>
          ) : products.length === 0 ? (
            <p className="overview-unavailable">No products</p>
          ) : (
            <ul className="overview-operational-list">
              {products.slice(0, 3).map((product) => (
                <li key={product.id}>
                  <span>
                    <Link href={`/commerce/products/${product.id}`}>{product.name}</Link>
                    <small>{product.variants.length} variants</small>
                  </span>
                  <StatusBadge tone={product.status === "active" ? "success" : "warning"}>
                    {product.status}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
      <section className="notice">
        <strong>Payments are not active.</strong> Orders created in this phase remain unpaid, and
        stock is not decremented until a future payment-success transaction.
      </section>
    </CoreScreen>
  );
}
