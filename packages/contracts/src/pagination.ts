import { z } from "zod";

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  after: z.string().min(1).optional(),
});

export function page<T>(data: T[], limit: number, cursorOf: (item: T) => string) {
  const hasMore = data.length > limit;
  const visible = hasMore ? data.slice(0, limit) : data;
  const last = visible.at(-1);
  return {
    data: visible,
    has_more: hasMore,
    next_cursor: hasMore && last ? cursorOf(last) : null,
  };
}
