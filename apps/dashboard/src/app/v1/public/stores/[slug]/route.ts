import type { NextRequest } from "next/server";
import { storeSlugSchema } from "@yinne/contracts";
import { resolvePublicStore } from "@yinne/storefront";
import { apiRoute } from "../../../../../lib/api";

export function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return apiRoute(
    request,
    async () => {
      const { store } = await resolvePublicStore(storeSlugSchema.parse((await params).slug));
      return { store };
    },
    { authenticated: false, rateLimit: 120 },
  );
}
