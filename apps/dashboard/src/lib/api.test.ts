import { describe, expect, it } from "vitest";
import { apiResponseValue } from "./api-response";

describe("API response serialization", () => {
  it("normalizes nested success payloads to snake_case without changing dates", () => {
    const createdAt = new Date("2026-08-27T12:00:00.000Z");
    expect(
      apiResponseValue({
        organizationId: "org-id",
        createdAt,
        children: [{ lastUsedAt: null }],
      }),
    ).toEqual({
      organization_id: "org-id",
      created_at: createdAt,
      children: [{ last_used_at: null }],
    });
  });
});
