import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const providerCapabilities = [
  "payment.create",
  "payment.retrieve",
  "payment.refund",
  "webhook.verify",
] as const;
export type ProviderCapability = (typeof providerCapabilities)[number];
export type ProviderStatus = "pending" | "succeeded" | "failed" | "unknown";
export interface ProviderError {
  code:
    | "declined"
    | "invalid_request"
    | "unsupported"
    | "unavailable"
    | "timeout"
    | "conflict"
    | "unknown";
  retryable: boolean;
  message: string;
}
export interface ProviderResult {
  status: ProviderStatus;
  reference: string;
  error?: ProviderError;
  data?: Record<string, string>;
}
export interface ExecutePaymentInput {
  attemptId: string;
  amount: bigint;
  currency: string;
  idempotencyKey: string;
  scenario: string;
}
export interface RefundPaymentInput {
  refundId: string;
  paymentReference: string;
  amount: bigint;
  currency: string;
  idempotencyKey: string;
  scenario: string;
}
export interface NormalizedProviderEvent {
  id: string;
  type: "payment.succeeded" | "payment.failed" | "refund.succeeded" | "refund.failed";
  objectReference: string;
  occurredAt: Date;
  data: Record<string, unknown>;
}
export interface ProviderAdapter {
  readonly key: string;
  capabilities(): readonly ProviderCapability[];
  executePayment(input: ExecutePaymentInput): Promise<ProviderResult>;
  retrievePayment(reference: string): Promise<ProviderResult>;
  refundPayment(input: RefundPaymentInput): Promise<ProviderResult>;
  verifyWebhook(
    rawBody: string,
    signature: string,
    timestamp: string,
    secret: string,
    now?: Date,
  ): NormalizedProviderEvent;
}

export const MOCK_WEBHOOK_SECRET = "yinne_mock_webhook_v1_local_development_only";
export function mockReference(kind: "pay" | "refund", id: string): string {
  return `mock_${kind}_${id.replaceAll("-", "")}`;
}
export function mockEventId(type: string, objectReference: string): string {
  return `evt_mock_${createHash("sha256").update(`${type}:${objectReference}`).digest("hex").slice(0, 24)}`;
}
export function signMockWebhook(
  rawBody: string,
  timestamp: string,
  secret = MOCK_WEBHOOK_SECRET,
): string {
  return `v1=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function parseEvent(rawBody: string): NormalizedProviderEvent {
  const value = JSON.parse(rawBody) as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    !["payment.succeeded", "payment.failed", "refund.succeeded", "refund.failed"].includes(
      String(value.type),
    ) ||
    typeof value.object_reference !== "string" ||
    typeof value.occurred_at !== "string"
  )
    throw new Error("Malformed mock provider event.");
  const occurredAt = new Date(value.occurred_at);
  if (Number.isNaN(occurredAt.getTime()))
    throw new Error("Malformed mock provider event timestamp.");
  return {
    id: value.id,
    type: value.type as NormalizedProviderEvent["type"],
    objectReference: value.object_reference,
    occurredAt,
    data:
      typeof value.data === "object" && value.data ? (value.data as Record<string, unknown>) : {},
  };
}

export const mockProvider: ProviderAdapter = {
  key: "mock",
  capabilities: () => providerCapabilities,
  executePayment(input) {
    const reference = mockReference("pay", input.attemptId);
    if (input.scenario === "success")
      return Promise.resolve({ status: "succeeded", reference, data: { simulated: "true" } });
    if (input.scenario === "failure:declined")
      return Promise.resolve({
        status: "failed",
        reference,
        error: {
          code: "declined",
          retryable: false,
          message: "The deterministic mock payment was declined.",
        },
      });
    if (input.scenario === "timeout:then_success")
      return Promise.resolve({
        status: "unknown",
        reference,
        error: {
          code: "timeout",
          retryable: true,
          message: "The deterministic mock provider timed out; reconciliation is required.",
        },
      });
    return Promise.resolve({
      status: "pending",
      reference,
      data: { resolution: input.scenario.endsWith("success") ? "succeeded" : "failed" },
    });
  },
  retrievePayment(reference) {
    return Promise.resolve({ status: "pending", reference });
  },
  refundPayment(input) {
    const reference = mockReference("refund", input.refundId);
    return Promise.resolve(
      input.scenario === "refund_failure"
        ? {
            status: "failed",
            reference,
            error: {
              code: "declined",
              retryable: false,
              message: "The deterministic mock refund failed.",
            },
          }
        : { status: "succeeded", reference, data: { simulated: "true" } },
    );
  },
  verifyWebhook(rawBody, signature, timestamp, secret, now = new Date()) {
    if (!/^\d{10}$/.test(timestamp) || Math.abs(now.getTime() - Number(timestamp) * 1000) > 300_000)
      throw new Error("Mock provider webhook timestamp is outside the replay window.");
    if (
      !/^v1=[0-9a-f]{64}$/.test(signature) ||
      !safeEqual(signature, signMockWebhook(rawBody, timestamp, secret))
    )
      throw new Error("Invalid mock provider webhook signature.");
    return parseEvent(rawBody);
  },
};

export function buildMockWebhook(
  type: NormalizedProviderEvent["type"],
  objectReference: string,
  now = new Date(),
) {
  const rawBody = JSON.stringify({
    id: mockEventId(type, objectReference),
    type,
    object_reference: objectReference,
    occurred_at: now.toISOString(),
    data: { simulated: true },
  });
  const timestamp = Math.floor(now.getTime() / 1000).toString();
  return { rawBody, timestamp, signature: signMockWebhook(rawBody, timestamp) };
}
