import type { NextRequest } from "next/server";
import { pauseSubscription } from "@yinne/subscriptions";
import { apiRoute } from "../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    subscription: await pauseSubscription(context, (await params).id),
  }));
}
