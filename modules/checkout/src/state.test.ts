import { describe, expect, it } from "vitest";
import { canTransitionCheckout, shouldExpireCheckout } from "./state";
describe("Checkout state machine", () => {
  it("allows only canonical forward and retry transitions", () => {
    expect(canTransitionCheckout("open", "processing")).toBe(true);
    expect(canTransitionCheckout("processing", "open")).toBe(true);
    expect(canTransitionCheckout("processing", "completed")).toBe(true);
    expect(canTransitionCheckout("completed", "open")).toBe(false);
    expect(canTransitionCheckout("expired", "processing")).toBe(false);
  });
  it("expires only an open session at the boundary", () => {
    const now = new Date("2026-08-28T12:00:00Z");
    expect(shouldExpireCheckout("open", now, now)).toBe(true);
    expect(shouldExpireCheckout("processing", new Date(now.getTime() - 1), now)).toBe(false);
    expect(shouldExpireCheckout("open", new Date(now.getTime() + 1), now)).toBe(false);
  });
});
