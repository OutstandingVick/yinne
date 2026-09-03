import type { NextRequest } from "next/server";
import { createSubscriptionPlanSchema, subscriptionPlanListQuerySchema } from "@yinne/contracts";
import { createPlan, listPlans } from "@yinne/subscriptions";
import { apiRoute } from "../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, (context) =>
    listPlans(
      context,
      subscriptionPlanListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
    ),
  );
}
export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => ({
      plan: await createPlan(context, createSubscriptionPlanSchema.parse(await request.json())),
    }),
    { successStatus: 201 },
  );
}
