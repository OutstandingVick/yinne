import type { NextRequest } from "next/server";
import { payInvoiceSchema } from "@yinne/contracts";
import { getPublicInvoice, payPublicInvoice } from "@yinne/invoicing";
import { apiRoute } from "../../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return apiRoute(
    request,
    async () => ({ invoice: await getPublicInvoice((await params).token) }),
    { authenticated: false, rateLimit: 60 },
  );
}
export function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return apiRoute(
    request,
    async () => ({
      checkout_session: await payPublicInvoice(
        (await params).token,
        payInvoiceSchema.parse(await request.json()).idempotency_key,
        request.nextUrl.origin,
      ),
    }),
    { authenticated: false, rateLimit: 10, successStatus: 201 },
  );
}
