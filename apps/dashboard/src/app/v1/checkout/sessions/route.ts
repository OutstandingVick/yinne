import type { NextRequest } from "next/server";
import {
  createCheckoutSessionSchema,
  checkoutListQuerySchema,
  idempotencyKeySchema,
  ApiError,
} from "@yinne/contracts";
import { createCheckoutSession, listCheckoutSessions } from "@yinne/checkout";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, (context) =>
    listCheckoutSessions(
      context,
      checkoutListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)) as Parameters<
        typeof listCheckoutSessions
      >[1],
    ),
  );
}
export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => {
      const key = request.headers.get("idempotency-key");
      if (!key)
        throw new ApiError(
          400,
          "invalid_request",
          "idempotency_key_required",
          "An Idempotency-Key header is required.",
          "Idempotency-Key",
        );
      return {
        checkout_session: await createCheckoutSession(
          context,
          createCheckoutSessionSchema.parse(await request.json()),
          idempotencyKeySchema.parse(key),
        ),
      };
    },
    { successStatus: 201, rateLimit: 30 },
  );
}
