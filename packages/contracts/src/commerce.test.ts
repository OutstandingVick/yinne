import { describe, expect, it } from "vitest";
import { createOrderSchema, idempotencyKeySchema } from "./commerce";
const id = "0198f000-0000-7000-8000-000000001200";
describe("commerce contracts", () => {
  it("rejects duplicate variants and client-supplied totals", () => {
    expect(() =>
      createOrderSchema.parse({
        merchant_id: id,
        location_id: id,
        currency: "NGN",
        items: [
          { variant_id: id, quantity: 1 },
          { variant_id: id, quantity: 2 },
        ],
      }),
    ).toThrow();
    expect(() =>
      createOrderSchema.parse({
        merchant_id: id,
        location_id: id,
        currency: "NGN",
        total_amount: "1",
        items: [{ variant_id: id, quantity: 1 }],
      }),
    ).toThrow();
  });
  it("bounds idempotency keys", () => {
    expect(idempotencyKeySchema.parse("order-create-123456789")).toBeTruthy();
    expect(() => idempotencyKeySchema.parse("short")).toThrow();
  });
});
