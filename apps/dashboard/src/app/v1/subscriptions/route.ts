import type { NextRequest } from "next/server";
import {
  createSubscriptionSchema,
  idempotencyKeySchema,
  subscriptionListQuerySchema,
} from "@yinne/contracts";
import {
  createSubscription,
  getSubscription,
  listSubscriptions,
  processSubscriptionRenewal,
} from "@yinne/subscriptions";
import { apiRoute } from "../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, (context) =>
    listSubscriptions(
      context,
      subscriptionListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
    ),
  );
}
export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => {
      const input = createSubscriptionSchema.parse(await request.json());
      const subscription = await createSubscription(
        context,
        input,
        idempotencyKeySchema.parse(request.headers.get("idempotency-key")),
      );
      if (
        input.trial_days === 0 &&
        typeof subscription === "object" &&
        subscription &&
        "id" in subscription
      ) {
        const id = String(subscription.id);
        await processSubscriptionRenewal(context, id);
        return { subscription: await getSubscription(context, id) };
      }
      return { subscription };
    },
    { successStatus: 201 },
  );
}
