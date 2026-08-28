import { describe, expect, it } from "vitest";
import { createId } from "@yinne/core";
import { createEvent } from "./envelope";

describe("event envelope", () => {
  it("creates a versioned organization event", () => {
    const organizationId = createId();
    const event = createEvent({
      type: "organization.created",
      organizationId,
      environment: "test",
      aggregate: { type: "organization", id: organizationId, version: 1 },
      actor: { type: "system", id: "seed" },
      requestId: "req_test",
      data: { organization_id: organizationId },
    });
    expect(event.version).toBe(1);
    expect(event.apiVersion).toBe("2026-08-27");
    expect(event.organizationId).toBe(organizationId);
  });
});
