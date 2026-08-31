import type { NextRequest } from "next/server";
import { getPayment } from "@yinne/payments";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    payment: await getPayment(context, (await params).id),
  }));
}
