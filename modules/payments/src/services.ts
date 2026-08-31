import { createHash } from "node:crypto";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { principalId } from "@yinne/auth";
import { recordDomainChange, requirePermission, type RequestContext } from "@yinne/application";
import { applySucceededPaymentToOrder, applySucceededRefundToOrder } from "@yinne/commerce";
import { ApiError, type CreatePaymentInput, type CreateRefundInput } from "@yinne/contracts";
import { createId } from "@yinne/core";
import {
  idempotencyRecords,
  checkoutSessions,
  paymentLinks,
  orders,
  paymentAttempts,
  payments,
  providerAccounts,
  providerEvents,
  refunds,
  transactions,
  withTenantTransaction,
  type TenantTransaction,
} from "@yinne/database";
import {
  canTransitionAttempt,
  canTransitionPayment,
  canTransitionRefund,
  remainingRefundable,
} from "./state";
import { MOCK_WEBHOOK_SECRET, mockProvider, type ProviderResult } from "./provider";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function notFound(): never {
  throw new ApiError(
    404,
    "invalid_request",
    "resource_not_found",
    "The requested resource does not exist.",
  );
}
function encodeCursor(value: { createdAt: Date; id: string }) {
  return Buffer.from(
    JSON.stringify({ created_at: value.createdAt.toISOString(), id: value.id }),
  ).toString("base64url");
}
function decodeCursor(value?: string) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString()) as {
      created_at: string;
      id: string;
    };
    return { createdAt: new Date(parsed.created_at), id: parsed.id };
  } catch {
    throw new ApiError(
      400,
      "invalid_request",
      "invalid_cursor",
      "The pagination cursor is invalid.",
    );
  }
}
function page<T extends { createdAt: Date; id: string }>(rows: T[], limit: number) {
  const more = rows.length > limit;
  const data = rows.slice(0, limit);
  return {
    data,
    has_more: more,
    next_cursor: more && data.at(-1) ? encodeCursor(data.at(-1)!) : null,
  };
}

const attemptView = (row: typeof paymentAttempts.$inferSelect) => ({
  id: row.id,
  payment_id: row.paymentId,
  provider_account_id: row.providerAccountId,
  provider: row.provider,
  status: row.status,
  provider_reference: row.providerReference,
  failure_code: row.failureCode,
  failure_message: row.failureMessage,
  response_metadata: row.responseMetadata,
  started_at: row.startedAt,
  completed_at: row.completedAt,
  created_at: row.createdAt,
});
const transactionView = (row: typeof transactions.$inferSelect) => ({
  id: row.id,
  payment_id: row.paymentId,
  refund_id: row.refundId,
  kind: row.kind,
  amount: row.amount.toString(),
  currency: row.currency,
  provider_reference: row.providerReference,
  environment: row.environment,
  occurred_at: row.occurredAt,
  created_at: row.createdAt,
});
const refundView = (row: typeof refunds.$inferSelect) => ({
  id: row.id,
  payment_id: row.paymentId,
  amount: row.amount.toString(),
  currency: row.currency,
  status: row.status,
  reason: row.reason,
  provider_reference: row.providerReference,
  failure_code: row.failureCode,
  failure_message: row.failureMessage,
  metadata: row.metadata,
  environment: row.environment,
  version: row.version,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
  completed_at: row.completedAt,
});
const paymentView = (row: typeof payments.$inferSelect) => ({
  id: row.id,
  order_id: row.orderId,
  customer_id: row.customerId,
  amount: row.amount.toString(),
  currency: row.currency,
  status: row.status,
  provider_account_id: row.providerAccountId,
  latest_attempt_id: row.latestAttemptId,
  refunded_amount: row.refundedAmount.toString(),
  metadata: row.metadata,
  environment: row.environment,
  version: row.version,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
  succeeded_at: row.succeededAt,
});
const providerAccountView = (row: typeof providerAccounts.$inferSelect) => ({
  id: row.id,
  provider: row.provider,
  label: row.label,
  environment: row.environment,
  capabilities: row.capabilities,
  supported_currencies: row.supportedCurrencies,
  configuration: row.configuration,
  status: row.status,
  is_default: row.isDefault,
  version: row.version,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
});

