import { describe, expect, it } from "vitest";
import {
  createRecurringPriceSchema,
  createSubscriptionSchema,
  subscriptionStatusSchema,
} from "./subscriptions";

describe("subscription contracts", () => {
  it("accepts immutable monthly and annual prices", () => {
    const base = {
      plan_id: crypto.randomUUID(),
      currency: "NGN",
      unit_amount: "2000000",
      interval_count: 1 as const,
    };
    expect(createRecurringPriceSchema.parse({ ...base, interval: "month" }).interval).toBe("month");
    expect(createRecurringPriceSchema.parse({ ...base, interval: "year" }).interval).toBe("year");
  });

  it("rejects zero, floating point, unsupported intervals, and arbitrary states", () => {
    const base = { plan_id: crypto.randomUUID(), currency: "NGN", interval_count: 1 };
    expect(() =>
      createRecurringPriceSchema.parse({ ...base, unit_amount: "0", interval: "month" }),
    ).toThrow();
    expect(() =>
      createRecurringPriceSchema.parse({ ...base, unit_amount: "1.50", interval: "month" }),
    ).toThrow();
    expect(() =>
      createRecurringPriceSchema.parse({ ...base, unit_amount: "100", interval: "week" }),
    ).toThrow();
    expect(() => subscriptionStatusSchema.parse("renewing")).toThrow();
  });

  it("bounds test-only trials and deterministic outcomes", () => {
    const input = {
      customer_id: crypto.randomUUID(),
      price_id: crypto.randomUUID(),
      merchant_id: crypto.randomUUID(),
      location_id: crypto.randomUUID(),
      trial_days: 91,
    };
    expect(() => createSubscriptionSchema.parse(input)).toThrow();
  });
});
