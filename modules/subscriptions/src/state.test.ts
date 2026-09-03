import { describe, expect, it } from "vitest";
import { assertSubscriptionTransition } from "./state";
describe("subscription lifecycle", () => {
  it.each([["trialing", "active"], ["active", "past_due"], ["past_due", "active"], ["active", "paused"], ["paused", "active"], ["active", "cancelled"]] as const)("allows %s to %s", (from, to) => expect(() => assertSubscriptionTransition(from, to)).not.toThrow());
  it("keeps terminal states terminal", () => {
    expect(() => assertSubscriptionTransition("cancelled", "active")).toThrow("cannot transition");
    expect(() => assertSubscriptionTransition("ended", "active")).toThrow("cannot transition");
  });
});
