import type { NextRequest } from "next/server";
import { archivePrice } from "@yinne/subscriptions";
import { apiRoute } from "../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({ price: await archivePrice(context, (await params).id) }));
}
