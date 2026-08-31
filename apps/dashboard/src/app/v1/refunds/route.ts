import type { NextRequest } from "next/server";
import {
  ApiError,
  createRefundSchema,
  idempotencyKeySchema,
  refundListQuerySchema,
} from "@yinne/contracts";
import { createRefund, listRefunds } from "@yinne/payments";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, (context) =>
    listRefunds(
      context,
      refundListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
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
        refund: await createRefund(
          context,
          createRefundSchema.parse(await request.json()),
          idempotencyKeySchema.parse(key),
        ),
      };
    },
    { authenticated: true, rateLimit: 20, successStatus: 201 },
  );
}
