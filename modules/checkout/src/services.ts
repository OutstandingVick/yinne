import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { recordDomainChange, requirePermission, type RequestContext } from "@yinne/application";
import { principalId } from "@yinne/auth";
import { createCustomer, createCollectionOrder, createOrder } from "@yinne/commerce";
import type {
  ConfirmCheckoutInput,
  CreateCheckoutSessionInput,
  CreatePaymentLinkInput,
  UpdatePaymentLinkInput,
} from "@yinne/contracts";
import { ApiError } from "@yinne/contracts";
import { createId } from "@yinne/core";
import { createPayment } from "@yinne/payments";
import {
  checkoutLineItems,
  checkoutSessions,
  database,
  idempotencyRecords,
  locations,
  merchants,
  paymentLinks,
  payments,
  products,
  variants,
  withTenantTransaction,
  type TenantTransaction,
} from "@yinne/database";
import { shouldExpireCheckout, type CheckoutStatus } from "./state";

const token = () => randomBytes(32).toString("base64url");
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function notFound(): never {
  throw new ApiError(
    404,
    "invalid_request",
    "resource_not_found",
    "The requested resource does not exist.",
  );
}
const systemContext = (
  organizationId: string,
  environment: "test" | "live",
  requestId = createId(),
): RequestContext => ({
  tenant: { organizationId, environment },
  principal: {
    type: "system",
    id: "00000000-0000-7000-8000-000000000004",
    organizationId,
    environment,
  },
  requestId,
});

function page<T extends { createdAt: Date; id: string }>(rows: T[], limit: number) {
  const data = rows.slice(0, limit);
  const more = rows.length > limit;
  const last = data.at(-1);
  return {
    data,
    has_more: more,
    next_cursor:
      more && last
        ? Buffer.from(
            JSON.stringify({ created_at: last.createdAt.toISOString(), id: last.id }),
          ).toString("base64url")
        : null,
  };
}
function cursor(value?: string) {
  if (!value) return null;
  try {
    const v = JSON.parse(Buffer.from(value, "base64url").toString()) as {
      created_at: string;
      id: string;
    };
    return { createdAt: new Date(v.created_at), id: v.id };
  } catch {
    throw new ApiError(
      400,
      "invalid_request",
      "invalid_cursor",
      "The pagination cursor is invalid.",
    );
  }
}

