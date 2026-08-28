import { z } from "zod";

const uuid = z.string().uuid();
const currency = z.string().regex(/^[A-Z]{3}$/);
const minorAmount = z.string().regex(/^(0|[1-9][0-9]{0,18})$/);
const metadata = z
  .record(z.unknown())
  .refine((value) => JSON.stringify(value).length <= 16_384, "metadata is too large");
const statusFilter = <T extends [string, ...string[]]>(values: T) => z.enum(values).optional();

export const commerceListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  after: z.string().min(1).max(200).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const customerListQuerySchema = commerceListQuerySchema.extend({
  email: z.string().trim().email().max(320).optional(),
});
export const createCustomerSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().email().max(320).nullable().optional(),
    phone: z.string().trim().min(3).max(40).nullable().optional(),
    external_ref: z.string().trim().min(1).max(160).nullable().optional(),
    metadata: metadata.optional(),
  })
  .strict();
export const updateCustomerSchema = createCustomerSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const variantInputSchema = z
  .object({
    sku: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(160),
    unit_amount: minorAmount,
    currency,
    track_inventory: z.boolean().default(true),
  })
  .strict();
export const createProductSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(160),
    description: z.string().trim().max(10_000).nullable().optional(),
    metadata: metadata.optional(),
    variants: z.array(variantInputSchema).max(100).default([]),
  })
  .strict();
export const productListQuerySchema = commerceListQuerySchema.extend({
  status: statusFilter(["draft", "active", "archived"]),
});
export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(160)
      .optional(),
    description: z.string().trim().max(10_000).nullable().optional(),
    metadata: metadata.optional(),
    status: z.literal("active").optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");
export const updateVariantSchema = z
  .object({
    sku: z.string().trim().min(1).max(100).optional(),
    title: z.string().trim().min(1).max(160).optional(),
    unit_amount: minorAmount.optional(),
    currency: currency.optional(),
    track_inventory: z.boolean().optional(),
    status: z.literal("archived").optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const inventoryListQuerySchema = commerceListQuerySchema.extend({
  location_id: uuid.optional(),
  variant_id: uuid.optional(),
});
export const adjustInventorySchema = z
  .object({
    variant_id: uuid,
    location_id: uuid,
    delta: z.string().regex(/^-?[1-9][0-9]{0,18}$/),
    reason: z.string().trim().min(2).max(240),
  })
  .strict();

export const orderItemInputSchema = z
  .object({
    variant_id: uuid,
    quantity: z.number().int().min(1).max(10_000),
  })
  .strict();
export const createOrderSchema = z
  .object({
    merchant_id: uuid,
    location_id: uuid,
    customer_id: uuid.nullable().optional(),
    currency,
    items: z.array(orderItemInputSchema).min(1).max(100),
    metadata: metadata.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (seen.has(item.variant_id))
        context.addIssue({
          code: "custom",
          path: ["items", index, "variant_id"],
          message: "Each variant may appear only once.",
        });
      seen.add(item.variant_id);
    }
  });
export const orderListQuerySchema = commerceListQuerySchema.extend({
  location_id: uuid.optional(),
  customer_id: uuid.optional(),
  financial_status: statusFilter(["unpaid", "paid", "partially_refunded", "refunded"]),
  fulfilment_status: statusFilter(["unfulfilled", "fulfilled", "cancelled"]),
});

export const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(255)
  .regex(/^[\x21-\x7E]+$/);

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
