import type { NextRequest } from "next/server";
import {
  createInvoiceSchema,
  idempotencyKeySchema,
  invoiceListQuerySchema,
} from "@yinne/contracts";
import { createInvoice, listInvoices } from "@yinne/invoicing";
import { apiRoute } from "../../../lib/api";
export function GET(request: NextRequest) {
  return apiRoute(request, async (context) =>
    listInvoices(
      context,
      invoiceListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams)),
    ),
  );
}
export function POST(request: NextRequest) {
  return apiRoute(
    request,
    async (context) => ({
      invoice: await createInvoice(
        context,
        createInvoiceSchema.parse(await request.json()),
        idempotencyKeySchema.parse(request.headers.get("idempotency-key")),
      ),
    }),
    { successStatus: 201 },
  );
}
