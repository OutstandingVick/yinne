import type { NextRequest } from "next/server";
import { updateStoreSchema } from "@yinne/contracts";
import { getStore, updateStore } from "@yinne/storefront";
import { apiRoute } from "../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => ({ store: await getStore(context) }));
}

export function PATCH(request: NextRequest) {
  return apiRoute(request, async (context) => ({
    store: await updateStore(context, updateStoreSchema.parse(await request.json())),
  }));
}
