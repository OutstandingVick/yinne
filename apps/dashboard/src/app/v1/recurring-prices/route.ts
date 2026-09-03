import type { NextRequest } from "next/server";
import { createRecurringPriceSchema, recurringPriceListQuerySchema } from "@yinne/contracts";
import { createPrice, listPrices } from "@yinne/subscriptions";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, (context) =>
    listPrices(
      context,
      recurringPriceListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
    ),
  );
}
export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => ({
      price: await createPrice(context, createRecurringPriceSchema.parse(await request.json())),
    }),
    { successStatus: 201 },
  );
}
