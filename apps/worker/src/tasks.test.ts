import { describe, expect, it } from "vitest";
import { outboxDispatchPayloadSchema } from "./tasks";

describe("worker task registration", () => {
  it("validates tenant-aware outbox payloads", () => {
    expect(
      outboxDispatchPayloadSchema.parse({
        organizationId: "0198f000-0000-7000-8000-000000000001",
        environment: "test",
        outboxMessageId: "0198f000-0000-7000-8000-000000000081",
      }).environment,
    ).toBe("test");
    expect(() =>
      outboxDispatchPayloadSchema.parse({
        organizationId: "not-an-id",
        environment: "live",
        outboxMessageId: "not-an-id",
      }),
    ).toThrow();
  });
});
