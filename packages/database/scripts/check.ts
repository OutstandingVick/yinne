import { config as loadDotEnv } from "dotenv";
import postgres from "postgres";

loadDotEnv({ path: new URL("../../../.env", import.meta.url) });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const client = postgres(databaseUrl, { max: 1, prepare: false });
try {
  const tenantTables = [
    "organizations",
    "organization_members",
    "role_assignments",
    "merchants",
    "locations",
    "api_keys",
    "audit_logs",
    "events",
    "outbox_messages",
    "idempotency_records",
    "customers",
    "products",
    "variants",
    "inventory_levels",
    "inventory_movements",
    "orders",
    "order_items",
  ];
  const [result] = await client<{ current_user: string; protected_count: number }[]>`
    select current_user, count(*)::integer as protected_count
    from pg_class
    where relname in ${client(tenantTables)} and relrowsecurity and relforcerowsecurity
    group by current_user
  `;
  if (
    !result ||
    result.current_user !== "yinne_app" ||
    result.protected_count !== tenantTables.length
  ) {
    throw new Error("Database role or RLS is not configured correctly.");
  }
  const [immutability] = await client<{ movement_update: boolean; item_delete: boolean }[]>`
    select has_table_privilege(current_user, 'inventory_movements', 'UPDATE') as movement_update,
           has_table_privilege(current_user, 'order_items', 'DELETE') as item_delete
  `;
  if (!immutability || immutability.movement_update || immutability.item_delete)
    throw new Error("Append-only grants are not configured correctly.");
  console.log(
    `Database role, forced RLS on ${tenantTables.length} tables, and append-only grants verified.`,
  );
} finally {
  await client.end();
}
