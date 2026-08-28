import type { NextRequest } from "next/server";
import { ApiError, paginationQuerySchema, page } from "@yinne/contracts";
import { listEvents } from "@yinne/organizations/services";
import { apiRoute } from "../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => {
    const query = paginationQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const after = query.after
      ? new Date(Buffer.from(query.after, "base64url").toString("utf8"))
      : undefined;
    if (after && Number.isNaN(after.valueOf())) {
      throw new ApiError(
        400,
        "invalid_request",
        "invalid_cursor",
        "The pagination cursor is invalid.",
        "after",
      );
    }
    const rows = await listEvents(context, query.limit, after);
    return page(rows, query.limit, (event) =>
      Buffer.from(event.createdAt.toISOString()).toString("base64url"),
    );
  });
}
