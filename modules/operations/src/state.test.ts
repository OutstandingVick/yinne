import { describe, expect, it } from "vitest";
import { assertLocationTransition } from "./state";

describe("location lifecycle", () => {
  it.each([
    ["active", "inactive"],
    ["inactive", "active"],
    ["active", "archived"],
    ["inactive", "archived"],
  ] as const)("allows %s to become %s", (from, to) => {
    expect(() => assertLocationTransition(from, to)).not.toThrow();
  });

  it.each([
    ["archived", "active"],
    ["archived", "inactive"],
    ["active", "active"],
  ] as const)("rejects %s to %s", (from, to) => {
    expect(() => assertLocationTransition(from, to)).toThrow("Location cannot transition");
  });
});
