import type { NextRequest } from "next/server";
import { capitalProfileHistory } from "@yinne/capital";
import { capitalHistoryQuerySchema } from "@yinne/contracts";
import { apiRoute } from "../../../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => {
    const query = capitalHistoryQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return { profiles: await capitalProfileHistory(context, query.limit) };
  });
}
