import { describe, expect, it } from "vitest";
import { createId, createRequestId, fromPublicId, isUuidV7, toPublicId } from "./ids";

describe("identifier strategy", () => {
  it("creates UUIDv7 database IDs and reversible public IDs", () => {
    const id = createId();
    expect(isUuidV7(id)).toBe(true);
    expect(fromPublicId(toPublicId("org", id), "org")).toBe(id);
    expect(createRequestId()).toMatch(/^req_[0-9a-f]{32}$/);
  });

  it("rejects a mismatched prefix", () => {
    expect(() => fromPublicId(toPublicId("org", createId()), "usr")).toThrow();
  });
});
