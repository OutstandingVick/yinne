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
    "provider_accounts",
    "payments",
    "payment_attempts",
    "refunds",
    "transactions",
    "provider_events",
    "webhook_endpoints",
    "webhook_subscriptions",
    "webhook_deliveries",
    "payment_links",
    "checkout_sessions",
    "checkout_line_items",
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
  const [immutability] = await client<
    {
      movement_update: boolean;
      item_delete: boolean;
      transaction_update: boolean;
      checkout_item_update: boolean;
      checkout_item_delete: boolean;
    }[]
  >`
    select has_table_privilege(current_user, 'inventory_movements', 'UPDATE') as movement_update,
           has_table_privilege(current_user, 'order_items', 'DELETE') as item_delete,
           has_table_privilege(current_user, 'transactions', 'UPDATE') as transaction_update,
           has_table_privilege(current_user, 'checkout_line_items', 'UPDATE') as checkout_item_update,
           has_table_privilege(current_user, 'checkout_line_items', 'DELETE') as checkout_item_delete
  `;
  if (
    !immutability ||
    immutability.movement_update ||
    immutability.item_delete ||
    immutability.transaction_update ||
    immutability.checkout_item_update ||
    immutability.checkout_item_delete
  )
    throw new Error("Append-only grants are not configured correctly.");
  console.log(
    `Database role, forced RLS on ${tenantTables.length} tables, and append-only grants verified.`,
  );
} finally {
  await client.end();
}
