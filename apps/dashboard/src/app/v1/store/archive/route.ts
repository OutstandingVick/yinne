import type { NextRequest } from "next/server";
import { transitionStore } from "@yinne/storefront";
import { apiRoute } from "../../../../lib/api";

export function POST(request: NextRequest) {
  return apiRoute(request, async (context) => ({
    store: await transitionStore(context, "archived"),
  }));
}
