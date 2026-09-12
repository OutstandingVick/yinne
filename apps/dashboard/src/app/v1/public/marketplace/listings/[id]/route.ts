import type { NextRequest } from "next/server";
import { getPublicMarketplaceListing } from "@yinne/marketplace";
import { apiRoute } from "../../../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(
    request,
    async () => ({ listing: await getPublicMarketplaceListing((await params).id) }),
    { authenticated: false, rateLimit: 60 },
  );
}
