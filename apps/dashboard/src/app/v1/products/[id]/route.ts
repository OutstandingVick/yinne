import type { NextRequest } from "next/server";
import { z } from "zod";
import { updateProductSchema } from "@yinne/contracts";
import { getProduct, updateProduct } from "@yinne/commerce";
import { apiRoute } from "../../../../lib/api";
const id = z.string().uuid();
export function GET(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    product: await getProduct(context, id.parse((await route.params).id)),
  }));
}
export function PATCH(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  return apiRoute(
    request,
    async (context) => ({
      product: await updateProduct(
        context,
        id.parse((await route.params).id),
        updateProductSchema.parse(await request.json()),
      ),
    }),
    { authenticated: true, rateLimit: 40 },
  );
}
