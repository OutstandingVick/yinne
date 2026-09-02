import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { recordDomainChange, requirePermission, type RequestContext } from "@yinne/application";
import { principalId } from "@yinne/auth";
import { createCollectionCheckoutSession } from "@yinne/checkout";
import type { CreateInvoiceInput, UpdateInvoiceInput } from "@yinne/contracts";
import { ApiError } from "@yinne/contracts";
import { createId } from "@yinne/core";
import {
  checkoutSessions,
  customers,
  database,
  idempotencyRecords,
  invoiceCounters,
  invoiceItems,
  invoices,
  locations,
  merchants,
  payments,
  withTenantTransaction,
  type TenantTransaction,
} from "@yinne/database";
import {
  assertInvoiceTransition,
  displayInvoiceStatus,
  invoiceTotal,
  type InvoiceStatus,
} from "./state";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function notFound(): never {
  throw new ApiError(
    404,
    "invalid_request",
    "resource_not_found",
    "The requested resource does not exist.",
  );
}
async function itemsFor(tx: TenantTransaction, organizationId: string, invoiceId: string) {
  return tx
    .select()
    .from(invoiceItems)
    .where(
      and(eq(invoiceItems.organizationId, organizationId), eq(invoiceItems.invoiceId, invoiceId)),
    )
    .orderBy(invoiceItems.createdAt);
}
const itemView = (row: typeof invoiceItems.$inferSelect) => ({
  id: row.id,
  description: row.description,
  quantity: row.quantity,
  unit_amount: row.unitAmount.toString(),
  total_amount: row.totalAmount.toString(),
  currency: row.currency,
  product_id: row.productId,
  variant_id: row.variantId,
});
function invoiceView(
  row: typeof invoices.$inferSelect,
  items: (typeof invoiceItems.$inferSelect)[],
  token?: string,
) {
  return {
    id: row.id,
    merchant_id: row.merchantId,
    location_id: row.locationId,
    customer_id: row.customerId,
    invoice_number: row.number,
    status: row.status,
    display_status: displayInvoiceStatus(row.status as InvoiceStatus, row.dueAt),
    currency: row.currency,
    subtotal_amount: row.subtotalAmount.toString(),
    total_amount: row.totalAmount.toString(),
    due_at: row.dueAt?.toISOString() ?? null,
    issued_at: row.issuedAt?.toISOString() ?? null,
    paid_at: row.paidAt?.toISOString() ?? null,
    checkout_session_id: row.checkoutSessionId,
    order_id: row.orderId,
    payment_id: row.paymentId,
    version: row.version,
    items: items.map(itemView),
    ...(token ? { invoice_url: `/invoice/${token}` } : {}),
  };
}
async function validateRefs(
  tx: TenantTransaction,
  context: RequestContext,
  input: { merchant_id: string; customer_id: string; location_id?: string | null },
) {
  const [merchant] = await tx
    .select()
    .from(merchants)
    .where(
      and(
        eq(merchants.organizationId, context.tenant.organizationId),
        eq(merchants.id, input.merchant_id),
        eq(merchants.status, "active"),
      ),
    )
    .limit(1);
  const [customer] = await tx
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, context.tenant.organizationId),
        eq(customers.id, input.customer_id),
      ),
    )
    .limit(1);
  const location = input.location_id
    ? (
        await tx
          .select()
          .from(locations)
          .where(
            and(
              eq(locations.organizationId, context.tenant.organizationId),
              eq(locations.id, input.location_id),
              eq(locations.merchantId, input.merchant_id),
              eq(locations.status, "active"),
            ),
          )
          .limit(1)
      )[0]
    : null;
  if (!merchant || !customer || (input.location_id && !location)) notFound();
}
export async function createInvoice(
  context: RequestContext,
  input: CreateInvoiceInput,
  key: string,
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "invoices:write", {
      organizationId: context.tenant.organizationId,
      merchantId: input.merchant_id,
      ...(input.location_id ? { locationId: input.location_id } : {}),
    });
    const actor = principalId(context.principal);
    const keyDigest = digest(key);
    const requestDigest = digest(JSON.stringify(input));
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${actor}:invoice:${keyDigest}`}, 0))`,
    );
    const [existing] = await tx
      .select()
      .from(idempotencyRecords)
      .where(
        and(
          eq(idempotencyRecords.organizationId, context.tenant.organizationId),
          eq(idempotencyRecords.principalId, actor),
          eq(idempotencyRecords.operation, "invoice.create"),
          eq(idempotencyRecords.environment, context.tenant.environment),
          eq(idempotencyRecords.keyDigest, keyDigest),
        ),
      )
      .limit(1);
    if (existing) {
      if (existing.requestDigest !== requestDigest)
        throw new ApiError(
          409,
          "conflict",
          "idempotency_conflict",
          "Idempotency key was already used with different input.",
        );
      return existing.responseBody!.invoice;
    }
    await validateRefs(tx, context, input);
    const total = invoiceTotal(input.items);
    const [row] = await tx
      .insert(invoices)
      .values({
        organizationId: context.tenant.organizationId,
        environment: context.tenant.environment,
        merchantId: input.merchant_id,
        locationId: input.location_id ?? null,
        customerId: input.customer_id,
        currency: input.currency,
        subtotalAmount: total,
        totalAmount: total,
        dueAt: input.due_at ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    if (!row)
      throw new ApiError(
        500,
        "internal_error",
        "invoice_create_failed",
        "Invoice could not be created.",
      );
    const lines = await tx
      .insert(invoiceItems)
      .values(
        input.items.map((item) => ({
          organizationId: context.tenant.organizationId,
          invoiceId: row.id,
          description: item.description,
          quantity: item.quantity,
          unitAmount: BigInt(item.unit_amount),
          totalAmount: BigInt(item.unit_amount) * BigInt(item.quantity),
          currency: input.currency,
          productId: item.product_id ?? null,
          variantId: item.variant_id ?? null,
        })),
      )
      .returning();
    await recordDomainChange(tx, context, {
      action: "invoice.created",
      aggregateType: "invoice",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: { invoice_id: row.id, amount: total.toString(), currency: row.currency },
    });
    const response = invoiceView(row, lines);
    await tx.insert(idempotencyRecords).values({
      organizationId: context.tenant.organizationId,
      principalId: actor,
      operation: "invoice.create",
      environment: context.tenant.environment,
      keyDigest,
      requestDigest,
      responseStatus: 201,
      responseBody: { invoice: response },
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    return response;
  });
}
export async function listInvoices(
  context: RequestContext,
  filters: { limit?: number; status?: string; customer_id?: string; location_id?: string } = {},
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "invoices:read", {
      organizationId: context.tenant.organizationId,
      ...(filters.location_id ? { locationId: filters.location_id } : {}),
    });
    const predicates = [
      eq(invoices.organizationId, context.tenant.organizationId),
      eq(invoices.environment, context.tenant.environment),
    ];
    if (filters.status) predicates.push(eq(invoices.status, filters.status));
    if (filters.customer_id) predicates.push(eq(invoices.customerId, filters.customer_id));
    if (filters.location_id) predicates.push(eq(invoices.locationId, filters.location_id));
    const rows = await tx
      .select()
      .from(invoices)
      .where(and(...predicates))
      .orderBy(desc(invoices.createdAt))
      .limit(filters.limit ?? 20);
    return {
      data: await Promise.all(
        rows.map(async (row) =>
          invoiceView(row, await itemsFor(tx, context.tenant.organizationId, row.id)),
        ),
      ),
      has_more: false,
      next_cursor: null,
    };
  });
}
export async function getInvoice(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const [row] = await tx
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, context.tenant.organizationId),
          eq(invoices.environment, context.tenant.environment),
          eq(invoices.id, id),
        ),
      )
      .limit(1);
    if (!row) notFound();
    await requirePermission(tx, context.principal, "invoices:read", {
      organizationId: context.tenant.organizationId,
      merchantId: row.merchantId,
      ...(row.locationId ? { locationId: row.locationId } : {}),
    });
    return invoiceView(row, await itemsFor(tx, context.tenant.organizationId, id));
  });
}
export async function issueInvoice(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "invoices:issue", {
      organizationId: context.tenant.organizationId,
    });
    const [current] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .for("update")
      .limit(1);
    if (!current) notFound();
    assertInvoiceTransition(current.status as InvoiceStatus, "open");
    const year = new Date().getUTCFullYear();
    const [counter] = await tx
      .insert(invoiceCounters)
      .values({
        organizationId: context.tenant.organizationId,
        environment: context.tenant.environment,
        year,
        nextValue: 2,
      })
      .onConflictDoUpdate({
        target: [invoiceCounters.organizationId, invoiceCounters.environment, invoiceCounters.year],
        set: { nextValue: sql`${invoiceCounters.nextValue} + 1` },
      })
      .returning();
    const sequence = (counter?.nextValue ?? 2) - 1;
    const token = randomBytes(32).toString("base64url");
    const [row] = await tx
      .update(invoices)
      .set({
        status: "open",
        number: `INV-${year}-${String(sequence).padStart(6, "0")}`,
        publicTokenDigest: digest(token),
        publicTokenPrefix: token.slice(0, 8),
        issuedAt: new Date(),
        version: sql`${invoices.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();
    if (!row) notFound();
    await recordDomainChange(tx, context, {
      action: "invoice.issued",
      aggregateType: "invoice",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: {
        invoice_id: row.id,
        invoice_number: row.number,
        amount: row.totalAmount.toString(),
        currency: row.currency,
      },
    });
    return invoiceView(row, await itemsFor(tx, context.tenant.organizationId, id), token);
  });
}
export async function voidInvoice(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "invoices:void", {
      organizationId: context.tenant.organizationId,
    });
    const [current] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .for("update")
      .limit(1);
    if (!current) notFound();
    assertInvoiceTransition(current.status as InvoiceStatus, "void");
    const [row] = await tx
      .update(invoices)
      .set({
        status: "void",
        voidedAt: new Date(),
        publicTokenDigest: null,
        publicTokenPrefix: null,
        version: sql`${invoices.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning();
    if (!row) notFound();
    await recordDomainChange(tx, context, {
      action: "invoice.voided",
      aggregateType: "invoice",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: { invoice_id: row.id, invoice_number: row.number },
    });
    return invoiceView(row, await itemsFor(tx, context.tenant.organizationId, id));
  });
}

