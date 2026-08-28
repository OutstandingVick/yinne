import { sql } from "drizzle-orm";
import { database } from "./client";
import type { OperatingMode } from "@yinne/core";

export interface TenantContext {
  organizationId: string;
  environment: OperatingMode;
}

export type TenantTransaction = Parameters<Parameters<typeof database.transaction>[0]>[0];

export async function withTenantTransaction<T>(
  context: TenantContext,
  work: (transaction: TenantTransaction) => Promise<T>,
): Promise<T> {
  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select set_config('app.organization_id', ${context.organizationId}, true)`,
    );
    await transaction.execute(
      sql`select set_config('app.environment', ${context.environment}, true)`,
    );
    return work(transaction);
  });
}
