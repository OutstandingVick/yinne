import type { NextRequest } from "next/server";
import { storeSlugSchema } from "@yinne/contracts";
import { getPublicProduct } from "@yinne/storefront";
import { apiRoute } from "../../../../../../../lib/api";

export function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; productSlug: string }> },
) {
  return apiRoute(
    request,
    async () => {
      const values = await params;
      return getPublicProduct(
        storeSlugSchema.parse(values.slug),
        storeSlugSchema.parse(values.productSlug),
      );
    },
    { authenticated: false, rateLimit: 120 },
  );
}
