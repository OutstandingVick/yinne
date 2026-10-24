import { describe, expect, it, vi } from "vitest";
import { YinneApiError, type YinneClient } from "@yinne/sdk";
import { mapError } from "./output";
import { createRegistry, SERVER_INSTRUCTIONS } from "./server";
import { WriteGuard } from "./safety";
import type { AgentConfig } from "./config";

const config = (mode: AgentConfig["mode"] = "read"): AgentConfig => ({
  apiKey: "test-only-placeholder",
  baseUrl: "https://example.invalid",
  mode,
  maxAmount: 5_000_000n,
});

function mockClient() {
  const page = { data: [], has_more: false, next_cursor: null, request_id: "req_test" };
  return {
    analytics: {
      overview: vi.fn().mockResolvedValue({ metrics: { net_collected: { NGN: "100" } } }),
      sales: vi.fn().mockResolvedValue({ refunds: { NGN: "20" } }),
    },
    orders: { list: vi.fn().mockResolvedValue(page), retrieve: vi.fn() },
    customers: { list: vi.fn().mockResolvedValue(page), retrieve: vi.fn() },
    products: { list: vi.fn().mockResolvedValue(page) },
    inventory: { list: vi.fn().mockResolvedValue(page) },
    payments: { list: vi.fn().mockResolvedValue(page) },
    invoices: {
      list: vi.fn().mockResolvedValue(page),
      retrieve: vi.fn(),
      create: vi.fn(),
      issue: vi.fn(),
    },
    subscriptions: { list: vi.fn().mockResolvedValue(page) },
    paymentLinks: { create: vi.fn() },
  };
}