async function beginIdempotency(
  tx: TenantTransaction,
  context: RequestContext,
  operation: string,
  key: string,
  input: unknown,
) {
  const actorId = principalId(context.principal);
  const keyDigest = digest(key);
  const requestDigest = digest(
    JSON.stringify(input, (_name, value: unknown) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
  const scope = `${context.tenant.organizationId}:${context.tenant.environment}:${actorId}:${operation}:${keyDigest}`;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${scope}, 0))`);
  const [existing] = await tx
    .select()
    .from(idempotencyRecords)
    .where(
      and(
        eq(idempotencyRecords.organizationId, context.tenant.organizationId),
        eq(idempotencyRecords.principalId, actorId),
        eq(idempotencyRecords.operation, operation),
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
        "idempotency_key_reused",
        "The idempotency key was already used with different input.",
        "Idempotency-Key",
      );
    if (existing.responseBody) return { replay: existing.responseBody, recordId: existing.id };
    throw new ApiError(
      409,
      "conflict",
      "idempotency_request_in_progress",
      "A request with this idempotency key is still in progress.",
    );
  }
  const [record] = await tx
    .insert(idempotencyRecords)
    .values({
      organizationId: context.tenant.organizationId,
      principalId: actorId,
      operation,
      environment: context.tenant.environment,
      keyDigest,
      requestDigest,
      lockedUntil: new Date(Date.now() + 60_000),
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    })
    .returning();
  if (!record)
    throw new ApiError(
      500,
      "internal_error",
      "idempotency_create_failed",
      "The idempotency record could not be created.",
    );
  return { replay: null, recordId: record.id };
}

async function completeIdempotency(
  tx: TenantTransaction,
  recordId: string,
  response: Record<string, unknown>,
) {
  await tx
    .update(idempotencyRecords)
    .set({ responseStatus: 201, responseBody: response, lockedUntil: null, updatedAt: new Date() })
    .where(eq(idempotencyRecords.id, recordId));
}

const itemView = (row: typeof checkoutLineItems.$inferSelect) => ({
  id: row.id,
  variant_id: row.variantId,
  description: row.description,
  variant_title: row.variantTitle,
  sku: row.sku,
  unit_amount: row.unitAmount.toString(),
  currency: row.currency,
  quantity: row.quantity,
  total_amount: row.totalAmount.toString(),
});
const sessionView = (
  row: typeof checkoutSessions.$inferSelect,
  items: (typeof checkoutLineItems.$inferSelect)[] = [],
  includeToken?: string,
) => ({
  id: row.id,
  merchant_id: row.merchantId,
  location_id: row.locationId,
  payment_link_id: row.paymentLinkId,
  customer_id: row.customerId,
  order_id: row.orderId,
  payment_id: row.paymentId,
  status: row.status,
  amount: row.amount.toString(),
  currency: row.currency,
  customer_capture: row.customerCapture,
  success_url: row.successUrl,
  cancel_url: row.cancelUrl,
  expires_at: row.expiresAt,
  completed_at: row.completedAt,
  cancelled_at: row.cancelledAt,
  late_completion: row.lateCompletion,
  environment: row.environment,
  version: row.version,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
  items: items.map(itemView),
  ...(includeToken ? { checkout_url: `/checkout/${includeToken}` } : {}),
});
const linkView = (row: typeof paymentLinks.$inferSelect, includeToken?: string) => ({
  id: row.id,
  merchant_id: row.merchantId,
  location_id: row.locationId,
  name: row.name,
  description: row.description,
  kind: row.kind,
  status: row.status,
  variant_id: row.variantId,
  quantity: row.quantity,
  amount: row.fixedAmount?.toString() ?? null,
  minimum_amount: row.minimumAmount?.toString() ?? null,
  maximum_amount: row.maximumAmount?.toString() ?? null,
  currency: row.currency,
  usage_limit: row.usageLimit,
  completed_usage_count: row.completedUsageCount,
  customer_capture: row.customerCapture,
  starts_at: row.startsAt,
  expires_at: row.expiresAt,
  environment: row.environment,
  version: row.version,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
  ...(includeToken ? { payment_url: `/pay/${includeToken}` } : {}),
});

async function itemsFor(tx: TenantTransaction, org: string, ids: string[]) {
  return ids.length
    ? tx
        .select()
        .from(checkoutLineItems)
        .where(
          and(
            eq(checkoutLineItems.organizationId, org),
            inArray(checkoutLineItems.checkoutSessionId, ids),
          ),
        )
        .orderBy(checkoutLineItems.createdAt)
    : [];
}
async function expire(
  tx: TenantTransaction,
  context: RequestContext,
  row: typeof checkoutSessions.$inferSelect,
) {
  if (!shouldExpireCheckout(row.status as CheckoutStatus, row.expiresAt)) return row;
  const [updated] = await tx
    .update(checkoutSessions)
    .set({
      status: "expired",
      version: sql`${checkoutSessions.version} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(checkoutSessions.id, row.id), eq(checkoutSessions.status, "open")))
    .returning();
  if (updated)
    await recordDomainChange(tx, context, {
      action: "checkout.expired",
      aggregateType: "checkout_session",
      aggregateId: updated.id,
      aggregateVersion: updated.version,
      data: {
        checkout_session_id: updated.id,
        amount: updated.amount.toString(),
        currency: updated.currency,
      },
    });
  return updated ?? row;
}

