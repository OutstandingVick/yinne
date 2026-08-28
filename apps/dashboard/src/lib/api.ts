import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { ApiError, errorBody } from "@yinne/contracts";
import { allowedOrigins } from "@yinne/config";
import { createRequestId } from "@yinne/core";
import { authenticateApiKey } from "@yinne/organizations/identity";
import type { RequestContext } from "@yinne/application";
import { activeUserContext } from "./context";
import { enforceRateLimit } from "./rate-limit";
import { logger } from "./logger";
import { apiResponseValue } from "./api-response";

function bearer(request: NextRequest): string | null {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice(7);
}

async function requestContext(request: NextRequest, requestId: string): Promise<RequestContext> {
  const secret = bearer(request);
  if (secret) {
    const principal = await authenticateApiKey(secret);
    if (!principal)
      throw new ApiError(
        401,
        "authentication_error",
        "invalid_api_key",
        "The API key is invalid, expired, or revoked.",
      );
    return {
      tenant: { organizationId: principal.organizationId, environment: principal.environment },
      principal,
      requestId,
      ...(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ? { ipAddress: request.headers.get("x-forwarded-for")!.split(",")[0]!.trim() }
        : {}),
      ...(request.headers.get("user-agent")
        ? { userAgent: request.headers.get("user-agent")! }
        : {}),
    };
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const sameOriginBrowserRequest =
      !origin && request.headers.get("sec-fetch-site") === "same-origin";
    if (!sameOriginBrowserRequest && (!origin || !allowedOrigins().has(origin)))
      throw new ApiError(
        403,
        "authorization_error",
        "invalid_origin",
        "The request origin is not allowed.",
      );
  }
  return activeUserContext(requestId);
}

export async function apiRoute(
  request: NextRequest,
  handler: (context: RequestContext) => Promise<Record<string, unknown> | Array<unknown>>,
  options: { authenticated?: boolean; rateLimit?: number; successStatus?: number } = {
    authenticated: true,
  },
): Promise<NextResponse> {
  const supplied = request.headers.get("x-request-id");
  const requestId =
    supplied && /^[A-Za-z0-9_-]{8,100}$/.test(supplied) ? supplied : createRequestId();
  try {
    enforceRateLimit(
      (request.headers.get("x-forwarded-for") ?? "local") + ":" + request.nextUrl.pathname,
      options.rateLimit ?? 120,
    );
    const context =
      options.authenticated === false ? null : await requestContext(request, requestId);
    const result = apiResponseValue(await handler(context as RequestContext));
    return NextResponse.json(
      Array.isArray(result)
        ? { data: result, request_id: requestId }
        : { ...(result as Record<string, unknown>), request_id: requestId },
      {
        status: options.successStatus ?? 200,
        headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" },
      },
    );
  } catch (caught) {
    let error: ApiError;
    if (caught instanceof ApiError) error = caught;
    else if (caught instanceof ZodError) {
      error = new ApiError(
        400,
        "invalid_request",
        "validation_failed",
        "The request is invalid.",
        caught.issues[0]?.path.join(".") ?? null,
        caught.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      );
    } else {
      logger.error({ err: caught, requestId }, "Unhandled API error");
      error = new ApiError(500, "internal_error", "internal_error", "An internal error occurred.");
    }
    return NextResponse.json(errorBody(error, requestId), {
      status: error.status,
      headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" },
    });
  }
}
