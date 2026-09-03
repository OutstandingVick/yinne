import { and, desc, eq, sql } from "drizzle-orm";
import { recordDomainChange, requirePermission, type RequestContext } from "@yinne/application";
import type { CreateRecurringPriceInput, CreateSubscriptionPlanInput } from "@yinne/contracts";
import { ApiError } from "@yinne/contracts";
import { recurringPrices, subscriptionPlans, withTenantTransaction } from "@yinne/database";

const notFound = (): never => {
  throw new ApiError(404, "invalid_request", "resource_not_found", "The requested resource does not exist.");
};
const planView = (row: typeof subscriptionPlans.$inferSelect) => ({
  id: row.id, name: row.name, description: row.description, status: row.status,
  metadata: row.metadata, version: row.version, created_at: row.createdAt.toISOString(),
});
const priceView = (row: typeof recurringPrices.$inferSelect) => ({
  id: row.id, plan_id: row.planId, currency: row.currency, unit_amount: row.unitAmount.toString(),
  interval: row.interval, interval_count: row.intervalCount, status: row.status,
  metadata: row.metadata, created_at: row.createdAt.toISOString(),
});

export async function createPlan(context: RequestContext, input: CreateSubscriptionPlanInput) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "subscriptions:write", { organizationId: context.tenant.organizationId });
    const [row] = await tx.insert(subscriptionPlans).values({ organizationId: context.tenant.organizationId, ...input }).returning();
    if (!row) throw new ApiError(500, "internal_error", "plan_create_failed", "Plan could not be created.");
    await recordDomainChange(tx, context, { action: "subscription_plan.created", aggregateType: "subscription_plan", aggregateId: row.id, aggregateVersion: row.version, data: { plan_id: row.id } });
    return planView(row);
  });
}

export async function listPlans(context: RequestContext, filters: { limit?: number | undefined; status?: string | undefined } = {}) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "subscriptions:read", { organizationId: context.tenant.organizationId });
    const predicates = [eq(subscriptionPlans.organizationId, context.tenant.organizationId)];
    if (filters.status) predicates.push(eq(subscriptionPlans.status, filters.status));
    const rows = await tx.select().from(subscriptionPlans).where(and(...predicates)).orderBy(desc(subscriptionPlans.createdAt)).limit(filters.limit ?? 20);
    return { data: rows.map(planView), has_more: false, next_cursor: null };
  });
}

export async function getPlan(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "subscriptions:read", { organizationId: context.tenant.organizationId });
    const [row] = await tx.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.organizationId, context.tenant.organizationId), eq(subscriptionPlans.id, id))).limit(1);
    if (!row) notFound();
    const prices = await tx.select().from(recurringPrices).where(and(eq(recurringPrices.organizationId, context.tenant.organizationId), eq(recurringPrices.planId, id))).orderBy(desc(recurringPrices.createdAt));
    return { ...planView(row), prices: prices.map(priceView) };
  });
}

export async function archivePlan(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "subscriptions:write", { organizationId: context.tenant.organizationId });
    const [row] = await tx.update(subscriptionPlans).set({ status: "archived", archivedAt: new Date(), updatedAt: new Date(), version: sql`${subscriptionPlans.version} + 1` }).where(and(eq(subscriptionPlans.organizationId, context.tenant.organizationId), eq(subscriptionPlans.id, id), eq(subscriptionPlans.status, "active"))).returning();
    if (!row) notFound();
    await recordDomainChange(tx, context, { action: "subscription_plan.archived", aggregateType: "subscription_plan", aggregateId: row.id, aggregateVersion: row.version, data: { plan_id: row.id } });
    return planView(row);
  });
}

export async function createPrice(context: RequestContext, input: CreateRecurringPriceInput) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "subscriptions:write", { organizationId: context.tenant.organizationId });
    const [plan] = await tx.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.organizationId, context.tenant.organizationId), eq(subscriptionPlans.id, input.plan_id), eq(subscriptionPlans.status, "active"))).limit(1);
    if (!plan) notFound();
    const [row] = await tx.insert(recurringPrices).values({ organizationId: context.tenant.organizationId, planId: input.plan_id, currency: input.currency, unitAmount: BigInt(input.unit_amount), interval: input.interval, intervalCount: input.interval_count, metadata: input.metadata }).returning();
    if (!row) throw new ApiError(500, "internal_error", "price_create_failed", "Price could not be created.");
    await recordDomainChange(tx, context, { action: "recurring_price.created", aggregateType: "recurring_price", aggregateId: row.id, aggregateVersion: 1, data: { price_id: row.id, plan_id: row.planId } });
    return priceView(row);
  });
}

export async function listPrices(context: RequestContext, filters: { limit?: number | undefined; plan_id?: string | undefined; status?: string | undefined } = {}) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "subscriptions:read", { organizationId: context.tenant.organizationId });
    const predicates = [eq(recurringPrices.organizationId, context.tenant.organizationId)];
    if (filters.plan_id) predicates.push(eq(recurringPrices.planId, filters.plan_id));
    if (filters.status) predicates.push(eq(recurringPrices.status, filters.status));
    const rows = await tx.select().from(recurringPrices).where(and(...predicates)).orderBy(desc(recurringPrices.createdAt)).limit(filters.limit ?? 20);
    return { data: rows.map(priceView), has_more: false, next_cursor: null };
  });
}

export async function archivePrice(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "subscriptions:write", { organizationId: context.tenant.organizationId });
    const [row] = await tx.update(recurringPrices).set({ status: "archived", archivedAt: new Date() }).where(and(eq(recurringPrices.organizationId, context.tenant.organizationId), eq(recurringPrices.id, id), eq(recurringPrices.status, "active"))).returning();
    if (!row) notFound();
    await recordDomainChange(tx, context, { action: "recurring_price.archived", aggregateType: "recurring_price", aggregateId: row.id, aggregateVersion: 1, data: { price_id: row.id } });
    return priceView(row);
  });
}
