import type { NextRequest } from "next/server";
import { unpublishStoreProduct } from "@yinne/storefront";
import { apiRoute } from "../../../../../../lib/api";

export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    listing: await unpublishStoreProduct(context, (await params).id),
  }));
}
