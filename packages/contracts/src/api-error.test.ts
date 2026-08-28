import { describe, expect, it } from "vitest";
import { ApiError, apiErrorSchema, errorBody } from "./api-error";

describe("API error normalization", () => {
  it("produces the canonical safe shape", () => {
    const body = errorBody(
      new ApiError(
        404,
        "invalid_request",
        "resource_not_found",
        "The requested resource does not exist.",
      ),
      "req_test",
    );
    expect(apiErrorSchema.parse(body).error).toMatchObject({
      type: "invalid_request",
      code: "resource_not_found",
      param: null,
      request_id: "req_test",
    });
    expect(JSON.stringify(body)).not.toContain("stack");
  });
});