describe("Yinne MCP safety", () => {
  it("does not register higher-mode tools in read mode", () => {
    const registry = createRegistry(config(), mockClient() as unknown as YinneClient);
    expect(registry.names()).toContain("get_overview");
    expect(registry.names()).not.toContain("draft_invoice");
    expect(registry.names()).not.toContain("issue_invoice");
  });

  it("registers draft tools but not act tools in draft mode", () => {
    const registry = createRegistry(config("draft"), mockClient() as unknown as YinneClient);
    expect(registry.names()).toContain("draft_payment_link");
    expect(registry.names()).toContain("suggest_reorders");
    expect(registry.names()).not.toContain("issue_invoice");
  });

  it("never exposes forbidden operations or an unsupported reminder action", () => {
    const names = createRegistry(config("act"), mockClient() as unknown as YinneClient).names();
    for (const forbidden of [
      "refund",
      "payout",
      "transfer",
      "cancel",
      "void",
      "provider",
      "api_key",
      "team",
      "delete",
      "send_payment_reminder",
    ])
      expect(names.some((name) => name.includes(forbidden))).toBe(false);
    expect(names).toContain("issue_invoice");
    expect(SERVER_INSTRUCTIONS).toContain("untrusted");
  });

  it("rejects over-cap payment links before calling the SDK", async () => {
    const client = mockClient();
    const registry = createRegistry(config("draft"), client as unknown as YinneClient);
    await expect(
      registry.call("draft_payment_link", {
        merchant_id: "11111111-1111-4111-8111-111111111111",
        location_id: "22222222-2222-4222-8222-222222222222",
        name: "Test",
        amount: "5000001",
        currency: "NGN",
      }),
    ).rejects.toThrow("YINNE_AGENT_MAX_AMOUNT");
    expect(client.paymentLinks.create).not.toHaveBeenCalled();
  });

  it("rejects over-cap invoice totals including quantity", async () => {
    const client = mockClient();
    const registry = createRegistry(config("draft"), client as unknown as YinneClient);
    await expect(
      registry.call("draft_invoice", {
        merchant_id: "11111111-1111-4111-8111-111111111111",
        customer_id: "22222222-2222-4222-8222-222222222222",
        currency: "NGN",
        items: [{ description: "Test", quantity: 2, unit_amount: "3000000" }],
      }),
    ).rejects.toThrow("YINNE_AGENT_MAX_AMOUNT");
    expect(client.invoices.create).not.toHaveBeenCalled();
  });

  it("creates a fixed link through the SDK with a stable idempotency key", async () => {
    const client = mockClient();
    client.paymentLinks.create.mockResolvedValue({
      id: "link_1",
      status: "active",
      payment_url: "https://example.invalid/pay/test",
    });
    const registry = createRegistry(config("draft"), client as unknown as YinneClient);
    const args = {
      merchant_id: "11111111-1111-4111-8111-111111111111",
      location_id: "22222222-2222-4222-8222-222222222222",
      name: "Test link",
      amount: "1000",
      currency: "NGN",
    };
    const first = await registry.call("draft_payment_link", args);
    await registry.call("draft_payment_link", args);
    expect(first.payment_link).toMatchObject({
      payment_url: "https://example.invalid/pay/test",
      amount: "1000",
      currency: "NGN",
    });
    expect(client.paymentLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "fixed", amount: "1000" }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
    expect(client.paymentLinks.create.mock.calls[0]![1]).toEqual(
      client.paymentLinks.create.mock.calls[1]![1],
    );
  });

  it("does not issue invoices that are already paid", async () => {
    const client = mockClient();
    client.invoices.retrieve.mockResolvedValue({
      id: "invoice_1",
      status: "paid",
      total_amount: "100",
      currency: "NGN",
    });
    const registry = createRegistry(config("act"), client as unknown as YinneClient);
    await expect(
      registry.call("issue_invoice", { invoice_id: "11111111-1111-4111-8111-111111111111" }),
    ).rejects.toThrow("Only draft");
    expect(client.invoices.issue).not.toHaveBeenCalled();
  });

  it("limits all write attempts to 20 per rolling hour", () => {
    let clock = 100_000;
    const guard = new WriteGuard(config("act"), () => clock);
    for (let i = 0; i < 20; i++) guard.checkWrite();
    expect(() => guard.checkWrite()).toThrow("maximum 20");
    clock += 3_600_001;
    expect(() => guard.checkWrite()).not.toThrow();
  });

  it("uses a stable idempotency key without exposing the API key", () => {
    const guard = new WriteGuard(config("draft"));
    const first = guard.idempotencyKey("draft_invoice", { customer_id: "test" });
    expect(first).toBe(guard.idempotencyKey("draft_invoice", { customer_id: "test" }));
    expect(first).not.toContain("test-only-placeholder");
  });

  it("maps API errors to status, code, message and request_id", () => {
    const result = mapError(
      new YinneApiError(403, "auth", "forbidden", "Access denied", "req_123", null, []),
    );
    expect(result.error).toEqual({
      status: 403,
      code: "forbidden",
      message: "Access denied",
      request_id: "req_123",
    });
  });

  it("redacts the configured key from error messages", () => {
    const result = mapError(new Error("bad test-only-placeholder"), "test-only-placeholder");
    expect(result.summary).toBe("bad [REDACTED]");
  });

  it("caps lists and reports when more data exists", async () => {
    const client = mockClient();
    client.orders.list.mockResolvedValue({
      data: Array.from({ length: 21 }, (_, index) => ({
        id: `order_${index}`,
        number: `ORD-${index}`,
        customer_id: null,
        financial_status: "unpaid",
        fulfilment_status: "unfulfilled",
        total_amount: "100",
        currency: "NGN",
        created_at: "2026-10-01T00:00:00.000Z",
      })),
      has_more: false,
      next_cursor: null,
      request_id: "req_test",
    });
    const registry = createRegistry(config(), client as unknown as YinneClient);
    const result = await registry.call("list_orders", { limit: 20 });
    expect((result.orders as unknown[]).length).toBe(20);
    expect(result.has_more).toBe(true);
  });
});
