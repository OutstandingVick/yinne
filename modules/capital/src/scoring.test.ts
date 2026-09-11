import { describe, expect, it } from "vitest";
import type { CapitalFeatureSet } from "@yinne/analytics";
import { buildCapitalProfile, dataSufficiency, scoreChange } from "./profile";

const id = "0198f000-0000-7000-8000-000000009001";
function fixture(overrides: Partial<CapitalFeatureSet> = {}): CapitalFeatureSet {
  return {
    currency: "NGN",
    from: new Date("2026-03-05T00:00:00.000Z"),
    to: new Date("2026-09-01T00:00:00.000Z"),
    observedDays: 180,
    paidOrderCount: 100,
    weeklyNetCollected: Array.from({ length: 25 }, () => 1000n),
    current90NetCollected: 12000n,
    previous90NetCollected: 10000n,
    chargeAmount: 100000n,
    refundAmount: 1000n,
    identifiedBuyerCount: 50,
    identityCoverage: 0.9,
    repeatRevenueShare: 0.5,
    ...overrides,
  };
}

function profile(features = fixture()) {
  return buildCapitalProfile(
    id,
    "0198f000-0000-7000-8000-000000000001",
    "test",
    features,
    new Date("2026-09-01T01:00:00.000Z"),
  );
}

describe("rules-1 known answers", () => {
  it("scores a stable merchant exactly", () => {
    const result = profile();
    expect(result.score).toBe(87);
    expect(result.band).toBe("highly_stable");
    expect(result.data_sufficiency).toBe("strong");
    expect(result.dimensions).toHaveLength(6);
  });

  it("separates insufficient evidence from weak performance", () => {
    const result = profile(fixture({ observedDays: 3, paidOrderCount: 2 }));
    expect(result.status).toBe("insufficient_data");
    expect(result.score).toBeNull();
    expect(result.band).toBeNull();
    expect(result.missing_requirements).toEqual(["87 more observed days", "28 more paid orders"]);
  });

  it("reweights missing optional customer identity", () => {
    const result = profile(
      fixture({ identifiedBuyerCount: 2, identityCoverage: 0.1, repeatRevenueShare: null }),
    );
    expect(result.status).toBe("scored");
    expect(result.signals.find((signal) => signal.key === "customer_quality")?.status).toBe(
      "not_applicable",
    );
    expect(result.signals.reduce((sum, signal) => sum + signal.effective_weight, 0)).toBeCloseTo(
      100,
      1,
    );
  });

  it("scores volatility below stable activity", () => {
    const volatile = profile(
      fixture({
        weeklyNetCollected: Array.from({ length: 25 }, (_, index) => (index % 2 ? 2000n : 0n)),
      }),
    );
    expect(volatile.score!).toBeLessThan(profile().score!);
  });

  it("is neutral to subscription, invoice, and location usage", () => {
    const oneTimeCommerce = profile();
    const subscriptionLed = profile();
    const invoiceLed = profile();
    expect(subscriptionLed.score).toBe(oneTimeCommerce.score);
    expect(invoiceLed.score).toBe(oneTimeCommerce.score);
    expect(oneTimeCommerce.signals.map((signal) => signal.key)).not.toContain("location_count");
  });

  it("maps sufficiency boundaries exactly", () => {
    expect(dataSufficiency(fixture({ observedDays: 119, paidOrderCount: 49 })).level).toBe(
      "limited",
    );
    expect(dataSufficiency(fixture({ observedDays: 120, paidOrderCount: 50 })).level).toBe(
      "sufficient",
    );
  });

  it("derives deterministic score-change contributors", () => {
    const current = profile();
    const previous = {
      ...current,
      id: "0198f000-0000-7000-8000-000000009000",
      score: current.score! - 3,
      signals: current.signals.map((signal, index) => ({
        ...signal,
        contribution: index === 0 ? signal.contribution - 3 : signal.contribution,
      })),
    };
    expect(scoreChange(current, previous)).toMatchObject({
      delta: 3,
      contributors: [{ key: "revenue_consistency", delta: 3, direction: "up" }],
    });
  });
});
