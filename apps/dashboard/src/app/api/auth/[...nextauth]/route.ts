import { NextResponse, type NextRequest } from "next/server";
import { ApiError, errorBody } from "@yinne/contracts";
import { createRequestId } from "@yinne/core";
import { handlers } from "../../../../auth";
import { enforceRateLimit } from "../../../../lib/rate-limit";

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    enforceRateLimit((request.headers.get("x-forwarded-for") ?? "local") + ":auth", 20, 5 * 60_000);
    return handlers.POST(request);
  } catch (caught) {
    if (!(caught instanceof ApiError)) throw caught;
    return NextResponse.json(errorBody(caught, requestId), {
      status: caught.status,
      headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" },
    });
  }
}
