import type { NextRequest } from "next/server";
import { cancelSubscriptionSchema } from "@yinne/contracts";
import { cancelSubscription } from "@yinne/subscriptions";
import { apiRoute } from "../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    subscription: await cancelSubscription(
      context,
      (await params).id,
      cancelSubscriptionSchema.parse(await request.json()),
    ),
  }));
}
