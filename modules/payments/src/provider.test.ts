import { describe, expect, it } from "vitest";
import { buildMockWebhook, mockProvider, mockReference } from "./provider";
import {
  canTransitionAttempt,
  canTransitionPayment,
  canTransitionRefund,
  remainingRefundable,
} from "./state";

describe("Payments state machines", () => {
  it("allows only canonical payment, attempt, and refund transitions", () => {
    expect(canTransitionPayment("created", "succeeded")).toBe(true);
    expect(canTransitionPayment("succeeded", "failed")).toBe(false);
    expect(canTransitionAttempt("unknown", "succeeded")).toBe(true);
    expect(canTransitionAttempt("failed", "succeeded")).toBe(false);
    expect(canTransitionRefund("pending", "succeeded")).toBe(true);
    expect(canTransitionRefund("succeeded", "failed")).toBe(false);
  });
  it("calculates remaining refundable value using bigint", () => {
    expect(remainingRefundable(9_007_199_254_740_999n, 10n, 20n)).toBe(9_007_199_254_740_969n);
    expect(remainingRefundable(100n, 80n, 20n)).toBe(0n);
  });
});

describe("Mock Provider contract", () => {
  const input = {
    attemptId: "0198f000-0000-7000-8000-000000009001",
    amount: 5000n,
    currency: "NGN",
    idempotencyKey: "stable",
    scenario: "success",
  };
  it("returns deterministic references and normalized outcomes", async () => {
    const first = await mockProvider.executePayment(input);
    const replay = await mockProvider.executePayment(input);
    expect(first).toEqual(replay);
    expect(first.reference).toBe(mockReference("pay", input.attemptId));
    await expect(
      mockProvider.executePayment({ ...input, scenario: "failure:declined" }),
    ).resolves.toMatchObject({ status: "failed", error: { code: "declined", retryable: false } });
    await expect(
      mockProvider.executePayment({ ...input, scenario: "pending:then_success" }),
    ).resolves.toMatchObject({ status: "pending" });
    await expect(
      mockProvider.executePayment({ ...input, scenario: "timeout:then_success" }),
    ).resolves.toMatchObject({ status: "unknown", error: { code: "timeout" } });
  });
  it("verifies timestamped signatures before normalizing events", () => {
    const now = new Date("2026-08-28T10:00:00Z");
    const signed = buildMockWebhook("payment.succeeded", "mock_pay_reference", now);
    expect(
      mockProvider.verifyWebhook(
        signed.rawBody,
        signed.signature,
        signed.timestamp,
        "yinne_mock_webhook_v1_local_development_only",
        now,
      ),
    ).toMatchObject({ type: "payment.succeeded", objectReference: "mock_pay_reference" });
    expect(() =>
      mockProvider.verifyWebhook(
        signed.rawBody,
        signed.signature.replace(/.$/, "0"),
        signed.timestamp,
        "yinne_mock_webhook_v1_local_development_only",
        now,
      ),
    ).toThrow();
    expect(() =>
      mockProvider.verifyWebhook(
        signed.rawBody,
        signed.signature,
        signed.timestamp,
        "yinne_mock_webhook_v1_local_development_only",
        new Date("2026-08-28T10:10:00Z"),
      ),
    ).toThrow();
  });
});
