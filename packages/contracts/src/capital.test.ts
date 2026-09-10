import { describe, expect, it } from "vitest";
import { capitalRecalculateSchema } from "./capital";

describe("capital contracts", () => {
  it("accepts bounded recalculation inputs", () => {
    expect(capitalRecalculateSchema.parse({ currency: "NGN" }).currency).toBe("NGN");
  });

  it("rejects unknown score injection fields", () => {
    expect(() => capitalRecalculateSchema.parse({ score: 100 })).toThrow();
  });
});
