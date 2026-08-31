import type { NextRequest } from "next/server";
import { getCheckoutSession } from "@yinne/checkout";
import { apiRoute } from "../../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    checkout_session: await getCheckoutSession(context, (await params).id),
  }));
}
