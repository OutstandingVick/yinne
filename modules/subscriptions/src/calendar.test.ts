import { describe, expect, it } from "vitest";
import { advanceBillingDate } from "./calendar";

describe("recurring calendar", () => {
  it.each([
    ["2025-01-31T10:15:00.000Z", "2025-02-28T10:15:00.000Z"],
    ["2024-01-31T10:15:00.000Z", "2024-02-29T10:15:00.000Z"],
    ["2026-04-30T10:15:00.000Z", "2026-05-30T10:15:00.000Z"],
  ])("clamps monthly %s to %s", (start, expected) => {
    expect(advanceBillingDate(new Date(start), "month").toISOString()).toBe(expected);
  });

  it("returns to the immutable month-end anchor", () => {
    const february = advanceBillingDate(new Date("2025-01-31T00:00:00Z"), "month", 31);
    expect(advanceBillingDate(february, "month", 31).toISOString()).toBe(
      "2025-03-31T00:00:00.000Z",
    );
  });

  it("clamps leap-day annual renewal and preserves the UTC instant across DST", () => {
    expect(advanceBillingDate(new Date("2024-02-29T07:30:00Z"), "year", 29).toISOString()).toBe(
      "2025-02-28T07:30:00.000Z",
    );
    expect(advanceBillingDate(new Date("2026-03-08T01:30:00Z"), "month").getUTCHours()).toBe(1);
  });
});
