import { describe, expect, it } from "vitest";
import { createCheckoutSessionSchema, createPaymentLinkSchema } from "./checkout";
const merchant = "0198f000-0000-7000-8000-000000000002";
const location = "0198f000-0000-7000-8000-000000000010";
describe("checkout contracts", () => {
  it("rejects unsafe redirects and float-like money", () => {
    expect(() =>
      createCheckoutSessionSchema.parse({
        merchant_id: merchant,
        location_id: location,
        currency: "NGN",
        items: [{ variant_id: merchant, quantity: 1 }],
        success_url: "http://evil.test/paid",
      }),
    ).toThrow();
    expect(() =>
      createPaymentLinkSchema.parse({
        kind: "fixed",
        merchant_id: merchant,
        location_id: location,
        name: "Link",
        currency: "NGN",
        amount: "10.50",
      }),
    ).toThrow();
  });
  it("enforces flexible bounds", () => {
    expect(() =>
      createPaymentLinkSchema.parse({
        kind: "flexible",
        merchant_id: merchant,
        location_id: location,
        name: "Link",
        currency: "NGN",
        minimum_amount: "500",
        maximum_amount: "499",
      }),
    ).toThrow();
  });
});
