import { and, eq, sql } from "drizzle-orm";
import { recordDomainChange, requirePermission, type RequestContext } from "@yinne/application";
import type { CancelSubscriptionInput, RetrySubscriptionInput } from "@yinne/contracts";
import { ApiError } from "@yinne/contracts";
import { subscriptions, withTenantTransaction } from "@yinne/database";
import { advanceBillingDate, type BillingInterval } from "./calendar";
import { processSubscriptionRenewal } from "./renewal";
import { assertSubscriptionTransition, type SubscriptionStatus } from "./state";
import { subscriptionView } from "./subscriptions";

async function mutate(context: RequestContext, id: string, permission: "subscriptions:write" | "subscriptions:cancel", handler: (row: typeof subscriptions.$inferSelect) => { status: string; action: "subscription.paused" | "subscription.resumed" | "subscription.cancel_scheduled" | "subscription.cancelled"; values: Partial<typeof subscriptions.$inferInsert> }) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, permission, { organizationId: context.tenant.organizationId });
    const [row] = await tx.select().from(subscriptions).where(and(eq(subscriptions.organizationId, context.tenant.organizationId), eq(subscriptions.environment, context.tenant.environment), eq(subscriptions.id, id))).for("update").limit(1);
    if (!row) throw new ApiError(404, "invalid_request", "resource_not_found", "The requested Subscription does not exist.");
    const change = handler(row);
    const [updated] = await tx.update(subscriptions).set({ ...change.values, version: sql`${subscriptions.version} + 1`, updatedAt: new Date() }).where(eq(subscriptions.id, id)).returning();
    if (!updated) throw new ApiError(500, "internal_error", "subscription_update_failed", "Subscription could not be updated.");
    await recordDomainChange(tx, context, { action: change.action, aggregateType: "subscription", aggregateId: updated.id, aggregateVersion: updated.version, data: { subscription_id: updated.id, status: change.status } });
    return subscriptionView(updated);
  });
}

export function pauseSubscription(context: RequestContext, id: string) {
  return mutate(context, id, "subscriptions:write", (row) => {
    assertSubscriptionTransition(row.status as SubscriptionStatus, "paused");
    return { status: "paused", action: "subscription.paused", values: { status: "paused", pausedAt: new Date(), nextBillingAt: null } };
  });
}

export function resumeSubscription(context: RequestContext, id: string, now = new Date()) {
  return mutate(context, id, "subscriptions:write", (row) => {
    assertSubscriptionTransition(row.status as SubscriptionStatus, "active");
    const end = advanceBillingDate(now, row.interval as BillingInterval, row.anchorDay);
    return { status: "active", action: "subscription.resumed", values: { status: "active", pausedAt: null, currentPeriodStart: now, currentPeriodEnd: end, nextBillingAt: end } };
  });
}

export function cancelSubscription(context: RequestContext, id: string, input: CancelSubscriptionInput) {
  return mutate(context, id, "subscriptions:cancel", (row) => {
    if (input.mode === "period_end") {
      if (!["active", "trialing", "past_due"].includes(row.status)) throw new ApiError(409, "conflict", "subscription_not_cancellable", "Subscription cannot be scheduled for cancellation.");
      return { status: row.status, action: "subscription.cancel_scheduled", values: { cancelAtPeriodEnd: true } };
    }
    assertSubscriptionTransition(row.status as SubscriptionStatus, "cancelled");
    return { status: "cancelled", action: "subscription.cancelled", values: { status: "cancelled", cancelledAt: new Date(), nextBillingAt: null, cancelAtPeriodEnd: false } };
  });
}

export async function retrySubscription(context: RequestContext, id: string, input: RetrySubscriptionInput, now = new Date()) {
  await withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "subscriptions:retry", { organizationId: context.tenant.organizationId });
    const [row] = await tx.select().from(subscriptions).where(and(eq(subscriptions.organizationId, context.tenant.organizationId), eq(subscriptions.environment, context.tenant.environment), eq(subscriptions.id, id), eq(subscriptions.status, "past_due"))).for("update").limit(1);
    if (!row) throw new ApiError(409, "conflict", "subscription_not_retryable", "Only a past-due Subscription may be retried.");
    await tx.update(subscriptions).set({ nextBillingAt: now, ...(input.mock_outcome ? { mockRenewalOutcome: input.mock_outcome } : {}), updatedAt: now }).where(eq(subscriptions.id, id));
    await recordDomainChange(tx, context, { action: "subscription.renewal_retried", aggregateType: "subscription", aggregateId: row.id, aggregateVersion: row.version, data: { subscription_id: row.id, retry_count: row.retryCount + 1 } });
  });
  return processSubscriptionRenewal(context, id, now);
}
