import { z } from "zod";

const uuid = z.string().uuid();

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    default_currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const inviteMemberSchema = z
  .object({
    email: z.string().email().max(320),
    role: z.enum(["owner", "admin", "finance", "manager", "staff", "analyst", "developer"]),
    scope: z.object({
      type: z.enum(["organization", "merchant", "location"]),
      id: uuid.optional(),
    }),
  })
  .strict();

export const updateMemberRoleSchema = inviteMemberSchema.pick({ role: true, scope: true });

export const createApiKeySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    environment: z.enum(["test", "live"]),
    scopes: z.array(z.string().min(1)).min(1).max(50),
  })
  .strict();
