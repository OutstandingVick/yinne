import type { NextRequest } from "next/server";
import { confirmCheckout } from "@yinne/checkout";
import { ApiError, confirmCheckoutSchema, idempotencyKeySchema } from "@yinne/contracts";
import { apiRoute } from "../../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        checkout_session: await confirmCheckout(
          context,
          (await params).id,
          confirmCheckoutSchema.parse(await request.json()),
          idempotencyKeySchema.parse(key),
        ),
      };
    },
    { rateLimit: 20 },
  );
}
