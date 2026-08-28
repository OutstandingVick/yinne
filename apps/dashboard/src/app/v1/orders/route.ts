import type { NextRequest } from "next/server";
import {
  ApiError,
  createOrderSchema,
  idempotencyKeySchema,
  orderListQuerySchema,
} from "@yinne/contracts";
import { createOrder, listOrders } from "@yinne/commerce";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, async (context) =>
    listOrders(
      context,
      orderListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
    ),
  );
}
export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => {
      const supplied = request.headers.get("idempotency-key");
      if (!supplied)
        throw new ApiError(
          400,
          "invalid_request",
          "idempotency_key_required",
          "An Idempotency-Key header is required.",
          "Idempotency-Key",
        );
      return {
        order: await createOrder(
          context,
          createOrderSchema.parse(await request.json()),
          idempotencyKeySchema.parse(supplied),
        ),
      };
    },
    { authenticated: true, rateLimit: 30, successStatus: 201 },
  );
}
