import { describe, expect, it } from "vitest";
import { marketplaceCheckoutSchema, marketplaceSearchSchema } from "./marketplace";
describe("Marketplace contracts", () => {
  it("bounds discovery input", () => {
    expect(marketplaceSearchSchema.parse({ q: "coffee", limit: "20" }).limit).toBe(20);
    expect(() => marketplaceSearchSchema.parse({ q: "x".repeat(121) })).toThrow();
    expect(() => marketplaceSearchSchema.parse({ min_amount: "500", max_amount: "100" })).toThrow();
  });
  it("rejects checkout price injection", () => {
    expect(() =>
      marketplaceCheckoutSchema.parse({
        variant_id: "0198f000-0000-7000-8000-000000000101",
        quantity: 1,
        idempotency_key: "market-buy-1",
        unit_amount: "1",
      }),
    ).toThrow();
  });
});
