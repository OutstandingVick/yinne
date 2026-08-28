import type { NextRequest } from "next/server";
import { z } from "zod";
import { updateCustomerSchema } from "@yinne/contracts";
import { getCustomer, updateCustomer } from "@yinne/commerce";
import { apiRoute } from "../../../../lib/api";
const id = z.string().uuid();
export function GET(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    customer: await getCustomer(context, id.parse((await route.params).id)),
  }));
}
export function PATCH(request: NextRequest, route: { params: Promise<{ id: string }> }) {
  return apiRoute(
    request,
    async (context) => ({
      customer: await updateCustomer(
        context,
        id.parse((await route.params).id),
        updateCustomerSchema.parse(await request.json()),
      ),
    }),
    { authenticated: true, rateLimit: 60 },
  );
}
