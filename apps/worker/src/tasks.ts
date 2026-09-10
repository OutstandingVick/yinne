import { and, eq } from "drizzle-orm";
import type { TaskList } from "graphile-worker";
import { z } from "zod";
import { outboxMessages, withTenantTransaction } from "@yinne/database";
import { processDueSubscriptions } from "@yinne/subscriptions";
import { overviewReport } from "@yinne/analytics";
import { calculateCapitalProfile } from "@yinne/capital";
const payloadSchema = z.object({
  organizationId: z.string().uuid(),
  environment: z.enum(["test", "live"]),
  outboxMessageId: z.string().uuid(),
});
export const subscriptionBillingPayloadSchema = z.object({
  organizationId: z.string().uuid(),
  environment: z.enum(["test", "live"]),
  dueAt: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export const analyticsRefreshPayloadSchema = z.object({
  organizationId: z.string().uuid(),
  environment: z.enum(["test", "live"]),
  from: z.coerce.date(),
  to: z.coerce.date(),
  timezone: z.string().min(1).max(100).default("Africa/Lagos"),
});
export const capitalRecalculatePayloadSchema = z.object({
  organizationId: z.string().uuid(),
  environment: z.enum(["test", "live"]),
  asOf: z.coerce.date().optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
});

export const taskList: TaskList = {
  capital_recalculate: async (rawPayload, helpers) => {
    const payload = capitalRecalculatePayloadSchema.parse(rawPayload);
    const profile = await calculateCapitalProfile(
      {
        tenant: { organizationId: payload.organizationId, environment: payload.environment },
        principal: {
          type: "system",
          id: "00000000-0000-7000-8000-000000000009",
          organizationId: payload.organizationId,
          environment: payload.environment,
        },
        requestId: helpers.job.id.toString(),
      },
      payload.asOf ?? new Date(),
      payload.currency,
    );
    helpers.logger.info(
      `Calculated ${profile.model_version} capital profile ${profile.id} with status ${profile.status}.`,
    );
  },
  analytics_refresh: async (rawPayload, helpers) => {
    const payload = analyticsRefreshPayloadSchema.parse(rawPayload);
    const report = await overviewReport(
      {
        tenant: { organizationId: payload.organizationId, environment: payload.environment },
        principal: {
          type: "system",
          id: "00000000-0000-7000-8000-000000000008",
          organizationId: payload.organizationId,
          environment: payload.environment,
        },
        requestId: helpers.job.id.toString(),
      },
      {
        from: payload.from.toISOString(),
        to: payload.to.toISOString(),
        timezone: payload.timezone,
        granularity: "day",
        limit: 10,
      },
    );
    helpers.logger.info(
      `Refreshed live analytics through ${report.meta.freshness.as_of}; no materialized state required.`,
    );
  },
  subscription_billing: async (rawPayload, helpers) => {
    const payload = subscriptionBillingPayloadSchema.parse(rawPayload);
    const results = await processDueSubscriptions(
      {
        tenant: { organizationId: payload.organizationId, environment: payload.environment },
        principal: {
          type: "system",
          id: "00000000-0000-7000-8000-000000000007",
          organizationId: payload.organizationId,
          environment: payload.environment,
        },
        requestId: helpers.job.id.toString(),
      },
      payload.dueAt ?? new Date(),
      payload.limit,
    );
    helpers.logger.info(`Processed ${results.length} due subscriptions.`);
  },
  outbox_dispatch: async (rawPayload, helpers) => {
    const payload = payloadSchema.parse(rawPayload);
    await withTenantTransaction(
      { organizationId: payload.organizationId, environment: payload.environment },
      async (tx) => {
        const [message] = await tx
          .update(outboxMessages)
          .set({
            state: "processed",
            processedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
          })
          .where(
            and(
              eq(outboxMessages.organizationId, payload.organizationId),
              eq(outboxMessages.id, payload.outboxMessageId),
              eq(outboxMessages.state, "processing"),
            ),
          )
          .returning({ id: outboxMessages.id, topic: outboxMessages.topic });
        if (!message)
          throw new Error(
            "Outbox message is missing, belongs to another tenant, or is not processing.",
          );
        helpers.logger.info(
          "Dispatched foundational outbox message " + message.id + " on " + message.topic,
        );
      },
    );
  },
};

export { payloadSchema as outboxDispatchPayloadSchema };
