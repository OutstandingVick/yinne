import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ApiError } from "@yinne/contracts";
import { apiKeys } from "@yinne/database";
import { authenticateApiKey } from "./identity";
import { createApiKey, listAuditLogs, revokeApiKey, type RequestContext } from "./services";

const adminUrl = process.env.MIGRATION_DATABASE_URL;
const run = adminUrl ? describe : describe.skip;
const organizationId = "0198f000-0000-7000-8000-000000000001";
const ownerContext: RequestContext = {
  tenant: { organizationId, environment: "test" },
  principal: {
    type: "user",
    userId: "0198f000-0000-7000-8000-000000000020",
    memberId: "0198f000-0000-7000-8000-000000000040",
    organizationId,
    environment: "test",
  },
  requestId: "req_api_key_integration",
};
const staffContext: RequestContext = {
  tenant: { organizationId, environment: "test" },
  principal: {
    type: "user",
    userId: "0198f000-0000-7000-8000-000000000024",
    memberId: "0198f000-0000-7000-8000-000000000044",
    organizationId,
    environment: "test",
  },
  requestId: "req_staff_integration",
};
const pepper = process.env.API_KEY_PEPPER ?? "";

run("API key and authorization foundation", () => {
  const adminClient = postgres(adminUrl!, { max: 1, prepare: false });
  const admin = drizzle(adminClient);
  const createdIds: string[] = [];

  afterAll(async () => {
    for (const id of createdIds) await admin.delete(apiKeys).where(eq(apiKeys.id, id));
    await adminClient.end();
  });

  it("authenticates a valid key and rejects it after revocation without storing plaintext", async () => {
    const created = await createApiKey(
      ownerContext,
      {
        name: "Integration key",
        environment: "test",
        scopes: ["organization:read"],
      },
      pepper,
    );
    createdIds.push(created.id);

    const [stored] = await admin.select().from(apiKeys).where(eq(apiKeys.id, created.id));
    expect(stored).toBeDefined();
    expect(stored!.secretDigest).not.toContain(created.secret);
    expect(JSON.stringify(stored)).not.toContain(created.secret);

    const principal = await authenticateApiKey(created.secret);
    expect(principal).toMatchObject({
      organizationId,
      environment: "test",
      scopes: ["organization:read"],
    });

    await revokeApiKey(ownerContext, created.id);
    await expect(authenticateApiKey(created.secret)).resolves.toBeNull();

    const audits = await listAuditLogs(ownerContext, 20);
    expect(audits.some((log) => log.action === "api_key.created")).toBe(true);
    expect(audits.some((log) => log.action === "api_key.revoked")).toBe(true);
    expect(JSON.stringify(audits)).not.toContain(created.secret);
  });

  it("rejects a role without API key permission", async () => {
    await expect(
      createApiKey(
        staffContext,
        {
          name: "Forbidden key",
          environment: "test",
          scopes: ["organization:read"],
        },
        pepper,
      ),
    ).rejects.toMatchObject({ code: "permission_denied" } satisfies Partial<ApiError>);
  });

  it("rejects a live key in test context", async () => {
    await expect(
      createApiKey(
        ownerContext,
        {
          name: "Wrong environment",
          environment: "live",
          scopes: ["organization:read"],
        },
        pepper,
      ),
    ).rejects.toMatchObject({ code: "environment_mismatch" } satisfies Partial<ApiError>);
  });
});
