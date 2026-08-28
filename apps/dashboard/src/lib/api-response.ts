function snakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (character) => "_" + character.toLowerCase());
}

export function apiResponseValue(value: unknown): unknown {
  if (value === null || value instanceof Date) return value;
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(apiResponseValue);
  if (typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [snakeCase(key), apiResponseValue(nested)]),
  );
}
