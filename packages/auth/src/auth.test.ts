import { describe, expect, it } from "vitest";
import { generateApiKey, parseApiKeyPrefix, verifyApiKey } from "./api-keys";
import { hashPassword, verifyPassword } from "./passwords";

const pepper = "a-secure-test-pepper-that-is-longer-than-32";

describe("credential primitives", () => {
  it("hashes local passwords with Argon2id", async () => {
    const hash = await hashPassword("A long test passphrase!");
    expect(hash).toContain("$argon2id$");
    await expect(verifyPassword(hash, "A long test passphrase!")).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong password")).resolves.toBe(false);
  });

  it("creates once-visible API keys and verifies keyed digests", () => {
    const key = generateApiKey("test", pepper);
    expect(parseApiKeyPrefix(key.secret)).toBe(key.prefix);
    expect(verifyApiKey(key.secret, key.digest, pepper)).toBe(true);
    expect(verifyApiKey(key.secret + "x", key.digest, pepper)).toBe(false);
    expect(key.digest).not.toContain(key.secret);
  });
});
