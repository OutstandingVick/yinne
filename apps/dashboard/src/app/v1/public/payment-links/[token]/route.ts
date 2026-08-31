import type { NextRequest } from "next/server";
import { getPublicPaymentLink, openPublicPaymentLink } from "@yinne/checkout";
import { openPaymentLinkSchema } from "@yinne/contracts";
import { apiRoute } from "../../../../../lib/api";
export function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return apiRoute(
    request,
    async () => ({ payment_link: await getPublicPaymentLink((await params).token) }),
    { authenticated: false, rateLimit: 60 },
  );
}
export function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return apiRoute(
    request,
    async () => {
      const body = openPaymentLinkSchema.parse(await request.json());
      return {
        checkout_session: await openPublicPaymentLink(
          (await params).token,
          body.amount,
          body.idempotency_key,
        ),
      };
    },
    { authenticated: false, successStatus: 201, rateLimit: 10 },
  );
}
