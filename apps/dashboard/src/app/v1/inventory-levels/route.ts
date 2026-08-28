import type { NextRequest } from "next/server";
import { inventoryListQuerySchema } from "@yinne/contracts";
import { listInventoryLevels } from "@yinne/commerce";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, async (context) =>
    listInventoryLevels(
      context,
      inventoryListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
    ),
  );
}
