import type { NextRequest } from "next/server";
import { storefrontListQuerySchema, storeSlugSchema } from "@yinne/contracts";
import { listPublicProducts } from "@yinne/storefront";
import { apiRoute } from "../../../../../../lib/api";

export function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return apiRoute(
    request,
    async () => {
      const query = storefrontListQuerySchema.parse(
        Object.fromEntries(request.nextUrl.searchParams),
      );
      return listPublicProducts(storeSlugSchema.parse((await params).slug), query.limit);
    },
    { authenticated: false, rateLimit: 120 },
  );
}
