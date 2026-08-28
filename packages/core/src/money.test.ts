import { describe, expect, it } from "vitest";
import {
  POSTGRES_BIGINT_MAX,
  addMinorAmounts,
  multiplyMinorAmount,
  parseMinorAmount,
} from "./money";
describe("minor-unit money", () => {
  it("parses integer strings without floating point", () => {
    expect(parseMinorAmount("9007199254740993")).toBe(9_007_199_254_740_993n);
  });
  it("rejects decimals, signs, leading zeros, and overflow", () => {
    for (const value of ["1.00", "-1", "+1", "01", (POSTGRES_BIGINT_MAX + 1n).toString()])
      expect(() => parseMinorAmount(value)).toThrow();
  });
  it("multiplies and adds with checked bigint bounds", () => {
    expect(multiplyMinorAmount(350000n, 3)).toBe(1050000n);
    expect(addMinorAmounts([1050000n, 220000n])).toBe(1270000n);
    expect(() => multiplyMinorAmount(POSTGRES_BIGINT_MAX, 2)).toThrow();
  });
});
