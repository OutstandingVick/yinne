import type { NextRequest } from "next/server";
import { currentCapitalProfile } from "@yinne/capital";
import { apiRoute } from "../../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) => ({ profile: await currentCapitalProfile(context) }));
}
