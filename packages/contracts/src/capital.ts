import { z } from "zod";

export const capitalModelVersionSchema = z.literal("rules-1");
export const capitalProfileStatusSchema = z.enum(["scored", "insufficient_data"]);
export const capitalBandSchema = z.enum(["limited", "developing", "stable", "highly_stable"]);
export const capitalDataSufficiencySchema = z.enum([
  "insufficient",
  "limited",
  "sufficient",
  "strong",
]);
export const capitalSignalStatusSchema = z.enum(["available", "not_applicable", "insufficient"]);

export const capitalSignalSchema = z.object({
  key: z.string(),
  dimension: z.string(),
  status: capitalSignalStatusSchema,
  raw: z.record(z.unknown()),
  normalized_score: z.number().min(0).max(100).nullable(),
  base_weight: z.number().min(0).max(100),
  effective_weight: z.number().min(0).max(100),
  contribution: z.number().min(0).max(100),
  reason: z.string(),
  explanation: z.string(),
});

export const capitalDimensionSchema = z.object({
  key: z.string(),
  label: z.string(),
  score: z.number().min(0).max(100),
  effective_weight: z.number().min(0).max(100),
  contribution: z.number().min(0).max(100),
});

export const capitalScoreChangeSchema = z.object({
  delta: z.number().int(),
  previous_profile_id: z.string().uuid(),
  contributors: z.array(
    z.object({ key: z.string(), delta: z.number(), direction: z.enum(["up", "down"]) }),
  ),
});

export const capitalProfileSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  environment: z.enum(["test", "live"]),
  status: capitalProfileStatusSchema,
  model_version: capitalModelVersionSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  score: z.number().int().min(0).max(100).nullable(),
  band: capitalBandSchema.nullable(),
  data_sufficiency: capitalDataSufficiencySchema,
  calculated_at: z.string().datetime(),
  lookback_start: z.string().datetime(),
  lookback_end: z.string().datetime(),
  dimensions: z.array(capitalDimensionSchema),
  signals: z.array(capitalSignalSchema),
  strengths: z.array(z.string()),
  watch_areas: z.array(z.string()),
  missing_requirements: z.array(z.string()),
  score_change: capitalScoreChangeSchema.nullable(),
  limitations: z.array(z.string()),
});

export const capitalHistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const capitalRecalculateSchema = z
  .object({
    as_of: z.string().datetime({ offset: true }).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
  })
  .strict();

export type CapitalProfile = z.infer<typeof capitalProfileSchema>;
export type CapitalBand = z.infer<typeof capitalBandSchema>;
export type CapitalDataSufficiency = z.infer<typeof capitalDataSufficiencySchema>;
export type CapitalSignal = z.infer<typeof capitalSignalSchema>;
export type CapitalDimension = z.infer<typeof capitalDimensionSchema>;
export type CapitalScoreChange = z.infer<typeof capitalScoreChangeSchema>;
export type CapitalRecalculateInput = z.infer<typeof capitalRecalculateSchema>;
