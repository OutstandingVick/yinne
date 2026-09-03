import { describe, expect, it } from "vitest";
import {
  analyticsRefreshPayloadSchema,
  outboxDispatchPayloadSchema,
  subscriptionBillingPayloadSchema,
} from "./tasks";

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

  it("validates bounded recurring billing payloads", () => {
    const payload = subscriptionBillingPayloadSchema.parse({
      organizationId: "0198f000-0000-7000-8000-000000000001",
      environment: "test",
      dueAt: "2026-09-03T00:00:00.000Z",
    });
    expect(payload.limit).toBe(50);
    expect(payload.dueAt).toEqual(new Date("2026-09-03T00:00:00.000Z"));
  });

  it("validates replay-safe analytics refresh windows", () => {
    const payload = analyticsRefreshPayloadSchema.parse({
      organizationId: "0198f000-0000-7000-8000-000000000001",
      environment: "test",
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-09-01T00:00:00.000Z",
    });
    expect(payload.timezone).toBe("Africa/Lagos");
    expect(payload.from).toBeInstanceOf(Date);
  });
});
