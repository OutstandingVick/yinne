import type { NextRequest } from "next/server";
import { idempotencyKeySchema } from "@yinne/contracts";
import { issueInvoice } from "@yinne/invoicing";
import { apiRoute } from "../../../../../lib/api";
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(request, async (context) => {
    idempotencyKeySchema.parse(request.headers.get("idempotency-key"));
    return { invoice: await issueInvoice(context, (await params).id) };
  });
}
