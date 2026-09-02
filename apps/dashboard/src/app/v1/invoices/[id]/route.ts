import type { NextRequest } from "next/server";
import { updateInvoiceSchema } from "@yinne/contracts";
import { getInvoice, updateInvoice } from "@yinne/invoicing";
import { apiRoute } from "../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    invoice: await getInvoice(context, (await params).id),
  }));
}
export function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => ({
    invoice: await updateInvoice(
      context,
      (await params).id,
      updateInvoiceSchema.parse(await request.json()),
    ),
  }));
}
