import { z } from "zod";

export const subscriptionPlanStatusSchema = z.enum(["active", "archived"]);
export const recurringIntervalSchema = z.enum(["month", "year"]);
export const subscriptionStatusSchema = z.enum([
  "trialing",
  "active",
  "past_due",
  "paused",
  "cancelled",
  "ended",
]);

export const createSubscriptionPlanSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2_000).nullable().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export const createRecurringPriceSchema = z
  .object({
    plan_id: z.string().uuid(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    unit_amount: z.string().regex(/^[1-9][0-9]{0,18}$/),
    interval: recurringIntervalSchema,
    interval_count: z.literal(1).default(1),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export const subscriptionPlanListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: subscriptionPlanStatusSchema.optional(),
});

export const recurringPriceListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  plan_id: z.string().uuid().optional(),
  status: subscriptionPlanStatusSchema.optional(),
});

export type CreateSubscriptionPlanInput = z.infer<typeof createSubscriptionPlanSchema>;
export type CreateRecurringPriceInput = z.infer<typeof createRecurringPriceSchema>;
