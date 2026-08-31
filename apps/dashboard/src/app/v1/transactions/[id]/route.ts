import type { NextRequest } from "next/server";
import { getTransaction } from "@yinne/payments";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    transaction: await getTransaction(context, (await params).id),
  }));
}
