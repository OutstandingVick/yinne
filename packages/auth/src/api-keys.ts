import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { OperatingMode } from "@yinne/core";

export interface GeneratedApiKey {
  secret: string;
  prefix: string;
  digest: string;
}

function digestSecret(secret: string, pepper: string): string {
  return createHmac("sha256", pepper).update(secret, "utf8").digest("hex");
}

export function generateApiKey(mode: OperatingMode, pepper: string): GeneratedApiKey {
  if (pepper.length < 32)
    throw new TypeError("API key pepper must contain at least 32 characters.");
  const material = randomBytes(32).toString("base64url");
  const prefixToken = randomBytes(6).toString("hex");
  const prefix = "yk_" + mode + "_" + prefixToken;
  const secret = prefix + "_" + material;
  return { secret, prefix, digest: digestSecret(secret, pepper) };
}

export function parseApiKeyPrefix(secret: string): string | null {
  const match = /^(yk_(?:test|live)_[0-9a-f]{12})_[A-Za-z0-9_-]{43}$/.exec(secret);
  return match?.[1] ?? null;
}

export function verifyApiKey(secret: string, expectedDigest: string, pepper: string): boolean {
  const actual = Buffer.from(digestSecret(secret, pepper), "hex");
  const expected = Buffer.from(expectedDigest, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
