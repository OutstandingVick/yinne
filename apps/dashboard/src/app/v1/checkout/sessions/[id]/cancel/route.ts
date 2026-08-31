import type { NextRequest } from "next/server";
import { cancelCheckout } from "@yinne/checkout";
import { apiRoute } from "../../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    checkout_session: await cancelCheckout(context, (await params).id),
  }));
}