function systemContext(organizationId: string, environment: "test" | "live"): RequestContext {
  return {
    tenant: { organizationId, environment },
    principal: {
      type: "system",
      id: "00000000-0000-7000-8000-000000000006",
      organizationId,
      environment,
    },
    requestId: createId(),
  };
}
async function resolvePublicInvoice(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const rows = (await database.execute(
    sql`select * from yinne_resolve_invoice_token(${digest(token)})`,
  )) as unknown as { organization_id: string; environment: "test" | "live"; resource_id: string }[];
  const resolved = rows[0];
  if (!resolved) notFound();
  return {
    context: systemContext(resolved.organization_id, resolved.environment),
    id: resolved.resource_id,
  };
}
export async function getPublicInvoice(token: string) {
  const resolved = await resolvePublicInvoice(token);
  return withTenantTransaction(resolved.context.tenant, async (tx) => {
    const [row] = await tx.select().from(invoices).where(eq(invoices.id, resolved.id)).limit(1);
    if (!row || !["open", "paid"].includes(row.status)) notFound();
    const [merchant] = await tx
      .select({ name: merchants.displayName })
      .from(merchants)
      .where(eq(merchants.id, row.merchantId))
      .limit(1);
    return {
      merchant_name: merchant?.name ?? "Merchant",
      invoice_number: row.number,
      status: displayInvoiceStatus(row.status as InvoiceStatus, row.dueAt),
      currency: row.currency,
      total_amount: row.totalAmount.toString(),
      due_at: row.dueAt?.toISOString() ?? null,
      issued_at: row.issuedAt?.toISOString() ?? null,
      paid_at: row.paidAt?.toISOString() ?? null,
      items: (await itemsFor(tx, resolved.context.tenant.organizationId, row.id)).map(itemView),
      payable: row.status === "open",
    };
  });
}
export async function payPublicInvoice(token: string, idempotencyKey: string, origin?: string) {
  const resolved = await resolvePublicInvoice(token);
  const row = await withTenantTransaction(resolved.context.tenant, async (tx) => {
    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, resolved.id))
      .for("update")
      .limit(1);
    if (!invoice || invoice.status !== "open")
      throw new ApiError(409, "conflict", "invoice_not_payable", "Invoice is not payable.");
    if (!invoice.locationId)
      throw new ApiError(
        409,
        "conflict",
        "invoice_location_required",
        "Invoice needs an active Location before payment.",
      );
    if (invoice.checkoutSessionId) {
      const [session] = await tx
        .select()
        .from(checkoutSessions)
        .where(eq(checkoutSessions.id, invoice.checkoutSessionId))
        .limit(1);
      if (
        session &&
        ["open", "processing", "completed"].includes(session.status) &&
        session.expiresAt > new Date()
      )
        return { invoice, existing: true };
    }
    return { invoice, existing: false };
  });
  if (row.existing && row.invoice.checkoutSessionId)
    return withTenantTransaction(resolved.context.tenant, async (tx) => {
      const [session] = await tx
        .select()
        .from(checkoutSessions)
        .where(eq(checkoutSessions.id, row.invoice.checkoutSessionId!))
        .limit(1);
      return session ? { id: session.id, status: session.status, checkout_url: null } : notFound();
    });
  const checkout = await createCollectionCheckoutSession(
    resolved.context,
    {
      merchant_id: row.invoice.merchantId,
      location_id: row.invoice.locationId!,
      currency: row.invoice.currency,
      description: `Invoice ${row.invoice.number}`,
      amount: row.invoice.totalAmount.toString(),
      ...(origin
        ? { success_url: `${origin}/invoice/${token}`, cancel_url: `${origin}/invoice/${token}` }
        : {}),
      metadata: {
        channel: "invoice",
        invoice_id: row.invoice.id,
        invoice_number: row.invoice.number,
      },
    },
    idempotencyKey,
  );
  await withTenantTransaction(resolved.context.tenant, (tx) =>
    tx
      .update(invoices)
      .set({
        checkoutSessionId: checkout.id,
        version: sql`${invoices.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, row.invoice.id), eq(invoices.status, "open"))),
  );
  return checkout;
}
