import { revalidatePath } from "next/cache";
import { ActionGroup, Button, CoreScreen, DetailGrid, DetailItem, FinancialAmount, PageHeader, StatusBadge } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import {
  cancelSubscription,
  getSubscription,
  pauseSubscription,
  resumeSubscription,
  retrySubscription,
} from "@yinne/subscriptions";
import { formatMinorAmount } from "../../../../lib/money";
import { activeUserContext } from "../../../../lib/context";
async function action(id: string, name: string) {
  "use server";
  const context = await activeUserContext(createRequestId());
  if (name === "pause") await pauseSubscription(context, id);
  else if (name === "resume") await resumeSubscription(context, id);
  else if (name === "retry") await retrySubscription(context, id, {});
  else
    await cancelSubscription(context, id, {
      mode: name === "period_end" ? "period_end" : "immediate",
    });
  revalidatePath(`/subscriptions/${id}`);
}
export default async function SubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subscription = await getSubscription(await activeUserContext(createRequestId()), id);
  return (
    <CoreScreen className="module-screen">
      <PageHeader
        title={`Subscription ${id.slice(0, 8)}`}
        description="Renewals generate canonical Invoices and execute through Payments Core."
      />
      <DetailGrid className="module-summary">
        <DetailItem label="Status">
            <StatusBadge tone={subscription.status === "active" ? "success" : "warning"}>
              {subscription.status}
            </StatusBadge>
        </DetailItem>
        <DetailItem label="Price snapshot">
            <FinancialAmount>{formatMinorAmount(subscription.unit_amount, subscription.currency)}</FinancialAmount> /{" "}
            {subscription.interval}
        </DetailItem>
        <DetailItem label="Current period">
            {new Date(subscription.current_period_start).toLocaleDateString()} –{" "}
            {new Date(subscription.current_period_end).toLocaleDateString()}
        </DetailItem>
        <DetailItem label="Retry count">{subscription.retry_count}</DetailItem>
      </DetailGrid>
      <ActionGroup className="module-actions">
        {["active", "trialing", "past_due"].includes(subscription.status) ? (
          <form action={action.bind(null, id, "pause")}>
            <Button type="submit" className="button-secondary">
              Pause
            </Button>
          </form>
        ) : null}
        {subscription.status === "paused" ? (
          <form action={action.bind(null, id, "resume")}>
            <Button type="submit">Resume</Button>
          </form>
        ) : null}
        {subscription.status === "past_due" ? (
          <form action={action.bind(null, id, "retry")}>
            <Button type="submit">Retry payment</Button>
          </form>
        ) : null}
        {["active", "trialing", "past_due"].includes(subscription.status) ? (
          <>
            <form action={action.bind(null, id, "period_end")}>
              <Button type="submit" className="button-secondary">
                Cancel at period end
              </Button>
            </form>
            <form action={action.bind(null, id, "immediate")}>
              <Button type="submit" className="button-secondary">
                Cancel now
              </Button>
            </form>
          </>
        ) : null}
      </ActionGroup>
    </CoreScreen>
  );
}
