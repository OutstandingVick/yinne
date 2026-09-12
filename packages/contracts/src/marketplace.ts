import { z } from "zod";
import { idempotencyKeySchema } from "./commerce";

export const marketplaceSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
export const marketplaceListingStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected",
  "suspended",
  "archived",
]);
export const marketplaceProfileSchema = z
  .object({
    public_name: z.string().trim().min(1).max(160),
    slug: marketplaceSlugSchema,
    description: z.string().trim().max(2_000).nullable().optional(),
    logo_url: z.string().url().startsWith("https://").max(2_048).nullable().optional(),
    terms_accepted: z.boolean(),
    contact_verified: z.boolean(),
  })
  .strict();
export const marketplaceListingInputSchema = z
  .object({
    product_id: z.string().uuid(),
    category_slug: marketplaceSlugSchema,
    title: z.string().trim().min(1).max(160).nullable().optional(),
    description: z.string().trim().max(2_000).nullable().optional(),
  })
  .strict();
export const marketplaceModerationSchema = z
  .object({
    reason_code: z
      .string()
      .trim()
      .regex(/^[a-z0-9_]+$/)
      .max(80),
    explanation: z.string().trim().min(1).max(1_000),
  })
  .strict();
export const marketplaceSearchSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    category: marketplaceSlugSchema.optional(),
    merchant: marketplaceSlugSchema.optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    min_amount: z.coerce.bigint().nonnegative().optional(),
    max_amount: z.coerce.bigint().positive().optional(),
    available: z.coerce.boolean().default(true),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine(
    (v) => v.min_amount === undefined || v.max_amount === undefined || v.min_amount <= v.max_amount,
    "Invalid price range.",
  );
export const marketplaceCheckoutSchema = z
  .object({
    variant_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
    idempotency_key: idempotencyKeySchema,
  })
  .strict();

export type MarketplaceProfileInput = z.infer<typeof marketplaceProfileSchema>;
export type MarketplaceListingInput = z.infer<typeof marketplaceListingInputSchema>;
export type MarketplaceModerationInput = z.infer<typeof marketplaceModerationSchema>;
export type MarketplaceSearchInput = z.infer<typeof marketplaceSearchSchema>;
export type MarketplaceCheckoutInput = z.infer<typeof marketplaceCheckoutSchema>;
