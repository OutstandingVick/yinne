import type { NextRequest } from "next/server";
import { marketplaceCheckoutSchema } from "@yinne/contracts";
import { createMarketplaceCheckout } from "@yinne/marketplace";
import { apiRoute } from "../../../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(
    request,
    async () => ({
      checkout_session: await createMarketplaceCheckout(
        (await params).id,
        marketplaceCheckoutSchema.parse(await request.json()),
        "test",
        request.nextUrl.origin,
      ),
    }),
    { authenticated: false, rateLimit: 10, successStatus: 201 },
  );
}
