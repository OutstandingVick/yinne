import { and, eq, lte, sql } from "drizzle-orm";
import { recordDomainChange, type RequestContext } from "@yinne/application";
import { confirmPublicCheckout } from "@yinne/checkout";
import { ApiError } from "@yinne/contracts";
import {
  invoices,
  subscriptionRenewals,
  subscriptions,
  withTenantTransaction,
} from "@yinne/database";
import { createInvoice, issueInvoice, payPublicInvoice } from "@yinne/invoicing";
import { advanceBillingDate, type BillingInterval } from "./calendar";

export async function processSubscriptionRenewal(
  context: RequestContext,
  subscriptionId: string,
  now = new Date(),
) {
  const prepared = await withTenantTransaction(context.tenant, async (tx) => {
    const [subscription] = await tx
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.organizationId, context.tenant.organizationId),
          eq(subscriptions.environment, context.tenant.environment),
          eq(subscriptions.id, subscriptionId),
        ),
      )
      .for("update")
      .limit(1);
    if (!subscription)
      throw new ApiError(
        404,
        "invalid_request",
        "resource_not_found",
        "The requested Subscription does not exist.",
      );
    if (
      !["active", "past_due", "trialing"].includes(subscription.status) ||
      !subscription.nextBillingAt ||
      subscription.nextBillingAt > now
    )
      return { skipped: true as const, subscription };
    if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd <= now) {
      const [cancelled] = await tx
        .update(subscriptions)
        .set({
          status: "cancelled",
          cancelledAt: now,
          nextBillingAt: null,
          version: sql`${subscriptions.version} + 1`,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, subscription.id))
        .returning();
      if (cancelled)
        await recordDomainChange(tx, context, {
          action: "subscription.cancelled",
          aggregateType: "subscription",
          aggregateId: cancelled.id,
          aggregateVersion: cancelled.version,
          data: { subscription_id: cancelled.id, mode: "period_end" },
        });
      return { skipped: true as const, subscription: cancelled ?? subscription };
    }
    const [renewal] = await tx
      .insert(subscriptionRenewals)
      .values({
        organizationId: subscription.organizationId,
        environment: subscription.environment,
        subscriptionId: subscription.id,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
      })
      .onConflictDoUpdate({
        target: [
          subscriptionRenewals.organizationId,
          subscriptionRenewals.environment,
          subscriptionRenewals.subscriptionId,
          subscriptionRenewals.periodStart,
        ],
        set: { updatedAt: now },
      })
      .returning();
    if (!renewal)
      throw new ApiError(
        500,
        "internal_error",
        "renewal_create_failed",
        "Renewal could not be created.",
      );
    if (renewal.status === "succeeded") return { skipped: true as const, subscription };
    return { skipped: false as const, subscription, renewal };
  });
  if (prepared.skipped) return { status: "skipped", subscription_id: subscriptionId };
  const { subscription, renewal } = prepared;
  if (renewal.invoiceId)
    return { status: renewal.status, subscription_id: subscription.id, invoice_id: renewal.invoiceId };

  const created = (await createInvoice(
    context,
    {
      merchant_id: subscription.merchantId,
      customer_id: subscription.customerId,
      location_id: subscription.locationId,
      currency: subscription.currency,
      due_at: now,
      metadata: { channel: "subscription", subscription_id: subscription.id, renewal_id: renewal.id },
      items: [
        {
          description: `Recurring subscription ${subscription.currentPeriodStart.toISOString()} – ${subscription.currentPeriodEnd.toISOString()}`,
          quantity: 1,
          unit_amount: subscription.unitAmount.toString(),
        },
      ],
    },
    `renewal:${subscription.id}:${subscription.currentPeriodStart.toISOString()}`,
  )) as { id: string };
  await withTenantTransaction(context.tenant, async (tx) => {
    await tx
      .update(invoices)
      .set({
        subscriptionId: subscription.id,
        billingPeriodStart: subscription.currentPeriodStart,
        billingPeriodEnd: subscription.currentPeriodEnd,
      })
      .where(eq(invoices.id, created.id));
    await tx
      .update(subscriptionRenewals)
      .set({ invoiceId: created.id, updatedAt: now })
      .where(eq(subscriptionRenewals.id, renewal.id));
  });
  const issued = (await issueInvoice(context, created.id)) as { invoice_url?: string };
  const invoiceToken = issued.invoice_url?.split("/").pop();
  if (!invoiceToken)
    throw new ApiError(500, "internal_error", "invoice_token_missing", "Renewal Invoice token is missing.");
  const checkout = (await payPublicInvoice(
    invoiceToken,
    `renewal-checkout:${renewal.id}`,
  )) as { checkout_url: string | null };
  const checkoutToken = checkout.checkout_url?.split("/").pop();
  if (!checkoutToken)
    return { status: "pending", subscription_id: subscription.id, invoice_id: created.id };
  const scenario =
    subscription.mockRenewalOutcome === "succeed"
      ? "success"
      : subscription.mockRenewalOutcome === "fail"
        ? "failure:declined"
        : "pending:then_success";
  await confirmPublicCheckout(
    checkoutToken,
    { customer: {}, confirmation: { mock_scenario: scenario } },
    `renewal-confirm:${renewal.id}:${renewal.attemptCount + 1}`,
  );
  const outcome =
    subscription.mockRenewalOutcome === "succeed"
      ? "succeeded"
      : subscription.mockRenewalOutcome === "fail"
        ? "failed"
        : "pending";
  await recordRenewalOutcome(context, subscription.id, renewal.id, outcome, now);
  return { status: outcome, subscription_id: subscription.id, invoice_id: created.id };
}

