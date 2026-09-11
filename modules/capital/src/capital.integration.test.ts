import { describe, expect, it } from "vitest";
import type { RequestContext } from "@yinne/application";
import { calculateCapitalProfile, capitalProfileHistory, currentCapitalProfile } from "./service";

const run = process.env.MIGRATION_DATABASE_URL ? describe : describe.skip;
const organizationId = "0198f000-0000-7000-8000-000000000001";
const context: RequestContext = {
  tenant: { organizationId, environment: "test" },
  principal: { type: "system", id: "capital-test", organizationId, environment: "test" },
  requestId: "req_capital_integration",
};

run("Capital PostgreSQL snapshots", () => {
  it("reads the seeded current profile and immutable history", async () => {
    const current = await currentCapitalProfile(context);
    const history = await capitalProfileHistory(context, 10);
    expect(current).toMatchObject({ score: 72, band: "stable", model_version: "rules-1" });
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0]?.score_change?.delta).toBe(1);
  });

  it("converges duplicate period and model calculations", async () => {
    const asOf = new Date("2026-09-01T12:00:00.000Z");
    const first = await calculateCapitalProfile(context, asOf, "NGN");
    const second = await calculateCapitalProfile(context, asOf, "NGN");
    expect(second.id).toBe(first.id);
    expect(second.model_version).toBe("rules-1");
  });

  it("isolates live history from test history", async () => {
    const live = await capitalProfileHistory(
      {
        ...context,
        tenant: { organizationId, environment: "live" },
        principal: { ...context.principal, environment: "live" },
      },
      10,
    );
    expect(live).toEqual([]);
  });
});
