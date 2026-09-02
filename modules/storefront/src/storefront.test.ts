import { describe, expect, it } from "vitest";
import {
  reservedStoreSlugs,
  storeAppearanceSchema,
  storefrontCartSchema,
  storeSlugSchema,
} from "@yinne/contracts";
import { assertStoreTransition } from "./state";

describe("storefront safety contracts", () => {
  it("accepts public slugs and rejects reserved routes", () => {
    expect(storeSlugSchema.parse("acme-coffee")).toBe("acme-coffee");
    for (const slug of reservedStoreSlugs) expect(() => storeSlugSchema.parse(slug)).toThrow();
  });

  it("permits only constrained appearance tokens", () => {
    expect(storeAppearanceSchema.parse({}).primary_color).toBe("#1f6f50");
    expect(() =>
      storeAppearanceSchema.parse({ primary_color: "url(javascript:alert(1))" }),
    ).toThrow();
    expect(() => storeAppearanceSchema.parse({ custom_css: "body{}" })).toThrow();
  });

  it("rejects duplicate variants and unbounded quantities", () => {
    const id = "0198f000-0000-7000-8000-000000001200";
    expect(() =>
      storefrontCartSchema.parse({
        idempotency_key: "storefront-test-key",
        items: [
          { variant_id: id, quantity: 1 },
          { variant_id: id, quantity: 1 },
        ],
      }),
    ).toThrow();
    expect(() =>
      storefrontCartSchema.parse({
        idempotency_key: "storefront-test-key",
        items: [{ variant_id: id, quantity: 101 }],
      }),
    ).toThrow();
  });

  it("enforces activation, pause, and terminal archive transitions", () => {
    expect(() => assertStoreTransition("draft", "active")).not.toThrow();
    expect(() => assertStoreTransition("active", "paused")).not.toThrow();
    expect(() => assertStoreTransition("paused", "active")).not.toThrow();
    expect(() => assertStoreTransition("archived", "active")).toThrow();
  });
});
