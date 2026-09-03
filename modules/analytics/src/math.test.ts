import { describe, expect, it } from "vitest";
import { decimalRatio, divideRoundHalfUp, normalizeMrr, serializeMoney } from "./math";

describe("analytics integer math", () => {
  it("rounds money without binary floating point", () => {
    expect(divideRoundHalfUp(5n, 2n)).toBe(3n);
    expect(divideRoundHalfUp(-5n, 2n)).toBe(-3n);
    expect(normalizeMrr(120_005n, "year", 1)).toBe(10_000n);
  });

  it("represents zero denominators and currency partitions explicitly", () => {
    expect(decimalRatio(1n, 0n)).toMatchObject({ value: null, reason: "not_comparable" });
    expect(decimalRatio(1n, 4n).value).toBe("0.250000");
    expect(serializeMoney({ USD: 100n, NGN: 500n })).toEqual({ NGN: "500", USD: "100" });
  });
});
