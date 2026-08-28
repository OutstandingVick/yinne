import { ApiError } from "@yinne/contracts";

export interface Cursor {
  createdAt: Date;
  id: string;
}

export function encodeCursor(value: Cursor): string {
  return Buffer.from(JSON.stringify([value.createdAt.toISOString(), value.id])).toString(
    "base64url",
  );
}

export function decodeCursor(value?: string): Cursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 2 ||
      typeof parsed[0] !== "string" ||
      typeof parsed[1] !== "string"
    )
      throw new Error();
    const createdAt = new Date(parsed[0]);
    if (Number.isNaN(createdAt.valueOf()) || !/^[0-9a-f-]{36}$/i.test(parsed[1])) throw new Error();
    return { createdAt, id: parsed[1] };
  } catch {
    throw new ApiError(
      400,
      "invalid_request",
      "invalid_cursor",
      "The pagination cursor is invalid.",
      "after",
    );
  }
}

export function paged<T extends Cursor>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data.at(-1);
  return { data, has_more: hasMore, next_cursor: hasMore && last ? encodeCursor(last) : null };
}

export function notFound(): never {
  throw new ApiError(
    404,
    "invalid_request",
    "resource_not_found",
    "The requested resource does not exist.",
  );
}

export function conflict(code: string, message: string, param: string | null = null): never {
  throw new ApiError(409, "conflict", code, message, param);
}

export function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== "object" || current === null) return false;
    if ((current as { code?: string }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
