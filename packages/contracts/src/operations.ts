import { z } from "zod";

const locationType = z.enum([
  "branch",
  "store",
  "restaurant",
  "office",
  "warehouse",
  "pop_up",
  "agent",
]);
const locationCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_-]{1,31}$/);

export const locationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  type: locationType.optional(),
});
export const createLocationSchema = z
  .object({
    merchant_id: z.string().uuid(),
    name: z.string().trim().min(1).max(160),
    code: locationCode,
    type: locationType,
    timezone: z.string().trim().min(1).max(100),
    address: z
      .object({
        line1: z.string().trim().max(240).optional(),
        city: z.string().trim().max(120).optional(),
        region: z.string().trim().max(120).optional(),
        country: z.string().trim().length(2).toUpperCase().optional(),
      })
      .strict()
      .default({}),
  })
  .strict();
export const updateLocationSchema = createLocationSchema
  .omit({ merchant_id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");
export const employeeListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  location_id: z.string().uuid().optional(),
});
export const assignEmployeeLocationSchema = z
  .object({
    location_id: z.string().uuid(),
    role: z.enum(["admin", "finance", "manager", "staff", "analyst", "developer"]),
  })
  .strict();

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type AssignEmployeeLocationInput = z.infer<typeof assignEmployeeLocationSchema>;
