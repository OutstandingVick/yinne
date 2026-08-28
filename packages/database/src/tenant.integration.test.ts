import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { customers, organizations } from "./schema";
import { withTenantTransaction, database, closeDatabase } from "./index";

const adminUrl = process.env.MIGRATION_DATABASE_URL;
const run = adminUrl ? describe : describe.skip;
const orgA = "0198f100-0000-7000-8000-000000000001";
const orgB = "0198f100-0000-7000-8000-000000000002";

run("PostgreSQL tenant boundary", () => {
  const adminClient = postgres(adminUrl!, { max: 1, prepare: false });
  const admin = drizzle(adminClient);

  afterAll(async () => {
    await admin.delete(customers).where(eq(customers.organizationId, orgA));
    await admin.delete(customers).where(eq(customers.organizationId, orgB));
    await admin.delete(organizations).where(eq(organizations.id, orgA));
    await admin.delete(organizations).where(eq(organizations.id, orgB));
    await adminClient.end();
    await closeDatabase();
  });

  it("prevents Organization A from reading Organization B", async () => {
    await admin
      .insert(organizations)
      .values([
        {
          id: orgA,
          name: "Tenant A",
          slug: "integration-tenant-a",
          defaultCurrency: "NGN",
          timezone: "Africa/Lagos",
        },
        {
          id: orgB,
          name: "Tenant B",
          slug: "integration-tenant-b",
          defaultCurrency: "USD",
          timezone: "UTC",
        },
      ])
      .onConflictDoNothing();

    const own = await withTenantTransaction({ organizationId: orgA, environment: "test" }, (tx) =>
      tx.select().from(organizations).where(eq(organizations.id, orgA)),
    );
    const foreign = await withTenantTransaction(
      { organizationId: orgA, environment: "test" },
      (tx) => tx.select().from(organizations).where(eq(organizations.id, orgB)),
    );
    const unscoped = await database.select().from(organizations).where(eq(organizations.id, orgA));

    expect(own).toHaveLength(1);
    expect(foreign).toHaveLength(0);
    expect(unscoped).toHaveLength(0);
  });

  it("forces isolation on Phase 2 commerce tables", async () => {
    await admin.insert(customers).values({ organizationId: orgB, name: "Tenant B customer" });
    const foreign = await withTenantTransaction(
      { organizationId: orgA, environment: "test" },
      (tx) => tx.select().from(customers),
    );
    const unscoped = await database
      .select()
      .from(customers)
      .where(eq(customers.organizationId, orgB));
    expect(foreign).toHaveLength(0);
    expect(unscoped).toHaveLength(0);
  });
});
