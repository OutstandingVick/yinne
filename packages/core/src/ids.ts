import { validate as isUuid, version as uuidVersion, v7 as uuidv7 } from "uuid";

export const resourcePrefixes = [
  "usr",
  "org",
  "mem",
  "role",
  "perm",
  "rassign",
  "mer",
  "loc",
  "key",
  "aud",
  "evt",
  "out",
  "idem",
  "req",
] as const;

export type ResourcePrefix = (typeof resourcePrefixes)[number];

export function createId(): string {
  return uuidv7();
}

export function createRequestId(): string {
  return toPublicId("req", createId());
}

export function isUuidV7(value: string): boolean {
  return isUuid(value) && uuidVersion(value) === 7;
}

export function toPublicId(prefix: ResourcePrefix, id: string): string {
  if (!isUuid(id)) throw new TypeError("A valid UUID is required.");
  return prefix + "_" + id.replaceAll("-", "");
}

export function fromPublicId(value: string, expected: ResourcePrefix): string {
  const marker = expected + "_";
  if (!value.startsWith(marker)) throw new TypeError("Invalid resource identifier.");
  const compact = value.slice(marker.length);
  if (!/^[0-9a-f]{32}$/i.test(compact)) throw new TypeError("Invalid resource identifier.");
  const id = compact.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
  if (!isUuid(id)) throw new TypeError("Invalid resource identifier.");
  return id;
}
