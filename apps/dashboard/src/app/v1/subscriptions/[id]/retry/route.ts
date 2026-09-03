import type { NextRequest } from "next/server";
import { retrySubscriptionSchema } from "@yinne/contracts";
import { retrySubscription } from "@yinne/subscriptions";
import { apiRoute } from "../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({ renewal: await retrySubscription(context, (await params).id, retrySubscriptionSchema.parse(await request.json())) }));
}