async function createSessionFromLines(
  context: RequestContext,
  input: {
    merchantId: string;
    locationId: string;
    customerId?: string | null | undefined;
    paymentLinkId?: string | null | undefined;
    currency: string;
    lines: {
      variantId?: string | null | undefined;
      description: string;
      variantTitle?: string | null | undefined;
      sku?: string | null | undefined;
      unitAmount: bigint;
      quantity: number;
    }[];
    capture: { name: boolean; email: boolean; phone: boolean };
    successUrl?: string | null | undefined;
    cancelUrl?: string | null | undefined;
    expiresIn?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
    idempotencyKey: string;
    idempotencyOperation: string;
  },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const idem = await beginIdempotency(
      tx,
      context,
      input.idempotencyOperation,
      input.idempotencyKey,
      {
        merchant_id: input.merchantId,
        location_id: input.locationId,
        customer_id: input.customerId ?? null,
        payment_link_id: input.paymentLinkId ?? null,
        currency: input.currency,
        lines: input.lines,
        expires_in: input.expiresIn ?? 1800,
      },
    );
    if (idem.replay) return idem.replay as ReturnType<typeof sessionView>;
    const [place] = await tx
      .select({ id: locations.id })
      .from(locations)
      .innerJoin(
        merchants,
        and(
          eq(merchants.organizationId, locations.organizationId),
          eq(merchants.id, locations.merchantId),
        ),
      )
      .where(
        and(
          eq(locations.organizationId, context.tenant.organizationId),
          eq(locations.id, input.locationId),
          eq(locations.merchantId, input.merchantId),
          eq(locations.status, "active"),
          eq(merchants.status, "active"),
        ),
      )
      .limit(1);
    if (!place) notFound();
    const amount = input.lines.reduce(
      (sum, line) => sum + line.unitAmount * BigInt(line.quantity),
      0n,
    );
    if (amount <= 0n)
      throw new ApiError(
        400,
        "invalid_request",
        "invalid_amount",
        "Checkout total must be positive.",
      );
    const publicToken = token();
    const [row] = await tx
      .insert(checkoutSessions)
      .values({
        organizationId: context.tenant.organizationId,
        environment: context.tenant.environment,
        merchantId: input.merchantId,
        locationId: input.locationId,
        paymentLinkId: input.paymentLinkId ?? null,
        customerId: input.customerId ?? null,
        publicTokenDigest: digest(publicToken),
        publicTokenPrefix: publicToken.slice(0, 8),
        amount,
        currency: input.currency,
        customerCapture: input.capture,
        successUrl: input.successUrl ?? null,
        cancelUrl: input.cancelUrl ?? null,
        metadata: input.metadata ?? {},
        expiresAt: new Date(Date.now() + (input.expiresIn ?? 1800) * 1000),
      })
      .returning();
    if (!row)
      throw new ApiError(
        500,
        "internal_error",
        "checkout_create_failed",
        "Checkout Session could not be created.",
      );
    const items = await tx
      .insert(checkoutLineItems)
      .values(
        input.lines.map((line) => ({
          organizationId: context.tenant.organizationId,
          checkoutSessionId: row.id,
          variantId: line.variantId ?? null,
          description: line.description,
          variantTitle: line.variantTitle ?? null,
          sku: line.sku ?? null,
          unitAmount: line.unitAmount,
          currency: input.currency,
          quantity: line.quantity,
          totalAmount: line.unitAmount * BigInt(line.quantity),
        })),
      )
      .returning();
    await recordDomainChange(tx, context, {
      action: "checkout.created",
      aggregateType: "checkout_session",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: {
        checkout_session_id: row.id,
        payment_link_id: row.paymentLinkId,
        amount: amount.toString(),
        currency: row.currency,
        expires_at: row.expiresAt.toISOString(),
      },
    });
    const response = sessionView(row, items, publicToken);
    await completeIdempotency(tx, idem.recordId, response as unknown as Record<string, unknown>);
    return response;
  });
}

export async function createCheckoutSession(
  context: RequestContext,
  input: CreateCheckoutSessionInput,
  _key: string,
) {
  await withTenantTransaction(context.tenant, (tx) =>
    requirePermission(tx, context.principal, "checkout:write", {
      organizationId: context.tenant.organizationId,
      merchantId: input.merchant_id,
      locationId: input.location_id,
    }),
  );
  const lines = await withTenantTransaction(context.tenant, async (tx) => {
    const ids = input.items.map((i) => i.variant_id);
    const rows = await tx
      .select({ variant: variants, productName: products.name, productStatus: products.status })
      .from(variants)
      .innerJoin(
        products,
        and(
          eq(products.organizationId, variants.organizationId),
          eq(products.id, variants.productId),
        ),
      )
      .where(
        and(eq(variants.organizationId, context.tenant.organizationId), inArray(variants.id, ids)),
      );
    if (rows.length !== ids.length) notFound();
    return input.items.map((item) => {
      const found = rows.find((r) => r.variant.id === item.variant_id)!;
      if (found.variant.status !== "active" || found.productStatus !== "active")
        throw new ApiError(
          409,
          "conflict",
          "catalogue_not_active",
          "Only active products and variants may be checked out.",
        );
      if (found.variant.currency !== input.currency)
        throw new ApiError(
          400,
          "invalid_request",
          "currency_mismatch",
          "Every item must use the checkout currency.",
        );
      return {
        variantId: found.variant.id,
        description: found.productName,
        variantTitle: found.variant.title,
        sku: found.variant.sku,
        unitAmount: found.variant.unitAmount,
        quantity: item.quantity,
      };
    });
  });
  return createSessionFromLines(context, {
    merchantId: input.merchant_id,
    locationId: input.location_id,
    customerId: input.customer_id,
    currency: input.currency,
    lines,
    capture: input.customer_capture,
    successUrl: input.success_url,
    cancelUrl: input.cancel_url,
    expiresIn: input.expires_in_seconds,
    metadata: input.metadata,
    idempotencyKey: _key,
    idempotencyOperation: "checkout_sessions.create",
  });
}

