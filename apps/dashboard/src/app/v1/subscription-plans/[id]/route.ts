import type { NextRequest } from "next/server";
import { getPlan } from "@yinne/subscriptions";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    plan: await getPlan(context, (await params).id),
  }));
}
