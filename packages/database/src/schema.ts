import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createId } from "@yinne/core";

const id = () => uuid("id").primaryKey().$defaultFn(createId);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    authSubject: text("auth_subject"),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("users_normalized_email_uidx").on(table.normalizedEmail),
    uniqueIndex("users_auth_subject_uidx").on(table.authSubject),
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("active"),
    defaultCurrency: text("default_currency").notNull(),
    timezone: text("timezone").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("organizations_slug_uidx").on(table.slug)],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("invited"),
    version: integer("version").notNull().default(1),
    staffProfile: jsonb("staff_profile").$type<Record<string, unknown>>().notNull().default({}),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("organization_members_org_user_uidx").on(table.organizationId, table.userId),
    uniqueIndex("organization_members_org_id_uidx").on(table.organizationId, table.id),
    index("organization_members_user_status_idx").on(table.userId, table.status),
  ],
);

export const roles = pgTable(
  "roles",
  {
    id: id(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    system: boolean("system").notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("roles_key_uidx").on(table.key)],
);

export const permissions = pgTable(
  "permissions",
  {
    id: id(),
    key: text("key").notNull(),
    description: text("description").notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("permissions_key_uidx").on(table.key)],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("role_permissions_role_permission_uidx").on(table.roleId, table.permissionId),
  ],
);

export const roleAssignments = pgTable(
  "role_assignments",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    memberId: uuid("member_id").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    scopeType: text("scope_type").notNull(),
    scopeId: uuid("scope_id").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "role_assignments_member_org_fk",
      columns: [table.organizationId, table.memberId],
      foreignColumns: [organizationMembers.organizationId, organizationMembers.id],
    }).onDelete("cascade"),
    uniqueIndex("role_assignments_unique_scope_uidx").on(
      table.organizationId,
      table.memberId,
      table.roleId,
      table.scopeType,
      table.scopeId,
    ),
    index("role_assignments_member_idx").on(table.organizationId, table.memberId),
  ],
);

export const merchants = pgTable(
  "merchants",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    legalName: text("legal_name"),
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("merchants_org_slug_uidx").on(table.organizationId, table.slug),
    uniqueIndex("merchants_org_id_uidx").on(table.organizationId, table.id),
    index("merchants_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const locations = pgTable(
  "locations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    merchantId: uuid("merchant_id").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    timezone: text("timezone").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "locations_merchant_org_fk",
      columns: [table.organizationId, table.merchantId],
      foreignColumns: [merchants.organizationId, merchants.id],
    }),
    uniqueIndex("locations_org_merchant_name_uidx").on(
      table.organizationId,
      table.merchantId,
      table.name,
    ),
    uniqueIndex("locations_org_id_uidx").on(table.organizationId, table.id),
    index("locations_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    secretDigest: text("secret_digest").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    environment: text("environment").notNull(),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("api_keys_prefix_uidx").on(table.prefix),
    uniqueIndex("api_keys_org_id_uidx").on(table.organizationId, table.id),
    index("api_keys_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    outcome: text("outcome").notNull().default("succeeded"),
    requestId: text("request_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_logs_org_created_idx").on(table.organizationId, table.createdAt),
    index("audit_logs_org_actor_idx").on(table.organizationId, table.actorType, table.actorId),
    index("audit_logs_org_target_idx").on(table.organizationId, table.targetType, table.targetId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    type: text("type").notNull(),
    version: integer("version").notNull(),
    apiVersion: text("api_version").notNull(),
    environment: text("environment").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    aggregateVersion: integer("aggregate_version").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").notNull(),
    requestId: text("request_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("events_aggregate_version_uidx").on(
      table.organizationId,
      table.aggregateType,
      table.aggregateId,
      table.aggregateVersion,
      table.type,
    ),
    uniqueIndex("events_org_id_uidx").on(table.organizationId, table.id),
    index("events_org_type_created_idx").on(table.organizationId, table.type, table.createdAt),
  ],
);

export const outboxMessages = pgTable(
  "outbox_messages",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    eventId: uuid("event_id").notNull(),
    topic: text("topic").notNull(),
    state: text("state").notNull().default("pending"),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "outbox_event_org_fk",
      columns: [table.organizationId, table.eventId],
      foreignColumns: [events.organizationId, events.id],
    }),
    uniqueIndex("outbox_event_topic_uidx").on(table.eventId, table.topic),
    index("outbox_state_available_idx").on(table.state, table.availableAt),
  ],
);

export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    principalId: text("principal_id").notNull(),
    operation: text("operation").notNull(),
    environment: text("environment").notNull(),
    keyDigest: text("key_digest").notNull(),
    requestDigest: text("request_digest").notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body").$type<Record<string, unknown>>(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("idempotency_scope_key_uidx").on(
      table.organizationId,
      table.principalId,
      table.operation,
      table.environment,
      table.keyDigest,
    ),
    index("idempotency_expiry_idx").on(table.expiresAt),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    externalRef: text("external_ref"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("customers_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("customers_org_external_ref_uidx")
      .on(table.organizationId, table.externalRef)
      .where(sql`${table.externalRef} is not null`),
    index("customers_org_email_idx").on(table.organizationId, table.email),
    index("customers_org_created_idx").on(table.organizationId, table.createdAt, table.id),
  ],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("products_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("products_org_slug_uidx").on(table.organizationId, table.slug),
    index("products_org_status_created_idx").on(
      table.organizationId,
      table.status,
      table.createdAt,
    ),
    check("products_status_check", sql`${table.status} in ('draft', 'active', 'archived')`),
  ],
);

