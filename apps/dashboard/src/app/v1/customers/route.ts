import type { NextRequest } from "next/server";
import { createCustomerSchema, customerListQuerySchema } from "@yinne/contracts";
import { createCustomer, listCustomers } from "@yinne/commerce";
import { apiRoute } from "../../../lib/api";

export function GET(request: NextRequest) {
  return apiRoute(request, async (context) =>
    listCustomers(
      context,
      customerListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
    ),
  );
}
export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => ({
      customer: await createCustomer(context, createCustomerSchema.parse(await request.json())),
    }),
    { authenticated: true, rateLimit: 60, successStatus: 201 },
  );
}