async function recordRenewalOutcome(
  context: RequestContext,
  subscriptionId: string,
  renewalId: string,
  outcome: "succeeded" | "failed" | "pending",
  now: Date,
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const [subscription] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .for("update")
      .limit(1);
    const [renewal] = await tx
      .select()
      .from(subscriptionRenewals)
      .where(eq(subscriptionRenewals.id, renewalId))
      .for("update")
      .limit(1);
    if (!subscription || !renewal || renewal.status === "succeeded") return;
    if (outcome === "succeeded") {
      const nextEnd = advanceBillingDate(
        subscription.currentPeriodEnd,
        subscription.interval as BillingInterval,
        subscription.anchorDay,
      );
      const [updated] = await tx
        .update(subscriptions)
        .set({
          status: "active",
          currentPeriodStart: subscription.currentPeriodEnd,
          currentPeriodEnd: nextEnd,
          nextBillingAt: nextEnd,
          retryCount: 0,
          version: sql`${subscriptions.version} + 1`,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, subscription.id))
        .returning();
      await tx
        .update(subscriptionRenewals)
        .set({ status: "succeeded", completedAt: now, updatedAt: now })
        .where(eq(subscriptionRenewals.id, renewal.id));
      if (updated)
        await recordDomainChange(tx, context, {
          action: "subscription.renewal_succeeded",
          aggregateType: "subscription",
          aggregateId: updated.id,
          aggregateVersion: updated.version,
          data: { subscription_id: updated.id, renewal_id: renewal.id, invoice_id: renewal.invoiceId },
        });
      return;
    }
    const attempts = Math.min(3, renewal.attemptCount + 1);
    const nextRetryAt =
      outcome === "failed" && attempts < 3
        ? new Date(now.getTime() + (attempts === 1 ? 1 : 3) * 86_400_000)
        : null;
    await tx
      .update(subscriptionRenewals)
      .set({
        status: outcome === "pending" ? "pending" : attempts >= 3 ? "exhausted" : "failed",
        attemptCount: attempts,
        nextRetryAt,
        updatedAt: now,
      })
      .where(eq(subscriptionRenewals.id, renewal.id));
    await tx
      .update(subscriptions)
      .set({
        status: outcome === "failed" ? "past_due" : subscription.status,
        retryCount: attempts,
        version: sql`${subscriptions.version} + 1`,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, subscription.id));
    await recordDomainChange(tx, context, {
      action:
        outcome === "pending" ? "subscription.renewal_pending" : "subscription.renewal_failed",
      aggregateType: "subscription",
      aggregateId: subscription.id,
      aggregateVersion: subscription.version + 1,
      data: {
        subscription_id: subscription.id,
        renewal_id: renewal.id,
        attempt_count: attempts,
        next_retry_at: nextRetryAt?.toISOString() ?? null,
      },
    });
  });
}

export async function processDueSubscriptions(
  context: RequestContext,
  now = new Date(),
  limit = 50,
) {
  const ids = await withTenantTransaction(context.tenant, (tx) =>
    tx
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.organizationId, context.tenant.organizationId),
          eq(subscriptions.environment, context.tenant.environment),
          sql`${subscriptions.status} in ('active','past_due','trialing')`,
          lte(subscriptions.nextBillingAt, now),
        ),
      )
      .orderBy(subscriptions.nextBillingAt)
      .limit(limit),
  );
  return Promise.all(ids.map(({ id }) => processSubscriptionRenewal(context, id, now)));
}
