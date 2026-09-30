import {
  CoreScreen,
  FinancialAmount,
  PageHeader,
  SectionCard,
  StatusBadge,
  Table,
} from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getPlan } from "@yinne/subscriptions";
import { formatMinorAmount } from "../../../../lib/money";
import { activeUserContext } from "../../../../lib/context";
export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const plan = await getPlan(await activeUserContext(createRequestId()), (await params).id);
  return (
    <CoreScreen className="module-screen">
      <PageHeader
        title={plan.name}
        description={plan.description ?? "Recurring commercial offering"}
      />
      <SectionCard>
        <StatusBadge tone={plan.status === "active" ? "success" : "neutral"}>
          {plan.status}
        </StatusBadge>
      </SectionCard>
      <Table label="Recurring Prices" density="compact">
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
              <td>
                <FinancialAmount>
                  {formatMinorAmount(price.unit_amount, price.currency)}
                </FinancialAmount>
              </td>
              <td>
                Every {price.interval_count} {price.interval}
              </td>
              <td>{price.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </CoreScreen>
  );
}
