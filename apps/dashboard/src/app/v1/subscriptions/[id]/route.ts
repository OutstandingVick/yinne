import type { NextRequest } from "next/server";
import { getSubscription } from "@yinne/subscriptions";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({ subscription: await getSubscription(context, (await params).id) }));
}
