import { z } from "zod";

export const analyticsGranularitySchema = z.enum(["day", "week", "month"]);
export const analyticsReportSchema = z.enum([
  "overview",
  "sales",
  "payments",
  "customers",
  "subscriptions",
  "invoices",
  "locations",
  "products",
]);

export const analyticsQuerySchema = z
  .object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
    timezone: z.string().trim().min(1).max(100).default("Africa/Lagos"),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    location_id: z.string().uuid().optional(),
    granularity: analyticsGranularitySchema.default("day"),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict()
  .superRefine((value, context) => {
    const from = new Date(value.from);
    const to = new Date(value.to);
    if (to <= from) {
      context.addIssue({ code: "custom", path: ["to"], message: "to must be after from" });
    }
    if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1_000) {
      context.addIssue({ code: "custom", path: ["to"], message: "range cannot exceed 366 days" });
    }
    try {
      new Intl.DateTimeFormat("en", { timeZone: value.timezone });
    } catch {
      context.addIssue({ code: "custom", path: ["timezone"], message: "invalid IANA timezone" });
    }
  });

export const moneyPartitionSchema = z.record(z.string().regex(/^-?[0-9]+$/));
export const analyticsRatioSchema = z.object({
  numerator: z.string().regex(/^-?[0-9]+$/),
  denominator: z.string().regex(/^[0-9]+$/),
  value: z.string().nullable(),
  reason: z.enum(["not_comparable", "insufficient_data"]).nullable(),
});

export type AnalyticsGranularity = z.infer<typeof analyticsGranularitySchema>;
export type AnalyticsReport = z.infer<typeof analyticsReportSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type MoneyPartition = z.infer<typeof moneyPartitionSchema>;
export type AnalyticsRatio = z.infer<typeof analyticsRatioSchema>;
