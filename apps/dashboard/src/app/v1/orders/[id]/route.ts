import type { NextRequest } from "next/server";
import { z } from "zod";
import { getOrder } from "@yinne/commerce";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    order: await getOrder(
      context,
      z
        .string()
        .uuid()
        .parse((await route.params).id),
    ),
  }));
}
