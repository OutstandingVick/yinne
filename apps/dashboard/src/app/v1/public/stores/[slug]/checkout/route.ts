import type { NextRequest } from "next/server";
import { storefrontCartSchema, storeSlugSchema } from "@yinne/contracts";
import { createPublicStoreCheckout } from "@yinne/storefront";
import { apiRoute } from "../../../../../../lib/api";

export function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return apiRoute(
    request,
    async () => ({
      checkout_session: await createPublicStoreCheckout(
        storeSlugSchema.parse((await params).slug),
        storefrontCartSchema.parse(await request.json()),
        "test",
        request.nextUrl.origin,
      ),
    }),
    { authenticated: false, rateLimit: 10, successStatus: 201 },
  );
}
