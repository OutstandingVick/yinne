import { describe, expect, it, vi } from "vitest";
import { YinneClient, type YinneApiError } from "./index";
describe("Yinne SDK", () => {
  it("sends bearer auth and explicit order idempotency", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ order: { id: "ord" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const client = new YinneClient({
      apiKey: "test_key",
      baseUrl: "https://example.test/",
      fetch: fetcher,
    });
    await client.orders.create(
      {
        merchant_id: "m",
        location_id: "l",
        currency: "NGN",
        items: [{ variant_id: "v", quantity: 1 }],
      },
      { idempotencyKey: "stable-order-key-123" },
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://example.test/v1/orders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test_key",
          "Idempotency-Key": "stable-order-key-123",
        }),
      }),
    );
  });
  it("normalizes canonical API errors", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              type: "conflict",
              code: "insufficient_stock",
              message: "No stock",
              param: "items",
              request_id: "req_1",
              details: [],
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const client = new YinneClient({
      apiKey: "test_key",
      baseUrl: "https://example.test",
      fetch: fetcher,
    });
    await expect(client.inventory.list()).rejects.toMatchObject({
      status: 409,
      code: "insufficient_stock",
      requestId: "req_1",
    } satisfies Partial<YinneApiError>);
  });
});