async function beginIdempotency(
  tx: TenantTransaction,
  context: RequestContext,
  operation: string,
  key: string,
  input: unknown,
) {
  const actor = principalId(context.principal);
  const keyDigest = digest(key);
  const requestDigest = digest(JSON.stringify(input));
  const scope = `${context.tenant.organizationId}:${context.tenant.environment}:${actor}:${operation}:${keyDigest}`;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${scope}, 0))`);
  const [existing] = await tx
    .select()
    .from(idempotencyRecords)
    .where(
      and(
        eq(idempotencyRecords.organizationId, context.tenant.organizationId),
        eq(idempotencyRecords.principalId, actor),
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
    if (existing.responseBody) return { replay: existing.responseBody, record: existing };
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
      principalId: actor,
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
  return { replay: null, record };
}
async function completeIdempotency(
  tx: TenantTransaction,
  id: string,
  response: Record<string, unknown>,
) {
  await tx
    .update(idempotencyRecords)
    .set({ responseStatus: 201, responseBody: response, lockedUntil: null, updatedAt: new Date() })
    .where(eq(idempotencyRecords.id, id));
}

async function resolveProvider(
  tx: TenantTransaction,
  context: RequestContext,
  explicitId: string | undefined,
  currency: string,
) {
  const conditions = [
    eq(providerAccounts.organizationId, context.tenant.organizationId),
    eq(providerAccounts.environment, context.tenant.environment),
    eq(providerAccounts.status, "enabled"),
  ];
  if (explicitId) conditions.push(eq(providerAccounts.id, explicitId));
  else conditions.push(eq(providerAccounts.isDefault, true));
  const rows = await tx
    .select()
    .from(providerAccounts)
    .where(and(...conditions))
    .limit(2);
  if (rows.length !== 1)
    throw new ApiError(
      409,
      "conflict",
      rows.length ? "provider_route_ambiguous" : "provider_account_unavailable",
      "A single compatible provider account could not be resolved.",
    );
  const account = rows[0]!;
  if (account.provider !== "mock" || context.tenant.environment !== "test")
    throw new ApiError(
      400,
      "provider_error",
      "unsupported_provider",
      "Only Mock Provider in test mode is available in Phase 3.",
    );
  if (
    !account.capabilities.includes("payment.create") ||
    !account.supportedCurrencies.includes(currency)
  )
    throw new ApiError(
      400,
      "provider_error",
      "unsupported_capability",
      "The provider account does not support this payment.",
    );
  return account;
}

async function finalizePayment(
  tx: TenantTransaction,
  context: RequestContext,
  attemptId: string,
  result: ProviderResult,
) {
  const [attempt] = await tx
    .select()
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.organizationId, context.tenant.organizationId),
        eq(paymentAttempts.id, attemptId),
      ),
    )
    .for("update")
    .limit(1);
  if (!attempt) notFound();
  const [payment] = await tx
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, context.tenant.organizationId),
        eq(payments.id, attempt.paymentId),
      ),
    )
    .for("update")
    .limit(1);
  if (!payment) notFound();
  if (["succeeded", "failed"].includes(attempt.status)) return payment;
  const attemptStatus = result.status === "unknown" ? "unknown" : result.status;
  if (!canTransitionAttempt(attempt.status, attemptStatus))
    throw new ApiError(
      409,
      "conflict",
      "illegal_attempt_transition",
      "The payment attempt transition is not legal.",
    );
  const paymentStatus = result.status === "unknown" ? "pending" : result.status;
  if (!canTransitionPayment(payment.status, paymentStatus))
    throw new ApiError(
      409,
      "conflict",
      "illegal_payment_transition",
      "The payment transition is not legal.",
    );
  const now = new Date();
  const [updatedAttempt] = await tx
    .update(paymentAttempts)
    .set({
      status: attemptStatus,
      providerReference: result.reference,
      failureCode: result.error?.code ?? null,
      failureMessage: result.error?.message ?? null,
      responseMetadata: result.data ?? {},
      version: sql`${paymentAttempts.version} + 1`,
      completedAt: ["succeeded", "failed"].includes(attemptStatus) ? now : null,
      updatedAt: now,
    })
    .where(eq(paymentAttempts.id, attempt.id))
    .returning();
  if (!updatedAttempt)
    throw new ApiError(
      500,
      "internal_error",
      "attempt_finalize_failed",
      "The provider result could not be recorded.",
    );
  let chargeTransaction: typeof transactions.$inferSelect | undefined;
  if (paymentStatus === "succeeded") {
    await applySucceededPaymentToOrder(tx, context, {
      orderId: payment.orderId,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    });
    [chargeTransaction] = await tx
      .insert(transactions)
      .values({
        organizationId: context.tenant.organizationId,
        environment: context.tenant.environment,
        paymentId: payment.id,
        kind: "charge",
        amount: payment.amount,
        currency: payment.currency,
        providerReference: result.reference,
        occurredAt: now,
      })
      .returning();
  }
  const [updatedPayment] = await tx
    .update(payments)
    .set({
      status: paymentStatus,
      version: sql`${payments.version} + 1`,
      succeededAt: paymentStatus === "succeeded" ? now : null,
      updatedAt: now,
    })
    .where(eq(payments.id, payment.id))
    .returning();
  if (!updatedPayment)
    throw new ApiError(
      500,
      "internal_error",
      "payment_finalize_failed",
      "The payment could not be finalized.",
    );
  await recordDomainChange(tx, context, {
    action:
      paymentStatus === "succeeded"
        ? "payment.succeeded"
        : paymentStatus === "failed"
          ? "payment.failed"
          : "payment.pending",
    aggregateType: "payment",
    aggregateId: payment.id,
    aggregateVersion: updatedPayment.version,
    data: {
      payment_id: payment.id,
      attempt_id: attempt.id,
      transaction_id: chargeTransaction?.id ?? null,
      order_id: payment.orderId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      error_code: result.error?.code ?? null,
    },
  });
  if (chargeTransaction)
    await recordDomainChange(tx, context, {
      action: "transaction.created",
      aggregateType: "transaction",
      aggregateId: chargeTransaction.id,
      aggregateVersion: 1,
      data: {
        transaction_id: chargeTransaction.id,
        payment_id: payment.id,
        kind: "charge",
        amount: payment.amount.toString(),
        currency: payment.currency,
      },
    });
  const checkoutId =
    typeof payment.metadata.checkout_session_id === "string"
      ? payment.metadata.checkout_session_id
      : null;
  if (checkoutId) {
    const [checkout] = await tx
      .select()
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.organizationId, context.tenant.organizationId),
          eq(checkoutSessions.environment, context.tenant.environment),
          eq(checkoutSessions.id, checkoutId),
        ),
      )
      .for("update")
      .limit(1);
    if (checkout && !["completed", "cancelled"].includes(checkout.status)) {
      const checkoutStatus =
        paymentStatus === "succeeded"
          ? "completed"
          : paymentStatus === "failed"
            ? "open"
            : "processing";
      const [updatedCheckout] = await tx
        .update(checkoutSessions)
        .set({
          paymentId: payment.id,
          status: checkoutStatus,
          completedAt: paymentStatus === "succeeded" ? now : null,
          lateCompletion: paymentStatus === "succeeded" && checkout.expiresAt <= now,
          version: sql`${checkoutSessions.version} + 1`,
          updatedAt: now,
        })
        .where(eq(checkoutSessions.id, checkout.id))
        .returning();
      if (updatedCheckout && paymentStatus === "succeeded") {
        if (checkout.paymentLinkId && !checkout.linkUsageCounted) {
          const [link] = await tx
            .select()
            .from(paymentLinks)
            .where(
              and(
                eq(paymentLinks.organizationId, context.tenant.organizationId),
                eq(paymentLinks.id, checkout.paymentLinkId),
              ),
            )
            .for("update")
            .limit(1);
          if (!link || (link.usageLimit !== null && link.completedUsageCount >= link.usageLimit))
            throw new ApiError(
              409,
              "conflict",
              "payment_link_usage_exhausted",
              "The Payment Link usage limit was reached.",
            );
          await tx
            .update(paymentLinks)
            .set({
              completedUsageCount: sql`${paymentLinks.completedUsageCount} + 1`,
              version: sql`${paymentLinks.version} + 1`,
              updatedAt: now,
            })
            .where(eq(paymentLinks.id, link.id));
          await tx
            .update(checkoutSessions)
            .set({ linkUsageCounted: true })
            .where(eq(checkoutSessions.id, checkout.id));
        }
        await recordDomainChange(tx, context, {
          action: "checkout.completed",
          aggregateType: "checkout_session",
          aggregateId: checkout.id,
          aggregateVersion: updatedCheckout.version,
          data: {
            checkout_session_id: checkout.id,
            order_id: payment.orderId,
            payment_id: payment.id,
            payment_link_id: checkout.paymentLinkId,
            amount: checkout.amount.toString(),
            currency: checkout.currency,
            late_completion: checkout.expiresAt <= now,
          },
        });
      }
    }
  }
  return updatedPayment;
}

export async function createPayment(
  context: RequestContext,
  input: CreatePaymentInput,
  key: string,
) {
  const started = await withTenantTransaction(context.tenant, async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, context.tenant.organizationId),
          eq(orders.id, input.order_id),
        ),
      )
      .for("update")
      .limit(1);
    if (!order) notFound();
    await requirePermission(tx, context.principal, "orders:write", {
      organizationId: context.tenant.organizationId,
      merchantId: order.merchantId,
      locationId: order.locationId,
    });
    const idem = await beginIdempotency(tx, context, "payments.create", key, input);
    if (idem.replay)
      return { replay: idem.replay, payment: null, attempt: null, recordId: idem.record.id };
    if (order.financialStatus !== "unpaid" || order.fulfilmentStatus !== "unfulfilled")
      throw new ApiError(
        409,
        "conflict",
        "order_not_payable",
        "The order cannot be paid in its current state.",
      );
    const account = await resolveProvider(tx, context, input.provider_account_id, order.currency);
    const paymentId = createId();
    const [payment] = await tx
      .insert(payments)
      .values({
        id: paymentId,
        organizationId: context.tenant.organizationId,
        environment: context.tenant.environment,
        orderId: order.id,
        customerId: order.customerId,
        amount: order.totalAmount,
        currency: order.currency,
        providerAccountId: account.id,
        metadata: input.metadata ?? {},
      })
      .returning();
    const [attempt] = await tx
      .insert(paymentAttempts)
      .values({
        organizationId: context.tenant.organizationId,
        environment: context.tenant.environment,
        paymentId,
        providerAccountId: account.id,
        provider: account.provider,
        status: "submitted",
        requestMetadata: { mock_scenario: input.confirmation.mock_scenario },
        startedAt: new Date(),
      })
      .returning();
    if (!payment || !attempt)
      throw new ApiError(
        500,
        "internal_error",
        "payment_create_failed",
        "The payment could not be created.",
      );
    await tx
      .update(payments)
      .set({ latestAttemptId: attempt.id })
      .where(eq(payments.id, payment.id));
    await recordDomainChange(tx, context, {
      action: "payment.created",
      aggregateType: "payment",
      aggregateId: payment.id,
      aggregateVersion: payment.version,
      data: {
        payment_id: payment.id,
        attempt_id: attempt.id,
        order_id: order.id,
        amount: payment.amount.toString(),
        currency: payment.currency,
        provider_account_id: account.id,
      },
    });
    return { replay: null, payment, attempt, recordId: idem.record.id };
  });
  if (started.replay) return started.replay;
  const result = await mockProvider.executePayment({
    attemptId: started.attempt.id,
    amount: started.payment.amount,
    currency: started.payment.currency,
    idempotencyKey: started.attempt.id,
    scenario: input.confirmation.mock_scenario,
  });
  return withTenantTransaction(context.tenant, async (tx) => {
    const payment = await finalizePayment(tx, context, started.attempt.id, result);
    const response = await paymentDetail(tx, context, payment.id);
    await completeIdempotency(tx, started.recordId, response as unknown as Record<string, unknown>);
    return response;
  });
}

async function paymentDetail(tx: TenantTransaction, context: RequestContext, id: string) {
  const [row] = await tx
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, context.tenant.organizationId),
        eq(payments.environment, context.tenant.environment),
        eq(payments.id, id),
      ),
    )
    .limit(1);
  if (!row) notFound();
  const attemptRows = await tx
    .select()
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.organizationId, context.tenant.organizationId),
        eq(paymentAttempts.paymentId, id),
      ),
    )
    .orderBy(desc(paymentAttempts.createdAt));
  const transactionRows = await tx
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, context.tenant.organizationId),
        eq(transactions.paymentId, id),
      ),
    )
    .orderBy(desc(transactions.createdAt));
  const refundRows = await tx
    .select()
    .from(refunds)
    .where(
      and(eq(refunds.organizationId, context.tenant.organizationId), eq(refunds.paymentId, id)),
    )
    .orderBy(desc(refunds.createdAt));
  return {
    ...paymentView(row),
    attempts: attemptRows.map(attemptView),
    transactions: transactionRows.map(transactionView),
    refunds: refundRows.map(refundView),
  };
}
export async function getPayment(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "payments:read", {
      organizationId: context.tenant.organizationId,
    });
    return paymentDetail(tx, context, id);
  });
}
export async function listPayments(
  context: RequestContext,
  query: {
    limit: number;
    after?: string | undefined;
    status?: string | undefined;
    order_id?: string | undefined;
    customer_id?: string | undefined;
    provider_account_id?: string | undefined;
  },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "payments:read", {
      organizationId: context.tenant.organizationId,
    });
    const cursor = decodeCursor(query.after);
    const conditions = [
      eq(payments.organizationId, context.tenant.organizationId),
      eq(payments.environment, context.tenant.environment),
    ];
    if (query.status) conditions.push(eq(payments.status, query.status));
    if (query.order_id) conditions.push(eq(payments.orderId, query.order_id));
    if (query.customer_id) conditions.push(eq(payments.customerId, query.customer_id));
    if (query.provider_account_id)
      conditions.push(eq(payments.providerAccountId, query.provider_account_id));
    if (cursor)
      conditions.push(
        or(
          lt(payments.createdAt, cursor.createdAt),
          and(eq(payments.createdAt, cursor.createdAt), lt(payments.id, cursor.id)),
        )!,
      );
    const rows = await tx
      .select()
      .from(payments)
      .where(and(...conditions))
      .orderBy(desc(payments.createdAt), desc(payments.id))
      .limit(query.limit + 1);
    const result = page(rows, query.limit);
    return { ...result, data: result.data.map(paymentView) };
  });
}

async function finalizeRefund(
  tx: TenantTransaction,
  context: RequestContext,
  refundId: string,
  result: ProviderResult,
) {
  const [refund] = await tx
    .select()
    .from(refunds)
    .where(and(eq(refunds.organizationId, context.tenant.organizationId), eq(refunds.id, refundId)))
    .for("update")
    .limit(1);
  if (!refund) notFound();
  if (["succeeded", "failed"].includes(refund.status)) return refund;
  const [payment] = await tx
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, context.tenant.organizationId),
        eq(payments.id, refund.paymentId),
      ),
    )
    .for("update")
    .limit(1);
  if (!payment) notFound();
  const status =
    result.status === "succeeded" ? "succeeded" : result.status === "failed" ? "failed" : "pending";
  if (!canTransitionRefund(refund.status, status))
    throw new ApiError(
      409,
      "conflict",
      "illegal_refund_transition",
      "The refund transition is not legal.",
    );
  const now = new Date();
  const [updatedRefund] = await tx
    .update(refunds)
    .set({
      status,
      providerReference: result.reference,
      failureCode: result.error?.code ?? null,
      failureMessage: result.error?.message ?? null,
      version: sql`${refunds.version} + 1`,
      completedAt: ["succeeded", "failed"].includes(status) ? now : null,
      updatedAt: now,
    })
    .where(eq(refunds.id, refund.id))
    .returning();
  if (!updatedRefund)
    throw new ApiError(
      500,
      "internal_error",
      "refund_finalize_failed",
      "The refund could not be finalized.",
    );
  let refundTransaction: typeof transactions.$inferSelect | undefined;
  if (status === "succeeded") {
    const total = payment.refundedAmount + refund.amount;
    if (total > payment.amount)
      throw new ApiError(
        409,
        "conflict",
        "refund_amount_exceeded",
        "The refund exceeds the remaining refundable amount.",
      );
    const paymentStatus = total === payment.amount ? "refunded" : "partially_refunded";
    if (!canTransitionPayment(payment.status, paymentStatus))
      throw new ApiError(
        409,
        "conflict",
        "illegal_payment_transition",
        "The payment refund transition is not legal.",
      );
    [refundTransaction] = await tx
      .insert(transactions)
      .values({
        organizationId: context.tenant.organizationId,
        environment: context.tenant.environment,
        paymentId: payment.id,
        refundId: refund.id,
        kind: "refund",
        amount: refund.amount,
        currency: refund.currency,
        providerReference: result.reference,
        occurredAt: now,
      })
      .returning();
    await tx
      .update(payments)
      .set({
        status: paymentStatus,
        refundedAmount: total,
        version: sql`${payments.version} + 1`,
        updatedAt: now,
      })
      .where(eq(payments.id, payment.id));
    await applySucceededRefundToOrder(tx, context, {
      orderId: payment.orderId,
      refundId: refund.id,
      totalRefunded: total,
      paymentAmount: payment.amount,
    });
  }
  await recordDomainChange(tx, context, {
    action:
      status === "succeeded"
        ? "refund.succeeded"
        : status === "failed"
          ? "refund.failed"
          : "refund.pending",
    aggregateType: "refund",
    aggregateId: refund.id,
    aggregateVersion: updatedRefund.version,
    data: {
      refund_id: refund.id,
      payment_id: payment.id,
      transaction_id: refundTransaction?.id ?? null,
      amount: refund.amount.toString(),
      currency: refund.currency,
      error_code: result.error?.code ?? null,
    },
  });
  if (refundTransaction)
    await recordDomainChange(tx, context, {
      action: "transaction.created",
      aggregateType: "transaction",
      aggregateId: refundTransaction.id,
      aggregateVersion: 1,
      data: {
        transaction_id: refundTransaction.id,
        payment_id: payment.id,
        refund_id: refund.id,
        kind: "refund",
        amount: refund.amount.toString(),
        currency: refund.currency,
      },
    });
  return updatedRefund;
}

export async function createRefund(context: RequestContext, input: CreateRefundInput, key: string) {
  const started = await withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "payments:refund", {
      organizationId: context.tenant.organizationId,
    });
    const idem = await beginIdempotency(tx, context, "refunds.create", key, input);
    if (idem.replay)
      return { replay: idem.replay, refund: null, payment: null, recordId: idem.record.id };
    const [payment] = await tx
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, context.tenant.organizationId),
          eq(payments.environment, context.tenant.environment),
          eq(payments.id, input.payment_id),
        ),
      )
      .for("update")
      .limit(1);
    if (!payment) notFound();
    if (!["succeeded", "partially_refunded"].includes(payment.status))
      throw new ApiError(
        409,
        "conflict",
        "payment_not_refundable",
        "Only a succeeded payment can be refunded.",
      );
    const [{ pending = 0n } = {}] = await tx
      .select({ pending: sql<bigint>`coalesce(sum(${refunds.amount}), 0)::bigint` })
      .from(refunds)
      .where(and(eq(refunds.paymentId, payment.id), eq(refunds.status, "pending")));
    const remaining = remainingRefundable(payment.amount, payment.refundedAmount, BigInt(pending));
    const amount = input.amount ? BigInt(input.amount) : remaining;
    if (amount <= 0n || amount > remaining)
      throw new ApiError(
        409,
        "conflict",
        "refund_amount_exceeded",
        "The refund exceeds the remaining refundable amount.",
        "amount",
        [{ remaining_refundable: remaining.toString() }],
      );
    const [refund] = await tx
      .insert(refunds)
      .values({
        organizationId: context.tenant.organizationId,
        environment: context.tenant.environment,
        paymentId: payment.id,
        amount,
        currency: payment.currency,
        reason: input.reason,
        metadata: input.metadata ?? {},
      })
      .returning();
    if (!refund)
      throw new ApiError(
        500,
        "internal_error",
        "refund_create_failed",
        "The refund could not be created.",
      );
    await recordDomainChange(tx, context, {
      action: "refund.created",
      aggregateType: "refund",
      aggregateId: refund.id,
      aggregateVersion: refund.version,
      data: {
        refund_id: refund.id,
        payment_id: payment.id,
        amount: amount.toString(),
        currency: payment.currency,
      },
    });
    return { replay: null, refund, payment, recordId: idem.record.id };
  });
  if (started.replay) return started.replay;
  const attempt = await withTenantTransaction(context.tenant, async (tx) =>
    tx
      .select({ reference: paymentAttempts.providerReference })
      .from(paymentAttempts)
      .where(
        and(
          eq(paymentAttempts.paymentId, started.payment.id),
          eq(paymentAttempts.status, "succeeded"),
        ),
      )
      .limit(1),
  );
  const result = await mockProvider.refundPayment({
    refundId: started.refund.id,
    paymentReference: attempt[0]?.reference ?? "",
    amount: started.refund.amount,
    currency: started.refund.currency,
    idempotencyKey: started.refund.id,
    scenario: input.confirmation.mock_scenario,
  });
  return withTenantTransaction(context.tenant, async (tx) => {
    const row = await finalizeRefund(tx, context, started.refund.id, result);
    const response = refundView(row);
    await completeIdempotency(tx, started.recordId, response as unknown as Record<string, unknown>);
    return response;
  });
}

export async function getRefund(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "payments:read", {
      organizationId: context.tenant.organizationId,
    });
    const [row] = await tx
      .select()
      .from(refunds)
      .where(
        and(
          eq(refunds.organizationId, context.tenant.organizationId),
          eq(refunds.environment, context.tenant.environment),
          eq(refunds.id, id),
        ),
      )
      .limit(1);
    if (!row) notFound();
    return refundView(row);
  });
}
export async function listRefunds(
  context: RequestContext,
  query: {
    limit: number;
    after?: string | undefined;
    payment_id?: string | undefined;
    status?: string | undefined;
  },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "payments:read", {
      organizationId: context.tenant.organizationId,
    });
    const cursor = decodeCursor(query.after);
    const conditions = [
      eq(refunds.organizationId, context.tenant.organizationId),
      eq(refunds.environment, context.tenant.environment),
    ];
    if (query.payment_id) conditions.push(eq(refunds.paymentId, query.payment_id));
    if (query.status) conditions.push(eq(refunds.status, query.status));
    if (cursor)
      conditions.push(
        or(
          lt(refunds.createdAt, cursor.createdAt),
          and(eq(refunds.createdAt, cursor.createdAt), lt(refunds.id, cursor.id)),
        )!,
      );
    const rows = await tx
      .select()
      .from(refunds)
      .where(and(...conditions))
      .orderBy(desc(refunds.createdAt), desc(refunds.id))
      .limit(query.limit + 1);
    const result = page(rows, query.limit);
    return { ...result, data: result.data.map(refundView) };
  });
}
export async function getTransaction(context: RequestContext, id: string) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "payments:read", {
      organizationId: context.tenant.organizationId,
    });
    const [row] = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, context.tenant.organizationId),
          eq(transactions.environment, context.tenant.environment),
          eq(transactions.id, id),
        ),
      )
      .limit(1);
    if (!row) notFound();
    return transactionView(row);
  });
}
export async function listTransactions(
  context: RequestContext,
  query: {
    limit: number;
    after?: string | undefined;
    payment_id?: string | undefined;
    kind?: string | undefined;
  },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "payments:read", {
      organizationId: context.tenant.organizationId,
    });
    const cursor = decodeCursor(query.after);
    const conditions = [
      eq(transactions.organizationId, context.tenant.organizationId),
      eq(transactions.environment, context.tenant.environment),
    ];
    if (query.payment_id) conditions.push(eq(transactions.paymentId, query.payment_id));
    if (query.kind) conditions.push(eq(transactions.kind, query.kind));
    if (cursor)
      conditions.push(
        or(
          lt(transactions.createdAt, cursor.createdAt),
          and(eq(transactions.createdAt, cursor.createdAt), lt(transactions.id, cursor.id)),
        )!,
      );
    const rows = await tx
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt), desc(transactions.id))
      .limit(query.limit + 1);
    const result = page(rows, query.limit);
    return { ...result, data: result.data.map(transactionView) };
  });
}
export async function listProviderAccounts(
  context: RequestContext,
  query: { limit: number; status?: string | undefined },
) {
  return withTenantTransaction(context.tenant, async (tx) => {
    await requirePermission(tx, context.principal, "providers:read", {
      organizationId: context.tenant.organizationId,
    });
    const conditions = [
      eq(providerAccounts.organizationId, context.tenant.organizationId),
      eq(providerAccounts.environment, context.tenant.environment),
    ];
    if (query.status) conditions.push(eq(providerAccounts.status, query.status));
    const rows = await tx
      .select()
      .from(providerAccounts)
      .where(and(...conditions))
      .orderBy(desc(providerAccounts.createdAt))
      .limit(query.limit);
    return { data: rows.map(providerAccountView), has_more: false, next_cursor: null };
  });
}

export async function ingestMockProviderWebhook(input: {
  organizationId: string;
  accountId: string;
  rawBody: string;
  signature: string;
  timestamp: string;
  requestId: string;
}) {
  let event;
  try {
    event = mockProvider.verifyWebhook(
      input.rawBody,
      input.signature,
      input.timestamp,
      MOCK_WEBHOOK_SECRET,
    );
  } catch {
    throw new ApiError(
      400,
      "authentication_error",
      "invalid_provider_signature",
      "The provider webhook signature is invalid.",
    );
  }
  const context: RequestContext = {
    tenant: { organizationId: input.organizationId, environment: "test" },
    principal: {
      type: "system",
      id: "mock-provider",
      organizationId: input.organizationId,
      environment: "test",
    },
    requestId: input.requestId,
  };
  return withTenantTransaction(context.tenant, async (tx) => {
    const [account] = await tx
      .select()
      .from(providerAccounts)
      .where(
        and(
          eq(providerAccounts.organizationId, input.organizationId),
          eq(providerAccounts.id, input.accountId),
          eq(providerAccounts.provider, "mock"),
          eq(providerAccounts.environment, "test"),
          eq(providerAccounts.status, "enabled"),
        ),
      )
      .limit(1);
    if (!account) notFound();
    const payloadDigest = digest(input.rawBody);
    const [existing] = await tx
      .select()
      .from(providerEvents)
      .where(
        and(
          eq(providerEvents.providerAccountId, account.id),
          eq(providerEvents.environment, "test"),
          eq(providerEvents.externalId, event.id),
        ),
      )
      .limit(1);
    if (existing) {
      if (existing.payloadDigest !== payloadDigest)
        throw new ApiError(
          409,
          "conflict",
          "provider_event_digest_mismatch",
          "A provider event ID was reused with a different payload.",
        );
      return { accepted: true, duplicate: true, provider_event_id: existing.id };
    }
    const [stored] = await tx
      .insert(providerEvents)
      .values({
        organizationId: input.organizationId,
        environment: "test",
        providerAccountId: account.id,
        externalId: event.id,
        type: event.type,
        objectReference: event.objectReference,
        payloadDigest,
        normalizedData: event.data,
      })
      .returning();
    if (!stored)
      throw new ApiError(
        500,
        "internal_error",
        "provider_event_store_failed",
        "The provider event could not be stored.",
      );
    if (event.type.startsWith("payment.")) {
      const [attempt] = await tx
        .select()
        .from(paymentAttempts)
        .where(
          and(
            eq(paymentAttempts.providerAccountId, account.id),
            eq(paymentAttempts.providerReference, event.objectReference),
          ),
        )
        .limit(1);
      if (attempt)
        await finalizePayment(tx, context, attempt.id, {
          status: event.type.endsWith("succeeded") ? "succeeded" : "failed",
          reference: event.objectReference,
          ...(event.type.endsWith("failed")
            ? {
                error: {
                  code: "declined",
                  retryable: false,
                  message: "Mock provider webhook reported failure.",
                } as const,
              }
            : {}),
        });
    } else {
      const [refund] = await tx
        .select()
        .from(refunds)
        .where(
          and(
            eq(refunds.organizationId, input.organizationId),
            eq(refunds.providerReference, event.objectReference),
          ),
        )
        .limit(1);
      if (refund)
        await finalizeRefund(tx, context, refund.id, {
          status: event.type.endsWith("succeeded") ? "succeeded" : "failed",
          reference: event.objectReference,
          ...(event.type.endsWith("failed")
            ? {
                error: {
                  code: "declined",
                  retryable: false,
                  message: "Mock provider webhook reported refund failure.",
                } as const,
              }
            : {}),
        });
    }
    await tx
      .update(providerEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(providerEvents.id, stored.id));
    return { accepted: true, duplicate: false, provider_event_id: stored.id };
  });
}
