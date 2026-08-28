import type { NextRequest } from "next/server";
import { z } from "zod";
import { variantInputSchema } from "@yinne/contracts";
import { createVariant } from "@yinne/commerce";
import { apiRoute } from "../../../../../lib/api";
export function POST(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  return apiRoute(
    request,
    async (context) => ({
      variant: await createVariant(
        context,
        z
          .string()
          .uuid()
          .parse((await route.params).id),
        variantInputSchema.parse(await request.json()),
      ),
    }),
    { authenticated: true, rateLimit: 40, successStatus: 201 },
  );
}
