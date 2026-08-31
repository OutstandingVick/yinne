import { z } from "zod";
import { commerceListQuerySchema } from "./commerce";

const uuid = z.string().uuid();
const metadata = z
  .record(z.unknown())
  .refine((value) => JSON.stringify(value).length <= 16_384, "metadata is too large");
const minorAmount = z.string().regex(/^[1-9][0-9]{0,18}$/);

export const mockScenarioSchema = z.enum([
  "success",
  "failure:declined",
  "pending:then_success",
  "pending:then_failure",
  "timeout:then_success",
]);
export const createPaymentSchema = z
  .object({
    order_id: uuid,
    provider_account_id: uuid.optional(),
    confirmation: z
      .object({ mock_scenario: mockScenarioSchema.default("success") })
      .strict()
      .default({ mock_scenario: "success" }),
    metadata: metadata.optional(),
  })
  .strict();
export const paymentListQuerySchema = commerceListQuerySchema.extend({
  status: z
    .enum([
      "created",
      "pending",
      "succeeded",
      "failed",
      "cancelled",
      "partially_refunded",
      "refunded",
    ])
    .optional(),
  order_id: uuid.optional(),
  customer_id: uuid.optional(),
  provider_account_id: uuid.optional(),
});
export const createRefundSchema = z
  .object({
    payment_id: uuid,
    amount: minorAmount.optional(),
    reason: z.string().trim().min(2).max(240),
    confirmation: z
      .object({
        mock_scenario: z.enum(["refund_success", "refund_failure"]).default("refund_success"),
      })
      .strict()
      .default({ mock_scenario: "refund_success" }),
    metadata: metadata.optional(),
  })
  .strict();
export const refundListQuerySchema = commerceListQuerySchema.extend({
  payment_id: uuid.optional(),
  status: z.enum(["created", "pending", "succeeded", "failed"]).optional(),
});
export const transactionListQuerySchema = commerceListQuerySchema.extend({
  payment_id: uuid.optional(),
  kind: z.enum(["charge", "refund"]).optional(),
});
export const providerAccountListQuerySchema = commerceListQuerySchema.extend({
  status: z.enum(["enabled", "disabled"]).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