export async function createPaymentLink(
  context: RequestContext,
  input: CreatePaymentLinkInput,
  _key: string,
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "payment_links:write", {
      organizationId: context.tenant.organizationId,
      merchantId: input.merchant_id,
      locationId: input.location_id,
    });
    const idem = await beginIdempotency(tx, context, "payment_links.create", _key, input);
    if (idem.replay) return idem.replay as ReturnType<typeof linkView>;
    let fixed: bigint | null = null,
      min: bigint | null = null,
      max: bigint | null = null,
      variantId: string | null = null,
      quantity: number | null = null;
    if (input.kind === "product") {
      const [v] = await tx
        .select()
        .from(variants)
        .innerJoin(
          products,
          and(
            eq(products.organizationId, variants.organizationId),
            eq(products.id, variants.productId),
          ),
        )
        .where(
          and(
            eq(variants.organizationId, context.tenant.organizationId),
            eq(variants.id, input.variant_id),
            eq(variants.status, "active"),
            eq(products.status, "active"),
          ),
        )
        .limit(1);
      if (!v) notFound();
      if (v.variants.currency !== input.currency)
        throw new ApiError(
          400,
          "invalid_request",
          "currency_mismatch",
          "Variant currency does not match the link.",
        );
      variantId = input.variant_id;
      quantity = input.quantity;
    }
    if (input.kind === "fixed") fixed = BigInt(input.amount);
    if (input.kind === "flexible") {
      min = BigInt(input.minimum_amount);
      max = input.maximum_amount ? BigInt(input.maximum_amount) : null;
    }
    const publicToken = token();
    const [row] = await tx
      .insert(paymentLinks)
      .values({
        organizationId: context.tenant.organizationId,
        environment: context.tenant.environment,
        merchantId: input.merchant_id,
        locationId: input.location_id,
        publicTokenDigest: digest(publicToken),
        publicTokenPrefix: publicToken.slice(0, 8),
        name: input.name,
        description: input.description ?? null,
        kind: input.kind,
        variantId,
        quantity,
        fixedAmount: fixed,
        minimumAmount: min,
        maximumAmount: max,
        currency: input.currency,
        usageLimit: input.usage_limit ?? null,
        customerCapture: input.customer_capture,
        startsAt: input.starts_at ?? null,
        expiresAt: input.expires_at ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    if (!row)
      throw new ApiError(
        500,
        "internal_error",
        "payment_link_create_failed",
        "Payment Link could not be created.",
      );
    await recordDomainChange(tx, context, {
      action: "payment_link.created",
      aggregateType: "payment_link",
      aggregateId: row.id,
      aggregateVersion: row.version,
      data: { payment_link_id: row.id, kind: row.kind, currency: row.currency },
    });
    const response = linkView(row, publicToken);
    await completeIdempotency(tx, idem.recordId, response as unknown as Record<string, unknown>);
    return response;
  });
}

