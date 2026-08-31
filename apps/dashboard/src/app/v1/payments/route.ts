import type { NextRequest } from "next/server";
import {
  ApiError,
  createPaymentSchema,
  idempotencyKeySchema,
  paymentListQuerySchema,
} from "@yinne/contracts";
import { createPayment, listPayments } from "@yinne/payments";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, (context) =>
    listPayments(
      context,
      paymentListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
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
        payment: await createPayment(
          context,
          createPaymentSchema.parse(await request.json()),
          idempotencyKeySchema.parse(key),
        ),
      };
    },
    { authenticated: true, rateLimit: 20, successStatus: 201 },
  );
}
