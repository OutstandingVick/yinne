import type { NextRequest } from "next/server";
import { confirmPublicCheckout, getPublicCheckout } from "@yinne/checkout";
import { ApiError, confirmCheckoutSchema, idempotencyKeySchema } from "@yinne/contracts";
import { apiRoute } from "../../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return apiRoute(
    request,
    async () => ({ checkout_session: await getPublicCheckout((await params).token) }),
    { authenticated: false, rateLimit: 60 },
  );
}
export function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return apiRoute(
    request,
    async () => {
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
        checkout_session: await confirmPublicCheckout(
          (await params).token,
          confirmCheckoutSchema.parse(await request.json()),
          idempotencyKeySchema.parse(key),
        ),
      };
    },
    { authenticated: false, rateLimit: 10 },
  );
}
