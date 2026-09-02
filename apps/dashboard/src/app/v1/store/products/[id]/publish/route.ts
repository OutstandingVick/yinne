import type { NextRequest } from "next/server";
import { publishStoreProductSchema } from "@yinne/contracts";
import { publishStoreProduct } from "@yinne/storefront";
import { apiRoute } from "../../../../../../lib/api";

export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(
    request,
    async (context) => ({
      listing: await publishStoreProduct(
        context,
        (await params).id,
        publishStoreProductSchema.parse(await request.json()),
      ),
    }),
    { successStatus: 201 },
  );
}
