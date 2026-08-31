import { z } from "zod";
import { commerceListQuerySchema } from "./commerce";

const uuid = z.string().uuid();
const currency = z.string().regex(/^[A-Z]{3}$/);
const positiveAmount = z.string().regex(/^[1-9][0-9]{0,18}$/);
const metadata = z
  .record(z.unknown())
  .refine((value) => JSON.stringify(value).length <= 16_384, "metadata is too large");
const capture = z
  .object({
    name: z.boolean().default(true),
    email: z.boolean().default(true),
    phone: z.boolean().default(false),
  })
  .strict();
const safeUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
    );
  }, "URL must use HTTPS");

export const checkoutItemSchema = z
  .object({ variant_id: uuid, quantity: z.number().int().min(1).max(10_000) })
  .strict();
export const createCheckoutSessionSchema = z
  .object({
    merchant_id: uuid,
    location_id: uuid,
    customer_id: uuid.nullable().optional(),
    currency,
    items: z.array(checkoutItemSchema).min(1).max(100),
    customer_capture: capture.default({ name: true, email: true, phone: false }),
    success_url: safeUrl.optional(),
    cancel_url: safeUrl.optional(),
    expires_in_seconds: z.number().int().min(300).max(86_400).default(1_800),
    metadata: metadata.optional(),
  })
  .strict();

export const checkoutListQuerySchema = commerceListQuerySchema.extend({
  status: z.enum(["open", "processing", "completed", "expired", "cancelled"]).optional(),
  payment_link_id: uuid.optional(),
});
export const confirmCheckoutSchema = z
  .object({
    customer: z
      .object({
        name: z.string().trim().min(1).max(160).optional(),
        email: z.string().trim().email().max(320).optional(),
        phone: z.string().trim().min(3).max(40).optional(),
      })
      .strict()
      .default({}),
    confirmation: z
      .object({
        mock_scenario: z
          .enum([
            "success",
            "failure:declined",
            "pending:then_success",
            "pending:then_failure",
            "timeout:then_success",
          ])
          .default("success"),
      })
      .strict()
      .default({ mock_scenario: "success" }),
  })
  .strict();

const paymentLinkBase = z.object({
  merchant_id: uuid,
  location_id: uuid,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).nullable().optional(),
  currency,
  customer_capture: capture.default({ name: true, email: true, phone: false }),
  usage_limit: z.number().int().min(1).max(1_000_000).nullable().optional(),
  starts_at: z.coerce.date().nullable().optional(),
  expires_at: z.coerce.date().nullable().optional(),
  metadata: metadata.optional(),
});
export const createPaymentLinkSchema = z
  .discriminatedUnion("kind", [
    paymentLinkBase
      .extend({
        kind: z.literal("product"),
        variant_id: uuid,
        quantity: z.number().int().min(1).max(10_000).default(1),
      })
      .strict(),
    paymentLinkBase.extend({ kind: z.literal("fixed"), amount: positiveAmount }).strict(),
    paymentLinkBase
      .extend({
        kind: z.literal("flexible"),
        minimum_amount: positiveAmount,
        maximum_amount: positiveAmount.nullable().optional(),
      })
      .strict(),
  ])
  .superRefine((value, context) => {
    if (value.expires_at && value.starts_at && value.expires_at <= value.starts_at)
      context.addIssue({
        code: "custom",
        path: ["expires_at"],
        message: "expires_at must be after starts_at",
      });
    if (
      value.kind === "flexible" &&
      value.maximum_amount &&
      BigInt(value.maximum_amount) < BigInt(value.minimum_amount)
    )
      context.addIssue({
        code: "custom",
        path: ["maximum_amount"],
        message: "maximum_amount must be at least minimum_amount",
      });
  });
export const updatePaymentLinkSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2_000).nullable().optional(),
    customer_capture: capture.optional(),
    usage_limit: z.number().int().min(1).max(1_000_000).nullable().optional(),
    starts_at: z.coerce.date().nullable().optional(),
    expires_at: z.coerce.date().nullable().optional(),
    metadata: metadata.optional(),
    version: z.number().int().min(1),
  })
  .strict();
export const paymentLinkListQuerySchema = commerceListQuerySchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
  kind: z.enum(["product", "fixed", "flexible"]).optional(),
});
export const openPaymentLinkSchema = z
  .object({ amount: positiveAmount.optional(), idempotency_key: z.string().min(16).max(255) })
  .strict();

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
export type ConfirmCheckoutInput = z.infer<typeof confirmCheckoutSchema>;
export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>;
export type UpdatePaymentLinkInput = z.infer<typeof updatePaymentLinkSchema>;