export async function listCheckoutSessions(
  context: RequestContext,
  query: { limit: number; after?: string; status?: string; payment_link_id?: string },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "checkout:read", {
      organizationId: context.tenant.organizationId,
    });
    const c = cursor(query.after);
    const conditions = [
      eq(checkoutSessions.organizationId, context.tenant.organizationId),
      eq(checkoutSessions.environment, context.tenant.environment),
    ];
    if (query.status) conditions.push(eq(checkoutSessions.status, query.status));
    if (query.payment_link_id)
      conditions.push(eq(checkoutSessions.paymentLinkId, query.payment_link_id));
    if (c)
      conditions.push(
        or(
          lt(checkoutSessions.createdAt, c.createdAt),
          and(eq(checkoutSessions.createdAt, c.createdAt), lt(checkoutSessions.id, c.id)),
        )!,
      );
    const rows = await tx
      .select()
      .from(checkoutSessions)
      .where(and(...conditions))
      .orderBy(desc(checkoutSessions.createdAt), desc(checkoutSessions.id))
      .limit(query.limit + 1);
    const result = page(rows, query.limit);
    const items = await itemsFor(
      tx,
      context.tenant.organizationId,
      result.data.map((r) => r.id),
    );
    return {
      ...result,
      data: result.data.map((r) =>
        sessionView(
          r,
          items.filter((i) => i.checkoutSessionId === r.id),
        ),
      ),
    };
  });
}
export async function getCheckoutSession(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const [current] = await tx
      .select()
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.organizationId, context.tenant.organizationId),
          eq(checkoutSessions.environment, context.tenant.environment),
          eq(checkoutSessions.id, id),
        ),
      )
      .limit(1);
    if (!current) notFound();
    await requirePermission(tx, context.principal, "checkout:read", {
      organizationId: context.tenant.organizationId,
      merchantId: current.merchantId,
      locationId: current.locationId,
    });
    const row = await expire(tx, context, current);
    return sessionView(row, await itemsFor(tx, context.tenant.organizationId, [row.id]));
  });
}
export async function listPaymentLinks(
  context: RequestContext,
  query: { limit: number; after?: string; status?: string; kind?: string },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "payment_links:read", {
      organizationId: context.tenant.organizationId,
    });
    const c = cursor(query.after);
    const conditions = [
      eq(paymentLinks.organizationId, context.tenant.organizationId),
      eq(paymentLinks.environment, context.tenant.environment),
    ];
    if (query.status) conditions.push(eq(paymentLinks.status, query.status));
    if (query.kind) conditions.push(eq(paymentLinks.kind, query.kind));
    if (c)
      conditions.push(
        or(
          lt(paymentLinks.createdAt, c.createdAt),
          and(eq(paymentLinks.createdAt, c.createdAt), lt(paymentLinks.id, c.id)),
        )!,
      );
    const rows = await tx
      .select()
      .from(paymentLinks)
      .where(and(...conditions))
      .orderBy(desc(paymentLinks.createdAt), desc(paymentLinks.id))
      .limit(query.limit + 1);
    const result = page(rows, query.limit);
    return { ...result, data: result.data.map((r) => linkView(r)) };
  });
}
export async function getPaymentLink(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const [row] = await tx
      .select()
      .from(paymentLinks)
      .where(
        and(
          eq(paymentLinks.organizationId, context.tenant.organizationId),
          eq(paymentLinks.environment, context.tenant.environment),
          eq(paymentLinks.id, id),
        ),
      )
      .limit(1);
    if (!row) notFound();
    await requirePermission(tx, context.principal, "payment_links:read", {
      organizationId: context.tenant.organizationId,
      merchantId: row.merchantId,
      locationId: row.locationId,
    });
    return linkView(row);
  });
}
export async function updatePaymentLink(
  context: RequestContext,
  id: string,
  input: UpdatePaymentLinkInput,
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const [current] = await tx
      .select()
      .from(paymentLinks)
      .where(
        and(
          eq(paymentLinks.organizationId, context.tenant.organizationId),
          eq(paymentLinks.environment, context.tenant.environment),
          eq(paymentLinks.id, id),
        ),
      )
      .for("update")
      .limit(1);
    if (!current) notFound();
    await requirePermission(tx, context.principal, "payment_links:write", {
      organizationId: context.tenant.organizationId,
      merchantId: current.merchantId,
      locationId: current.locationId,
    });
    const [row] = await tx
      .update(paymentLinks)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.customer_capture ? { customerCapture: input.customer_capture } : {}),
        ...(input.usage_limit !== undefined ? { usageLimit: input.usage_limit } : {}),
        ...(input.starts_at !== undefined ? { startsAt: input.starts_at } : {}),
        ...(input.expires_at !== undefined ? { expiresAt: input.expires_at } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
        version: sql`${paymentLinks.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(paymentLinks.id, id), eq(paymentLinks.version, input.version)))
      .returning();
    if (!row)
      throw new ApiError(
        409,
        "conflict",
        "version_conflict",
        "The Payment Link was changed by another request.",
      );
    return linkView(row);
  });
}
export async function setPaymentLinkActive(context: RequestContext, id: string, active: boolean) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const [current] = await tx
      .select()
      .from(paymentLinks)
      .where(
        and(
          eq(paymentLinks.organizationId, context.tenant.organizationId),
          eq(paymentLinks.environment, context.tenant.environment),
          eq(paymentLinks.id, id),
        ),
      )
      .for("update")
      .limit(1);
    if (!current) notFound();
    await requirePermission(tx, context.principal, "payment_links:write", {
      organizationId: context.tenant.organizationId,
      merchantId: current.merchantId,
      locationId: current.locationId,
    });
    if (current.status === (active ? "active" : "inactive")) return linkView(current);
    const [row] = await tx
      .update(paymentLinks)
      .set({
        status: active ? "active" : "inactive",
        version: sql`${paymentLinks.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(paymentLinks.id, id))
      .returning();
    if (!row)
      throw new ApiError(
        500,
        "internal_error",
        "payment_link_update_failed",
        "The Payment Link could not be updated.",
      );
    await recordDomainChange(tx, context, {
      action: active ? "payment_link.activated" : "payment_link.deactivated",
      aggregateType: "payment_link",
      aggregateId: id,
      aggregateVersion: row.version,
      data: { payment_link_id: id },
    });
    return linkView(row);
  });
}

