import { createHash } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { recordDomainChange, requirePermission, type RequestContext } from "@yinne/application";
import { principalId } from "@yinne/auth";
import type { CreateSubscriptionInput } from "@yinne/contracts";
import { ApiError } from "@yinne/contracts";
import { customers, idempotencyRecords, locations, merchants, recurringPrices, subscriptionPlans, subscriptions, withTenantTransaction } from "@yinne/database";
import { initialBillingPeriod, type BillingInterval } from "./calendar";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const notFound = (): never => { throw new ApiError(404, "invalid_request", "resource_not_found", "The requested resource does not exist."); };
export const subscriptionView = (row: typeof subscriptions.$inferSelect) => ({
  id: row.id, merchant_id: row.merchantId, location_id: row.locationId, customer_id: row.customerId,
  plan_id: row.planId, price_id: row.priceId, status: row.status, currency: row.currency,
  unit_amount: row.unitAmount.toString(), interval: row.interval, interval_count: row.intervalCount,
  billing_timezone: row.billingTimezone, current_period_start: row.currentPeriodStart.toISOString(),
  current_period_end: row.currentPeriodEnd.toISOString(), next_billing_at: row.nextBillingAt?.toISOString() ?? null,
  trial_start: row.trialStart?.toISOString() ?? null, trial_end: row.trialEnd?.toISOString() ?? null,
  cancel_at_period_end: row.cancelAtPeriodEnd, cancelled_at: row.cancelledAt?.toISOString() ?? null,
  paused_at: row.pausedAt?.toISOString() ?? null, retry_count: row.retryCount, version: row.version,
  metadata: row.metadata, created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
});

export async function createSubscription(context: RequestContext, input: CreateSubscriptionInput, key: string, now = new Date()) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "subscriptions:write", { organizationId: context.tenant.organizationId, locationId: input.location_id });
    if (context.tenant.environment === "live" && input.trial_days > 0)
      throw new ApiError(409, "conflict", "recurring_capability_required", "Live trials require an approved recurring payment capability.");
    const actor = principalId(context.principal); const keyDigest = digest(key); const requestDigest = digest(JSON.stringify(input));
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${actor}:subscription:${keyDigest}`}, 0))`);
    const [existing] = await tx.select().from(idempotencyRecords).where(and(eq(idempotencyRecords.organizationId, context.tenant.organizationId), eq(idempotencyRecords.principalId, actor), eq(idempotencyRecords.operation, "subscription.create"), eq(idempotencyRecords.environment, context.tenant.environment), eq(idempotencyRecords.keyDigest, keyDigest))).limit(1);
    if (existing) {
      if (existing.requestDigest !== requestDigest) throw new ApiError(409, "conflict", "idempotency_conflict", "Idempotency key was already used with different input.");
      return existing.responseBody!.subscription;
    }
    const [price] = await tx.select().from(recurringPrices).innerJoin(subscriptionPlans, and(eq(subscriptionPlans.organizationId, recurringPrices.organizationId), eq(subscriptionPlans.id, recurringPrices.planId))).where(and(eq(recurringPrices.organizationId, context.tenant.organizationId), eq(recurringPrices.id, input.price_id), eq(recurringPrices.status, "active"), eq(subscriptionPlans.status, "active"))).limit(1);
    const [customer] = await tx.select({ id: customers.id }).from(customers).where(and(eq(customers.organizationId, context.tenant.organizationId), eq(customers.id, input.customer_id))).limit(1);
    const [merchant] = await tx.select({ id: merchants.id }).from(merchants).where(and(eq(merchants.organizationId, context.tenant.organizationId), eq(merchants.id, input.merchant_id), eq(merchants.status, "active"))).limit(1);
    const [location] = await tx.select({ id: locations.id }).from(locations).where(and(eq(locations.organizationId, context.tenant.organizationId), eq(locations.id, input.location_id), eq(locations.merchantId, input.merchant_id), eq(locations.status, "active"))).limit(1);
    if (!price || !customer || !merchant || !location) notFound();
    const recurringPrice = price.recurring_prices;
    const trialEnd = input.trial_days ? new Date(now.getTime() + input.trial_days * 86_400_000) : null;
    const period = initialBillingPeriod(trialEnd ?? now, recurringPrice.interval as BillingInterval);
    const [row] = await tx.insert(subscriptions).values({ organizationId: context.tenant.organizationId, environment: context.tenant.environment, merchantId: input.merchant_id, locationId: input.location_id, customerId: input.customer_id, planId: recurringPrice.planId, priceId: recurringPrice.id, status: trialEnd ? "trialing" : "active", currency: recurringPrice.currency, unitAmount: recurringPrice.unitAmount, interval: recurringPrice.interval, intervalCount: recurringPrice.intervalCount, billingTimezone: input.billing_timezone, anchorDay: period.anchorDay, currentPeriodStart: period.start, currentPeriodEnd: period.end, nextBillingAt: trialEnd ?? now, trialStart: trialEnd ? now : null, trialEnd, mockRenewalOutcome: input.mock_renewal_outcome, metadata: input.metadata }).returning();
    if (!row) throw new ApiError(500, "internal_error", "subscription_create_failed", "Subscription could not be created.");
    const response = subscriptionView(row);
    await tx.insert(idempotencyRecords).values({ organizationId: context.tenant.organizationId, principalId: actor, operation: "subscription.create", environment: context.tenant.environment, keyDigest, requestDigest, responseStatus: 201, responseBody: { subscription: response }, expiresAt: new Date(Date.now() + 86_400_000) });
    await recordDomainChange(tx, context, { action: "subscription.created", aggregateType: "subscription", aggregateId: row.id, aggregateVersion: row.version, data: { subscription_id: row.id, status: row.status, price_id: row.priceId } });
    if (trialEnd) await recordDomainChange(tx, context, { action: "subscription.trial_started", aggregateType: "subscription", aggregateId: row.id, aggregateVersion: row.version, data: { subscription_id: row.id, trial_end: trialEnd.toISOString() } });
    return response;
  });
}

export async function listSubscriptions(context: RequestContext, filters: { limit?: number | undefined; status?: string | undefined; customer_id?: string | undefined; plan_id?: string | undefined } = {}) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "subscriptions:read", { organizationId: context.tenant.organizationId });
    const predicates = [eq(subscriptions.organizationId, context.tenant.organizationId), eq(subscriptions.environment, context.tenant.environment)];
    if (filters.status) predicates.push(eq(subscriptions.status, filters.status));
    if (filters.customer_id) predicates.push(eq(subscriptions.customerId, filters.customer_id));
    if (filters.plan_id) predicates.push(eq(subscriptions.planId, filters.plan_id));
    const rows = await tx.select().from(subscriptions).where(and(...predicates)).orderBy(desc(subscriptions.createdAt)).limit(filters.limit ?? 20);
    return { data: rows.map(subscriptionView), has_more: false, next_cursor: null };
  });
}

export async function getSubscription(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "subscriptions:read", { organizationId: context.tenant.organizationId });
    const [row] = await tx.select().from(subscriptions).where(and(eq(subscriptions.organizationId, context.tenant.organizationId), eq(subscriptions.environment, context.tenant.environment), eq(subscriptions.id, id))).limit(1);
    if (!row) notFound();
    return subscriptionView(row);
  });
}
