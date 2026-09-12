import type { NextRequest } from "next/server";
import { marketplaceListingInputSchema } from "@yinne/contracts";
import { createMarketplaceListing, listMarketplaceListings } from "@yinne/marketplace";
import { apiRoute } from "../../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => ({ data: await listMarketplaceListings(context) }));
}
export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => ({
      listing: await createMarketplaceListing(
        context,
        marketplaceListingInputSchema.parse(await request.json()),
      ),
    }),
    { successStatus: 201 },
  );
}
