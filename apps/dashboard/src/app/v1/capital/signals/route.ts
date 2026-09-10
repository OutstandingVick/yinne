import type { NextRequest } from "next/server";
import { currentCapitalProfile } from "@yinne/capital";
import { apiRoute } from "../../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => {
    const profile = await currentCapitalProfile(context);
    return {
      profile_id: profile?.id ?? null,
      model_version: profile?.model_version ?? null,
      signals: profile?.signals ?? [],
    };
  });
}
