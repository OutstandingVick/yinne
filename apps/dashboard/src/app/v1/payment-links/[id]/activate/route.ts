import type { NextRequest } from "next/server";
import { setPaymentLinkActive } from "@yinne/checkout";
import { apiRoute } from "../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    payment_link: await setPaymentLinkActive(context, (await params).id, true),
  }));
}