export const variants = pgTable(
  "variants",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    productId: uuid("product_id").notNull(),
    sku: text("sku").notNull(),
    title: text("title").notNull(),
    unitAmount: bigint("unit_amount", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    trackInventory: boolean("track_inventory").notNull().default(true),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "variants_product_org_fk",
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
    }),
    uniqueIndex("variants_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("variants_org_sku_uidx").on(table.organizationId, table.sku),
    index("variants_org_product_idx").on(table.organizationId, table.productId),
    check("variants_unit_amount_check", sql`${table.unitAmount} >= 0`),
    check("variants_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check("variants_status_check", sql`${table.status} in ('active', 'archived')`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    merchantId: uuid("merchant_id").notNull(),
    locationId: uuid("location_id").notNull(),
    customerId: uuid("customer_id"),
    number: text("number").notNull(),
    financialStatus: text("financial_status").notNull().default("unpaid"),
    fulfilmentStatus: text("fulfilment_status").notNull().default("unfulfilled"),
    currency: text("currency").notNull(),
    subtotalAmount: bigint("subtotal_amount", { mode: "bigint" }).notNull(),
    totalAmount: bigint("total_amount", { mode: "bigint" }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "orders_merchant_org_fk",
      columns: [table.organizationId, table.merchantId],
      foreignColumns: [merchants.organizationId, merchants.id],
    }),
    foreignKey({
      name: "orders_location_org_fk",
      columns: [table.organizationId, table.locationId],
      foreignColumns: [locations.organizationId, locations.id],
    }),
    foreignKey({
      name: "orders_customer_org_fk",
      columns: [table.organizationId, table.customerId],
      foreignColumns: [customers.organizationId, customers.id],
    }),
    uniqueIndex("orders_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("orders_org_number_uidx").on(table.organizationId, table.number),
    index("orders_org_created_idx").on(table.organizationId, table.createdAt, table.id),
    index("orders_org_location_created_idx").on(
      table.organizationId,
      table.locationId,
      table.createdAt,
    ),
    index("orders_org_customer_idx").on(table.organizationId, table.customerId),
    check(
      "orders_financial_status_check",
      sql`${table.financialStatus} in ('unpaid', 'paid', 'partially_refunded', 'refunded')`,
    ),
    check(
      "orders_fulfilment_status_check",
      sql`${table.fulfilmentStatus} in ('unfulfilled', 'fulfilled', 'cancelled')`,
    ),
    check("orders_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      "orders_amounts_check",
      sql`${table.subtotalAmount} >= 0 and ${table.totalAmount} >= 0 and ${table.totalAmount} = ${table.subtotalAmount}`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    orderId: uuid("order_id").notNull(),
    variantId: uuid("variant_id"),
    productName: text("product_name").notNull(),
    variantTitle: text("variant_title").notNull(),
    sku: text("sku").notNull(),
    unitAmount: bigint("unit_amount", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    quantity: integer("quantity").notNull(),
    totalAmount: bigint("total_amount", { mode: "bigint" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "order_items_order_org_fk",
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "order_items_variant_org_fk",
      columns: [table.organizationId, table.variantId],
      foreignColumns: [variants.organizationId, variants.id],
    }),
    uniqueIndex("order_items_org_id_uidx").on(table.organizationId, table.id),
    index("order_items_org_order_idx").on(table.organizationId, table.orderId),
    check("order_items_quantity_check", sql`${table.quantity} > 0 and ${table.quantity} <= 10000`),
    check(
      "order_items_amounts_check",
      sql`${table.unitAmount} >= 0 and ${table.totalAmount} = ${table.unitAmount} * ${table.quantity}`,
    ),
    check("order_items_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const inventoryLevels = pgTable(
  "inventory_levels",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    variantId: uuid("variant_id").notNull(),
    locationId: uuid("location_id").notNull(),
    onHand: bigint("on_hand", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "inventory_levels_variant_org_fk",
      columns: [table.organizationId, table.variantId],
      foreignColumns: [variants.organizationId, variants.id],
    }),
    foreignKey({
      name: "inventory_levels_location_org_fk",
      columns: [table.organizationId, table.locationId],
      foreignColumns: [locations.organizationId, locations.id],
    }),
    uniqueIndex("inventory_levels_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("inventory_levels_org_variant_location_uidx").on(
      table.organizationId,
      table.variantId,
      table.locationId,
    ),
    index("inventory_levels_org_location_idx").on(table.organizationId, table.locationId),
    check("inventory_levels_nonnegative_check", sql`${table.onHand} >= 0`),
  ],
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    inventoryLevelId: uuid("inventory_level_id").notNull(),
    delta: bigint("delta", { mode: "bigint" }).notNull(),
    resultingOnHand: bigint("resulting_on_hand", { mode: "bigint" }).notNull(),
    reason: text("reason").notNull(),
    orderId: uuid("order_id"),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "inventory_movements_level_org_fk",
      columns: [table.organizationId, table.inventoryLevelId],
      foreignColumns: [inventoryLevels.organizationId, inventoryLevels.id],
    }),
    foreignKey({
      name: "inventory_movements_order_org_fk",
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
    }),
    uniqueIndex("inventory_movements_org_id_uidx").on(table.organizationId, table.id),
    index("inventory_movements_org_level_created_idx").on(
      table.organizationId,
      table.inventoryLevelId,
      table.createdAt,
    ),
    check("inventory_movements_delta_check", sql`${table.delta} <> 0`),
    check("inventory_movements_result_check", sql`${table.resultingOnHand} >= 0`),
  ],
);

export const seedVersions = pgTable("seed_versions", {
  key: text("key").primaryKey(),
  version: integer("version").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});