async function resolveCapability(kind: "checkout" | "link", rawToken: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) notFound();
  const fn =
    kind === "checkout"
      ? sql`select * from yinne_resolve_checkout_token(${digest(rawToken)})`
      : sql`select * from yinne_resolve_payment_link_token(${digest(rawToken)})`;
  const result = (await database.execute(fn)) as unknown as {
    organization_id: string;
    environment: "test" | "live";
    resource_id: string;
  }[];
  const row = result[0];
  if (!row) notFound();
  return { context: systemContext(row.organization_id, row.environment), id: row.resource_id };
}
export async function getPublicCheckout(rawToken: string) {
  const resolved = await resolveCapability("checkout", rawToken);
  return getCheckoutSession(resolved.context, resolved.id);
}
export async function getPublicPaymentLink(rawToken: string) {
  const resolved = await resolveCapability("link", rawToken);
  return withTenantTransaction(resolved.context.tenant, async (tx) => {
    const [row] = await tx
      .select()
      .from(paymentLinks)
      .where(
        and(
          eq(paymentLinks.organizationId, resolved.context.tenant.organizationId),
          eq(paymentLinks.environment, resolved.context.tenant.environment),
          eq(paymentLinks.id, resolved.id),
        ),
      )
      .limit(1);
    if (!row) notFound();
    const now = new Date();
    const unavailable =
      row.status !== "active" ||
      (row.startsAt && row.startsAt > now) ||
      (row.expiresAt && row.expiresAt <= now) ||
      (row.usageLimit !== null && row.completedUsageCount >= row.usageLimit);
    return { ...linkView(row), available: !unavailable };
  });
}
export async function openPublicPaymentLink(
  rawToken: string,
  amount: string | undefined,
  idempotencyKey: string,
) {
  const resolved = await resolveCapability("link", rawToken);
  const context = resolved.context;
  const link = await withTenantTransaction(context.tenant, async (tx) => {
    const [row] = await tx
      .select()
      .from(paymentLinks)
      .where(
        and(
          eq(paymentLinks.organizationId, context.tenant.organizationId),
          eq(paymentLinks.environment, context.tenant.environment),
          eq(paymentLinks.id, resolved.id),
        ),
      )
      .for("update")
      .limit(1);
    if (!row) notFound();
    const now = new Date();
    if (
      row.status !== "active" ||
      (row.startsAt && row.startsAt > now) ||
      (row.expiresAt && row.expiresAt <= now) ||
      (row.usageLimit !== null && row.completedUsageCount >= row.usageLimit)
    )
      throw new ApiError(
        409,
        "conflict",
        "payment_link_unavailable",
        "This Payment Link is not available.",
      );
    return row;
  });
  let lines: {
    variantId?: string | null;
    description: string;
    variantTitle?: string | null;
    sku?: string | null;
    unitAmount: bigint;
    quantity: number;
  }[];
  if (link.kind === "product")
    lines = await withTenantTransaction(context.tenant, async (tx) => {
      const [row] = await tx
        .select({ variant: variants, productName: products.name, productStatus: products.status })
        .from(variants)
        .innerJoin(
          products,
          and(
            eq(products.organizationId, variants.organizationId),
            eq(products.id, variants.productId),
          ),
        )
        .where(
          and(
            eq(variants.organizationId, context.tenant.organizationId),
            eq(variants.id, link.variantId!),
          ),
        )
        .limit(1);
      if (!row || row.variant.status !== "active" || row.productStatus !== "active")
        throw new ApiError(
          409,
          "conflict",
          "catalogue_not_active",
          "The linked product is unavailable.",
        );
      if (row.variant.currency !== link.currency)
        throw new ApiError(
          409,
          "conflict",
          "currency_mismatch",
          "The linked product currency changed.",
        );
      return [
        {
          variantId: row.variant.id,
          description: row.productName,
          variantTitle: row.variant.title,
          sku: row.variant.sku,
          unitAmount: row.variant.unitAmount,
          quantity: link.quantity!,
        },
      ];
    });
  else {
    const chosen = link.kind === "fixed" ? link.fixedAmount! : amount ? BigInt(amount) : 0n;
    if (
      link.kind === "flexible" &&
      (chosen < link.minimumAmount! || (link.maximumAmount !== null && chosen > link.maximumAmount))
    )
      throw new ApiError(
        400,
        "invalid_request",
        "amount_out_of_bounds",
        "Amount is outside this Payment Link's allowed range.",
        "amount",
      );
    lines = [{ description: link.description || link.name, unitAmount: chosen, quantity: 1 }];
  }
  return createSessionFromLines(context, {
    merchantId: link.merchantId,
    locationId: link.locationId,
    paymentLinkId: link.id,
    currency: link.currency,
    lines,
    capture: link.customerCapture,
    idempotencyKey,
    idempotencyOperation: `payment_links.${link.id}.open`,
  });
}

