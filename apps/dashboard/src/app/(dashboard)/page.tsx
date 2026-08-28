import Link from "next/link";
import { Badge, PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listCustomers, listInventoryLevels, listOrders, listProducts } from "@yinne/commerce";
import { activeUserContext } from "../../lib/context";

export default async function HomePage() {
  const context = await activeUserContext(createRequestId());
  const results = await Promise.allSettled([
    listCustomers(context, { limit: 100 }),
    listProducts(context, { limit: 100 }),
    listInventoryLevels(context, { limit: 100 }),
    listOrders(context, { limit: 100 }),
  ]);
  const count = (index: number) =>
    results[index]?.status === "fulfilled" ? results[index].value.data.length : null;
  const cards = [
    [
      "Customers",
      count(0),
      "/commerce/customers",
      "People and organizations purchasing from Acme.",
    ],
    ["Products", count(1), "/commerce/products", "Catalogue products with trusted variant prices."],
    [
      "Inventory levels",
      count(2),
      "/commerce/inventory",
      "Tracked stock positions across fulfilment locations.",
    ],
    [
      "Orders",
      count(3),
      "/commerce/orders",
      "Unpaid commercial records; payments remain a later capability.",
    ],
  ] as const;
  return (
    <>
      <PageHeader
        title="Commerce overview"
        description="Live test-mode data from the tenant-isolated commerce system."
      />
      <div className="card-grid">
        {cards.map(([name, value, href, description]) => (
          <Link href={href} className="card" key={name}>
            <Badge tone={value === null ? "neutral" : "success"}>
              {value === null ? "Restricted" : "Active"}
            </Badge>
            <h2 style={{ marginTop: 14 }}>{value ?? "—"}</h2>
            <strong>{name}</strong>
            <p>{description}</p>
          </Link>
        ))}
      </div>
      <section className="notice" style={{ marginTop: 20 }}>
        <strong>Payments are not active.</strong> Orders created in this phase remain unpaid, and
        stock is not decremented until a future payment-success transaction.
      </section>
    </>
  );
}
