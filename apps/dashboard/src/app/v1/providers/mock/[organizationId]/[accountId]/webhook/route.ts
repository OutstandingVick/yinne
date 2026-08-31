import type { NextRequest } from "next/server";
import { createRequestId } from "@yinne/core";
import { ingestMockProviderWebhook } from "@yinne/payments";
import { apiRoute } from "../../../../../../../lib/api";
export function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; accountId: string }> },
) {
  return apiRoute(
    request,
    async () => {
      const value = await params;
      return ingestMockProviderWebhook({
        organizationId: value.organizationId,
        accountId: value.accountId,
        rawBody: await request.text(),
        signature: request.headers.get("yinne-mock-signature") ?? "",
        timestamp: request.headers.get("yinne-mock-timestamp") ?? "",
        requestId: createRequestId(),
      });
    },
    { authenticated: false, rateLimit: 60 },
  );
}
