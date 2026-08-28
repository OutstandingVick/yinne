import type { NextRequest } from "next/server";
import { z } from "zod";
import { revokeApiKey } from "@yinne/organizations/services";
import { apiRoute } from "../../../../../lib/api";

export function POST(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  return apiRoute(
    request,
    async (context) => {
      const { id } = await route.params;
      const apiKeyId = z.string().uuid().parse(id);
      return { api_key: await revokeApiKey(context, apiKeyId) };
    },
    { authenticated: true, rateLimit: 20 },
  );
}
