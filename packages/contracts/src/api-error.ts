import { z } from "zod";

export const apiErrorTypes = [
  "authentication_error",
  "authorization_error",
  "invalid_request",
  "conflict",
  "rate_limit",
  "provider_error",
  "internal_error",
] as const;

export const apiErrorSchema = z.object({
  error: z.object({
    type: z.enum(apiErrorTypes),
    code: z.string().min(1),
    message: z.string().min(1),
    param: z.string().nullable(),
    request_id: z.string().min(1),
    doc_url: z.string().url().optional(),
    details: z.array(z.record(z.unknown())).default([]),
  }),
});

export type ApiErrorType = (typeof apiErrorTypes)[number];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly type: ApiErrorType,
    public readonly code: string,
    message: string,
    public readonly param: string | null = null,
    public readonly details: Array<Record<string, unknown>> = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorBody(error: ApiError, requestId: string): z.infer<typeof apiErrorSchema> {
  return {
    error: {
      type: error.type,
      code: error.code,
      message: error.message,
      param: error.param,
      request_id: requestId,
      details: error.details,
    },
  };
}
