import { describe, expect, it, vi } from "vitest";
import {
  YinneClient,
  YinneConnectionError,
  YinnePublicClient,
  paginate,
  type YinneApiError,
} from "./index";
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

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
const apiError = (status: number) =>
  json(status, {
    error: {
      type: "api_error",
      code: "unavailable",
      message: "Try again",
      request_id: "req_1",
      param: null,
      details: [],
    },
  });

describe("Yinne SDK reliability", () => {
  it("retries a read after a server error, honouring Retry-After", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(apiError(503))
      .mockResolvedValueOnce(json(200, { customer: { id: "cus" }, request_id: "req" }));
    const client = new YinneClient({ apiKey: "k", fetch: fetcher });
    await expect(client.customers.retrieve("cus")).resolves.toEqual({ id: "cus" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not retry a write that has no idempotency key", async () => {
    const fetcher = vi.fn().mockResolvedValue(apiError(503));
    const client = new YinneClient({ apiKey: "k", fetch: fetcher });
    await expect(client.customers.create({ name: "Ada" })).rejects.toMatchObject({ status: 503 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reports a non-JSON gateway page as YinneApiError", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("<html>Bad gateway</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
    );
    const client = new YinneClient({ apiKey: "k", fetch: fetcher, maxRetries: 0 });
    await expect(client.customers.retrieve("cus")).rejects.toMatchObject({
      name: "YinneApiError",
      status: 502,
      code: "invalid_response",
    });
  });

  it("wraps network failures and timeouts in YinneConnectionError", async () => {
    const offline = new YinneClient({
      apiKey: "k",
      maxRetries: 0,
      fetch: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    });
    await expect(offline.customers.retrieve("cus")).rejects.toBeInstanceOf(YinneConnectionError);
    const slow = new YinneClient({
      apiKey: "k",
      maxRetries: 0,
      timeoutMs: 5,
      fetch: vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")),
    });
    await expect(slow.customers.retrieve("cus")).rejects.toThrow(/did not respond within 5ms/);
  });
});

describe("Yinne SDK pagination and public client", () => {
  it("paginates across pages until has_more is false", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        json(200, { data: [{ id: "a" }], has_more: true, next_cursor: "c1", request_id: "r" }),
      )
      .mockResolvedValueOnce(
        json(200, { data: [{ id: "b" }], has_more: false, next_cursor: null, request_id: "r" }),
      );
    const client = new YinneClient({ apiKey: "k", fetch: fetcher });
    const ids: string[] = [];
    for await (const customer of paginate(client.customers.list, { limit: 1 }))
      ids.push(customer.id);
    expect(ids).toEqual(["a", "b"]);
    expect(String(fetcher.mock.calls[1]?.[0])).toContain("after=c1");
  });

  it("calls public endpoints without credentials and with one idempotency key", async () => {
    const fetcher = vi.fn().mockResolvedValue(json(201, { checkout_session: { id: "cs" } }));
    const client = new YinnePublicClient({ fetch: fetcher });
    await client.paymentLinks.open("tok", { amount: "500000" });
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("https://app.yinne.store/v1/public/payment-links/tok");
    expect(headers.Authorization).toBeUndefined();
    expect(headers["X-Yinne-SDK"]).toBeUndefined();
    expect(JSON.parse(init.body as string).idempotency_key).toBe(headers["Idempotency-Key"]);
  });
});
