import type { NextRequest } from "next/server";
import { getPaymentLink, updatePaymentLink } from "@yinne/checkout";
import { updatePaymentLinkSchema } from "@yinne/contracts";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    payment_link: await getPaymentLink(context, (await params).id),
  }));
}
export function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    payment_link: await updatePaymentLink(
      context,
      (await params).id,
      updatePaymentLinkSchema.parse(await request.json()),
    ),
  }));
}
