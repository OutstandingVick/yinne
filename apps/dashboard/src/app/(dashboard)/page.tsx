import Link from "next/link";
import { Badge, CoreScreen, MetricCard, PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listCustomers, listInventoryLevels, listOrders, listProducts } from "@yinne/commerce";
import { activeUserContext } from "../../lib/context";

export default async function HomePage() {
  const context = await activeUserContext(createRequestId());
  const [customersResult, productsResult, inventoryResult, ordersResult] = await Promise.allSettled([
    listCustomers(context, { limit: 100 }),
    listProducts(context, { limit: 100 }),
    listInventoryLevels(context, { limit: 100 }),
    listOrders(context, { limit: 100 }),
  ]);
  const customers = customersResult.status === "fulfilled" ? customersResult.value.data : null;
  const products = productsResult.status === "fulfilled" ? productsResult.value.data : null;
  const inventory = inventoryResult.status === "fulfilled" ? inventoryResult.value.data : null;
  const orders = ordersResult.status === "fulfilled" ? ordersResult.value.data : null;
  const cards = [
    [
      "Customers",
      customers?.length ?? null,
      "/commerce/customers",
      "People and organizations purchasing from Acme.",
    ],
    ["Products", products?.length ?? null, "/commerce/products", "Catalogue products with trusted variant prices."],
    [
      "Inventory levels",
      inventory?.length ?? null,
      "/commerce/inventory",
      "Tracked stock positions across fulfilment locations.",
    ],
    [
      "Orders",
      orders?.length ?? null,
      "/commerce/orders",
      "Unpaid commercial records; payments remain a later capability.",
    ],
  ] as const;
  return (
    <CoreScreen className="overview-screen">
      <PageHeader
        title="Commerce overview"
        description="Live test-mode data from the tenant-isolated commerce system."
      />
      <div className="card-grid overview-grid">
        {cards.map(([name, value, href, description]) => (
          <Link href={href} key={name}>
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
      <section className="notice">
        <strong>Payments are not active.</strong> Orders created in this phase remain unpaid, and
        stock is not decremented until a future payment-success transaction.
      </section>
    </CoreScreen>
  );
}
