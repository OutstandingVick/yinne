import type { NextRequest } from "next/server";
import { marketplaceSearchSchema } from "@yinne/contracts";
import { searchPublicMarketplace } from "@yinne/marketplace";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(
    request,
    async () =>
      searchPublicMarketplace(
        marketplaceSearchSchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
      ),
    { authenticated: false, rateLimit: 60 },
  );
}