export async function confirmCheckout(
  context: RequestContext,
  id: string,
  input: ConfirmCheckoutInput,
  key: string,
) {
  let session = await withTenantTransaction(context.tenant, async (tx) => {
    const [current] = await tx
      .select()
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.organizationId, context.tenant.organizationId),
          eq(checkoutSessions.environment, context.tenant.environment),
          eq(checkoutSessions.id, id),
        ),
      )
      .for("update")
      .limit(1);
    if (!current) notFound();
    await requirePermission(tx, context.principal, "checkout:write", {
      organizationId: context.tenant.organizationId,
      merchantId: current.merchantId,
      locationId: current.locationId,
    });
    const row = await expire(tx, context, current);
    if (["expired", "cancelled"].includes(row.status))
      throw new ApiError(
        409,
        "conflict",
        "checkout_unavailable",
        "This Checkout Session is no longer available.",
      );
    return row;
  });
  if (session.status === "completed") return getCheckoutSession(context, id);
  const capture = session.customerCapture;
  if (capture.name && !input.customer.name)
    throw new ApiError(
      400,
      "invalid_request",
      "customer_name_required",
      "Customer name is required.",
      "customer.name",
    );
  if (capture.email && !input.customer.email)
    throw new ApiError(
      400,
      "invalid_request",
      "customer_email_required",
      "Customer email is required.",
      "customer.email",
    );
  if (capture.phone && !input.customer.phone)
    throw new ApiError(
      400,
      "invalid_request",
      "customer_phone_required",
      "Customer phone is required.",
      "customer.phone",
    );
  let customerId = session.customerId;
  if (!customerId && (input.customer.name || input.customer.email || input.customer.phone)) {
    const customer = await createCustomer(context, {
      name: input.customer.name || input.customer.email || input.customer.phone || "Guest",
      email: input.customer.email ?? null,
      phone: input.customer.phone ?? null,
      metadata: { checkout_session_id: id },
    });
    customerId = customer.id;
  }
  const items = await withTenantTransaction(context.tenant, (tx) =>
    itemsFor(tx, context.tenant.organizationId, [id]),
  );
  let orderId = session.orderId;
  if (!orderId) {
    const productLines = items.filter((i) => i.variantId);
    const order =
      productLines.length === items.length
        ? await createOrder(
            context,
            {
              merchant_id: session.merchantId,
              location_id: session.locationId,
              customer_id: customerId,
              currency: session.currency,
              items: items.map((i) => ({ variant_id: i.variantId!, quantity: i.quantity })),
              metadata: { checkout_session_id: id },
            },
            `checkout-order-${key}`,
          )
        : await createCollectionOrder(
            context,
            {
              merchant_id: session.merchantId,
              location_id: session.locationId,
              customer_id: customerId,
              currency: session.currency,
              amount: session.amount.toString(),
              description: items[0]?.description ?? "Payment",
              metadata: { checkout_session_id: id },
            },
            `checkout-order-${key}`,
          );
    orderId = order.id;
  }
  const customerDetails = {
    ...(input.customer.name ? { name: input.customer.name } : {}),
    ...(input.customer.email ? { email: input.customer.email } : {}),
    ...(input.customer.phone ? { phone: input.customer.phone } : {}),
  };
  session = await withTenantTransaction(context.tenant, async (tx) => {
    const [row] = await tx
      .update(checkoutSessions)
      .set({
        status: "processing",
        customerId,
        customerDetails,
        orderId,
        version: sql`${checkoutSessions.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(checkoutSessions.id, id), inArray(checkoutSessions.status, ["open", "processing"])),
      )
      .returning();
    if (!row) notFound();
    await recordDomainChange(tx, context, {
      action: "checkout.processing",
      aggregateType: "checkout_session",
      aggregateId: id,
      aggregateVersion: row.version,
      data: {
        checkout_session_id: id,
        order_id: orderId,
        amount: row.amount.toString(),
        currency: row.currency,
      },
    });
    return row;
  });
  const payment = session.paymentId
    ? await withTenantTransaction(context.tenant, async (tx) => {
        const [p] = await tx
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.organizationId, context.tenant.organizationId),
              eq(payments.id, session.paymentId!),
            ),
          )
          .limit(1);
        return p ? { id: p.id, status: p.status } : null;
      })
    : await createPayment(
        context,
        {
          order_id: orderId,
          confirmation: input.confirmation,
          metadata: { checkout_session_id: id },
        },
        `checkout-payment-${key}`,
      );
  if (!payment)
    throw new ApiError(
      500,
      "internal_error",
      "payment_create_failed",
      "Payment could not be created.",
    );
  const paymentId = String(payment.id);
  const paymentStatus = String(payment.status);
  await withTenantTransaction(context.tenant, async (tx) => {
    await tx
      .update(checkoutSessions)
      .set({
        paymentId,
        status:
          paymentStatus === "succeeded"
            ? "completed"
            : paymentStatus === "failed"
              ? "open"
              : "processing",
        completedAt: paymentStatus === "succeeded" ? new Date() : null,
        lateCompletion: paymentStatus === "succeeded" && session.expiresAt <= new Date(),
        version: sql`${checkoutSessions.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(checkoutSessions.id, id));
  });
  return getCheckoutSession(context, id);
}
export async function confirmPublicCheckout(
  rawToken: string,
  input: ConfirmCheckoutInput,
  key: string,
) {
  const resolved = await resolveCapability("checkout", rawToken);
  return confirmCheckout(resolved.context, resolved.id, input, key);
}
export async function cancelCheckout(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    const [current] = await tx
      .select()
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.organizationId, context.tenant.organizationId),
          eq(checkoutSessions.environment, context.tenant.environment),
          eq(checkoutSessions.id, id),
        ),
      )
      .for("update")
      .limit(1);
    if (!current) notFound();
    await requirePermission(tx, context.principal, "checkout:write", {
      organizationId: context.tenant.organizationId,
      merchantId: current.merchantId,
      locationId: current.locationId,
    });
    if (current.status !== "open")
      throw new ApiError(
        409,
        "conflict",
        "checkout_cannot_be_cancelled",
        "Only an open Checkout Session may be cancelled.",
      );
    const [row] = await tx
      .update(checkoutSessions)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        version: sql`${checkoutSessions.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(checkoutSessions.id, id))
      .returning();
    if (!row)
      throw new ApiError(
        500,
        "internal_error",
        "checkout_cancel_failed",
        "The Checkout Session could not be cancelled.",
      );
    await recordDomainChange(tx, context, {
      action: "checkout.cancelled",
      aggregateType: "checkout_session",
      aggregateId: id,
      aggregateVersion: row.version,
      data: { checkout_session_id: id },
    });
    return sessionView(row, await itemsFor(tx, context.tenant.organizationId, [id]));
  });
}
