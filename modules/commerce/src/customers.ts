import { and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import {
  hasPermission,
  recordDomainChange,
  requirePermission,
  type RequestContext,
} from "@yinne/application";
import type { CreateCustomerInput, UpdateCustomerInput } from "@yinne/contracts";
import { ApiError } from "@yinne/contracts";
import { customers, withTenantTransaction } from "@yinne/database";
import { decodeCursor, isUniqueViolation, notFound, paged } from "./helpers";

function view(row: typeof customers.$inferSelect, pii: boolean) {
  return {
    id: row.id,
    name: row.name,
    email: pii ? row.email : null,
    phone: pii ? row.phone : null,
    external_ref: row.externalRef,
    metadata: row.metadata,
    version: row.version,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    pii_redacted: !pii,
  };
}

export async function listCustomers(
  context: RequestContext,
  query: {
    limit: number;
    after?: string | undefined;
    search?: string | undefined;
    email?: string | undefined;
  },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "customers:read", {
      organizationId: context.tenant.organizationId,
    });
    const pii = await hasPermission(tx, context.principal, "customers:pii_read", {
      organizationId: context.tenant.organizationId,
    });
    const cursor = decodeCursor(query.after);
    const conditions = [eq(customers.organizationId, context.tenant.organizationId)];
    if (cursor)
      conditions.push(
        or(
          lt(customers.createdAt, cursor.createdAt),
          and(eq(customers.createdAt, cursor.createdAt), lt(customers.id, cursor.id)),
        )!,
      );
    if (query.search)
      conditions.push(
        or(
          ilike(customers.name, `%${query.search}%`),
          ilike(customers.email, `%${query.search}%`),
          ilike(customers.externalRef, `%${query.search}%`),
        )!,
      );
    if (query.email) conditions.push(eq(customers.email, query.email.trim().toLowerCase()));
    const rows = await tx
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.createdAt), desc(customers.id))
      .limit(query.limit + 1);
    const result = paged(rows, query.limit);
    return { ...result, data: result.data.map((row) => view(row, pii)) };
  });
}

export async function getCustomer(context: RequestContext, customerId: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "customers:read", {
      organizationId: context.tenant.organizationId,
    });
    const [row] = await tx
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, context.tenant.organizationId),
          eq(customers.id, customerId),
        ),
      )
      .limit(1);
    if (!row) notFound();
    return view(
      row,
      await hasPermission(tx, context.principal, "customers:pii_read", {
        organizationId: context.tenant.organizationId,
      }),
    );
  });
}

export async function createCustomer(context: RequestContext, input: CreateCustomerInput) {
  try {
    return await withTenantTransaction(context.tenant, async (tx) => {
      await requirePermission(tx, context.principal, "customers:write", {
        organizationId: context.tenant.organizationId,
      });
      const [row] = await tx
        .insert(customers)
        .values({
          organizationId: context.tenant.organizationId,
          name: input.name,
          email: input.email?.trim().toLowerCase() ?? null,
          phone: input.phone ?? null,
          externalRef: input.external_ref ?? null,
          metadata: input.metadata ?? {},
        })
        .returning();
      if (!row)
        throw new ApiError(
          500,
          "internal_error",
          "customer_create_failed",
          "The customer could not be created.",
        );
      await recordDomainChange(tx, context, {
        action: "customer.created",
        aggregateType: "customer",
        aggregateId: row.id,
        aggregateVersion: row.version,
        data: { customer_id: row.id },
      });
      return view(row, true);
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new ApiError(
        409,
        "conflict",
        "external_ref_conflict",
        "The external reference is already in use.",
        "external_ref",
      );
    throw error;
  }
}

export async function updateCustomer(
  context: RequestContext,
  customerId: string,
  input: UpdateCustomerInput,
) {
  try {
    return await withTenantTransaction(context.tenant, async (tx) => {
      await requirePermission(tx, context.principal, "customers:write", {
        organizationId: context.tenant.organizationId,
      });
      const [row] = await tx
        .update(customers)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.email !== undefined
            ? { email: input.email?.trim().toLowerCase() ?? null }
            : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.external_ref !== undefined ? { externalRef: input.external_ref } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
          version: sql`${customers.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(customers.organizationId, context.tenant.organizationId),
            eq(customers.id, customerId),
          ),
        )
        .returning();
      if (!row) notFound();
      await recordDomainChange(tx, context, {
        action: "customer.updated",
        aggregateType: "customer",
        aggregateId: row.id,
        aggregateVersion: row.version,
        data: { customer_id: row.id, changed_fields: Object.keys(input) },
      });
      return view(row, true);
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new ApiError(
        409,
        "conflict",
        "external_ref_conflict",
        "The external reference is already in use.",
        "external_ref",
      );
    throw error;
  }
}
