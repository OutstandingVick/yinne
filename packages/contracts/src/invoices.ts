import { z } from "zod";
import { idempotencyKeySchema } from "./commerce";

const uuid = z.string().uuid();
const money = z.string().regex(/^[1-9][0-9]{0,18}$/);
const item = z
  .object({
    description: z.string().trim().min(1).max(500),
    quantity: z.number().int().min(1).max(10_000),
    unit_amount: money,
    product_id: uuid.nullable().optional(),
    variant_id: uuid.nullable().optional(),
  })
  .strict();

export const createInvoiceSchema = z
  .object({
    merchant_id: uuid,
    location_id: uuid.nullable().optional(),
    customer_id: uuid,
    currency: z.string().regex(/^[A-Z]{3}$/),
    due_at: z.coerce.date().nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
    items: z.array(item).min(1).max(100),
  })
  .strict();
export const updateInvoiceSchema = z
  .object({
    location_id: uuid.nullable().optional(),
    customer_id: uuid.optional(),
    due_at: z.coerce.date().nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
    items: z.array(item).min(1).max(100).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");
export const invoiceListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "open", "paid", "void"]).optional(),
  customer_id: uuid.optional(),
  location_id: uuid.optional(),
});
export const payInvoiceSchema = z.object({ idempotency_key: idempotencyKeySchema }).strict();

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
