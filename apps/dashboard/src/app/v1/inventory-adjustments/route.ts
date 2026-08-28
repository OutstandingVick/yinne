import type { NextRequest } from "next/server";
import { adjustInventorySchema } from "@yinne/contracts";
import { adjustInventory } from "@yinne/commerce";
import { apiRoute } from "../../../lib/api";
export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => ({
      inventory_level: await adjustInventory(
        context,
        adjustInventorySchema.parse(await request.json()),
      ),
    }),
    { authenticated: true, rateLimit: 60, successStatus: 201 },
  );
}
