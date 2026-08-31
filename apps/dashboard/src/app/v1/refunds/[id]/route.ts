import type { NextRequest } from "next/server";
import { getRefund } from "@yinne/payments";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    refund: await getRefund(context, (await params).id),
  }));
}
