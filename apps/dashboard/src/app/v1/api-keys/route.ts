import type { NextRequest } from "next/server";
import { createApiKeySchema } from "@yinne/contracts";
import { env } from "@yinne/config";
import { createApiKey, listApiKeys } from "@yinne/organizations/services";
import { apiRoute } from "../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => ({ api_keys: await listApiKeys(context) }));
}

export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => {
      const input = createApiKeySchema.parse(await request.json());
      const apiKey = await createApiKey(context, input, env().API_KEY_PEPPER);
      return { api_key: apiKey };
    },
    { authenticated: true, rateLimit: 20, successStatus: 201 },
  );
}
