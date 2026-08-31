import type { NextRequest } from "next/server";
import { createPaymentLink, listPaymentLinks } from "@yinne/checkout";
import {
  ApiError,
  createPaymentLinkSchema,
  idempotencyKeySchema,
  paymentLinkListQuerySchema,
} from "@yinne/contracts";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, (context) =>
    listPaymentLinks(
      context,
      paymentLinkListQuerySchema.parse(
        Object.fromEntries(request.nextUrl.searchParams),
      ) as Parameters<typeof listPaymentLinks>[1],
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
        payment_link: await createPaymentLink(
          context,
          createPaymentLinkSchema.parse(await request.json()),
          idempotencyKeySchema.parse(key),
        ),
      };
    },
    { successStatus: 201, rateLimit: 30 },
  );
}
