import { Badge, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getPlan } from "@yinne/subscriptions";
import { formatMinorAmount } from "../../../../lib/money";
import { activeUserContext } from "../../../../lib/context";
export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const plan = await getPlan(await activeUserContext(createRequestId()), (await params).id);
  return (
    <>
      <PageHeader
        title={plan.name}
        description={plan.description ?? "Recurring commercial offering"}
      />
      <section className="card">
        <Badge tone={plan.status === "active" ? "success" : "neutral"}>{plan.status}</Badge>
      </section>
      <Table label="Recurring Prices">
        <thead>
          <tr>
            <th>Amount</th>
            <th>Interval</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {plan.prices.map((price) => (
            <tr key={price.id}>
              <td>{formatMinorAmount(price.unit_amount, price.currency)}</td>
              <td>
                Every {price.interval_count} {price.interval}
              </td>
              <td>{price.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
