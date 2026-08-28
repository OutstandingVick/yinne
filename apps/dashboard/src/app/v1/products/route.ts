import type { NextRequest } from "next/server";
import { createProductSchema, productListQuerySchema } from "@yinne/contracts";
import { createProduct, listProducts } from "@yinne/commerce";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, async (context) =>
    listProducts(
      context,
      productListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
    ),
  );
}
export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => ({
      product: await createProduct(context, createProductSchema.parse(await request.json())),
    }),
    { authenticated: true, rateLimit: 40, successStatus: 201 },
  );
}
