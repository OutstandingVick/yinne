import type { NextRequest } from "next/server";
import { z } from "zod";
import { cancelOrder } from "@yinne/commerce";
import { apiRoute } from "../../../../../lib/api";
export function POST(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  return apiRoute(
    request,
    async (context) => ({
      order: await cancelOrder(
        context,
        z
          .string()
          .uuid()
          .parse((await route.params).id),
      ),
    }),
    { authenticated: true, rateLimit: 30 },
  );
}
