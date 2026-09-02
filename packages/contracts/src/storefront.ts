import { z } from "zod";
import { idempotencyKeySchema } from "./commerce";

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const safeUrl = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => value.startsWith("https://"));
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const reservedStoreSlugs = [
  "api",
  "app",
  "checkout",
  "dashboard",
  "docs",
  "health",
  "pay",
  "public",
  "store",
  "www",
] as const;

export const storeAppearanceSchema = z
  .object({
    primary_color: hexColor.default("#1f6f50"),
    background_color: hexColor.default("#fffdf7"),
    text_color: hexColor.default("#17211d"),
    type_scale: z.enum(["compact", "comfortable", "large"]).default("comfortable"),
    radius: z.enum(["none", "small", "medium", "large"]).default("medium"),
  })
  .strict();

export const storeSlugSchema = slug.refine(
  (value) => !(reservedStoreSlugs as readonly string[]).includes(value),
  "This store slug is reserved.",
);

export const updateStoreSchema = z
  .object({
    public_name: z.string().trim().min(1).max(160).optional(),
    slug: storeSlugSchema.optional(),
    description: z.string().trim().max(2_000).nullable().optional(),
    logo_url: safeUrl.nullable().optional(),
    default_location_id: z.string().uuid().optional(),
    contact_email: z.string().trim().email().max(320).nullable().optional(),
    contact_phone: z.string().trim().min(3).max(40).nullable().optional(),
    appearance: storeAppearanceSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const publishStoreProductSchema = z
  .object({
    featured: z.boolean().default(false),
    display_order: z.number().int().min(0).max(1_000_000).default(0),
    image_url: safeUrl.nullable().optional(),
    image_alt: z.string().trim().max(240).nullable().optional(),
  })
  .strict();

export const storefrontListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  after: z.string().min(1).max(200).optional(),
});

export const storefrontCartSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            variant_id: z.string().uuid(),
            quantity: z.number().int().min(1).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    idempotency_key: idempotencyKeySchema,
  })
  .strict()
  .superRefine((value, context) => {
    const variants = new Set<string>();
    value.items.forEach((item, index) => {
      if (variants.has(item.variant_id))
        context.addIssue({
          code: "custom",
          path: ["items", index, "variant_id"],
          message: "Each variant may appear only once.",
        });
      variants.add(item.variant_id);
    });
  });

export type StoreAppearance = z.infer<typeof storeAppearanceSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type PublishStoreProductInput = z.infer<typeof publishStoreProductSchema>;
export type StorefrontCartInput = z.infer<typeof storefrontCartSchema>;
