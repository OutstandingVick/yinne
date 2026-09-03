import { describe, expect, it } from "vitest";
import { analyticsQuerySchema } from "./analytics";

describe("analytics query contract", () => {
  it("accepts a bounded half-open reporting range", () => {
    const value = analyticsQuerySchema.parse({
      from: "2026-08-01T00:00:00+01:00",
      to: "2026-09-01T00:00:00+01:00",
      timezone: "Africa/Lagos",
    });
    expect(value.granularity).toBe("day");
    expect(value.limit).toBe(10);
  });

  it("rejects reversed, excessive, and invalid-timezone ranges", () => {
    expect(() =>
      analyticsQuerySchema.parse({ from: "2026-09-01T00:00:00Z", to: "2026-08-01T00:00:00Z" }),
    ).toThrow();
    expect(() =>
      analyticsQuerySchema.parse({ from: "2025-01-01T00:00:00Z", to: "2026-09-01T00:00:00Z" }),
    ).toThrow();
    expect(() =>
      analyticsQuerySchema.parse({
        from: "2026-08-01T00:00:00Z",
        to: "2026-09-01T00:00:00Z",
        timezone: "Mars/Olympus",
      }),
    ).toThrow();
  });
});
