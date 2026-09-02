import type { NextRequest } from "next/server";
import { voidInvoice } from "@yinne/invoicing";
import { apiRoute } from "../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    invoice: await voidInvoice(context, (await params).id),
  }));
}
