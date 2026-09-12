import type { NextRequest } from "next/server";
import { marketplaceProfileSchema } from "@yinne/contracts";
import { getMarketplaceProfile, upsertMarketplaceProfile } from "@yinne/marketplace";
import { apiRoute } from "../../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => ({ profile: await getMarketplaceProfile(context) }));
}

export function PUT(request: NextRequest) {
  return apiRoute(request, async (context) => ({ profile: await upsertMarketplaceProfile(context, marketplaceProfileSchema.parse(await request.json())) }));
}
