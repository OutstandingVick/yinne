import { describe, expect, it } from "vitest";
import { assertListingTransition } from "./state";
describe("Marketplace listing lifecycle", () => {
  it("supports the approved moderation lifecycle", () => {
    expect(() => assertListingTransition("draft", "submitted")).not.toThrow();
    expect(() => assertListingTransition("submitted", "approved")).not.toThrow();
    expect(() => assertListingTransition("approved", "suspended")).not.toThrow();
    expect(() => assertListingTransition("suspended", "submitted")).not.toThrow();
  });
  it("prevents bypassing moderation and reviving archives", () => {
    expect(() => assertListingTransition("draft", "approved")).toThrow(/cannot transition/);
    expect(() => assertListingTransition("archived", "submitted")).toThrow(/cannot transition/);
  });
});
