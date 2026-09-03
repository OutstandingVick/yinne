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
    code: text("code"),
    type: text("type").notNull(),
    timezone: text("timezone").notNull(),
    status: text("status").notNull().default("active"),
    address: jsonb("address").$type<Record<string, string>>().notNull().default({}),
    version: integer("version").notNull().default(1),
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
    uniqueIndex("locations_org_merchant_code_uidx")
      .on(table.organizationId, table.merchantId, table.code)
      .where(sql`${table.code} is not null`),
    index("locations_org_status_idx").on(table.organizationId, table.status),
    check(
      "locations_type_check",
      sql`${table.type} in ('branch', 'store', 'restaurant', 'office', 'warehouse', 'pop_up', 'agent')`,
    ),
    check("locations_status_check", sql`${table.status} in ('active', 'inactive', 'archived')`),
  ],
);

export const stores = pgTable(
  "stores",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    merchantId: uuid("merchant_id").notNull(),
    environment: text("environment").notNull(),
    publicName: text("public_name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    status: text("status").notNull().default("draft"),
    currency: text("currency").notNull(),
    defaultLocationId: uuid("default_location_id").notNull(),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    appearance: jsonb("appearance").$type<Record<string, string>>().notNull().default({}),
    catalogueVersion: integer("catalogue_version").notNull().default(1),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "stores_merchant_org_fk",
      columns: [table.organizationId, table.merchantId],
      foreignColumns: [merchants.organizationId, merchants.id],
    }),
    foreignKey({
      name: "stores_location_org_fk",
      columns: [table.organizationId, table.defaultLocationId],
      foreignColumns: [locations.organizationId, locations.id],
    }),
    uniqueIndex("stores_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("stores_org_merchant_env_uidx").on(
      table.organizationId,
      table.merchantId,
      table.environment,
    ),
    uniqueIndex("stores_environment_slug_uidx").on(table.environment, table.slug),
    index("stores_org_status_idx").on(table.organizationId, table.environment, table.status),
    check("stores_environment_check", sql`${table.environment} in ('test', 'live')`),
    check("stores_status_check", sql`${table.status} in ('draft', 'active', 'paused', 'archived')`),
    check("stores_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check("stores_catalogue_version_check", sql`${table.catalogueVersion} > 0`),
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

export const storeListings = pgTable(
  "store_listings",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    status: text("status").notNull().default("published"),
    featured: boolean("featured").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "store_listings_store_org_fk",
      columns: [table.organizationId, table.storeId],
      foreignColumns: [stores.organizationId, stores.id],
    }),
    foreignKey({
      name: "store_listings_product_org_fk",
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
    }),
    uniqueIndex("store_listings_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("store_listings_store_product_uidx").on(table.storeId, table.productId),
    index("store_listings_store_status_order_idx").on(
      table.storeId,
      table.status,
      table.displayOrder,
      table.id,
    ),
    check("store_listings_status_check", sql`${table.status} in ('published', 'unpublished')`),
    check("store_listings_display_order_check", sql`${table.displayOrder} >= 0`),
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

export const providerAccounts = pgTable(
  "provider_accounts",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    provider: text("provider").notNull(),
    label: text("label").notNull(),
    environment: text("environment").notNull(),
    capabilities: jsonb("capabilities").$type<string[]>().notNull(),
    supportedCurrencies: jsonb("supported_currencies").$type<string[]>().notNull(),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("enabled"),
    isDefault: boolean("is_default").notNull().default(false),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("provider_accounts_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("provider_accounts_org_provider_env_label_uidx").on(
      table.organizationId,
      table.provider,
      table.environment,
      table.label,
    ),
    uniqueIndex("provider_accounts_default_uidx")
      .on(table.organizationId, table.environment)
      .where(sql`${table.isDefault} and ${table.status} = 'enabled'`),
    index("provider_accounts_org_env_status_idx").on(
      table.organizationId,
      table.environment,
      table.status,
    ),
    check("provider_accounts_environment_check", sql`${table.environment} in ('test', 'live')`),
    check("provider_accounts_status_check", sql`${table.status} in ('enabled', 'disabled')`),
    check(
      "provider_accounts_mock_test_check",
      sql`${table.provider} <> 'mock' or ${table.environment} = 'test'`,
    ),
  ],
);

export const paymentLinks = pgTable(
  "payment_links",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    merchantId: uuid("merchant_id").notNull(),
    locationId: uuid("location_id").notNull(),
    publicTokenDigest: text("public_token_digest").notNull(),
    publicTokenPrefix: text("public_token_prefix").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("active"),
    variantId: uuid("variant_id"),
    quantity: integer("quantity"),
    fixedAmount: bigint("fixed_amount", { mode: "bigint" }),
    minimumAmount: bigint("minimum_amount", { mode: "bigint" }),
    maximumAmount: bigint("maximum_amount", { mode: "bigint" }),
    currency: text("currency").notNull(),
    usageLimit: integer("usage_limit"),
    completedUsageCount: integer("completed_usage_count").notNull().default(0),
    customerCapture: jsonb("customer_capture")
      .$type<{ name: boolean; email: boolean; phone: boolean }>()
      .notNull()
      .default({ name: true, email: true, phone: false }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "payment_links_merchant_org_fk",
      columns: [table.organizationId, table.merchantId],
      foreignColumns: [merchants.organizationId, merchants.id],
    }),
    foreignKey({
      name: "payment_links_location_org_fk",
      columns: [table.organizationId, table.locationId],
      foreignColumns: [locations.organizationId, locations.id],
    }),
    foreignKey({
      name: "payment_links_variant_org_fk",
      columns: [table.organizationId, table.variantId],
      foreignColumns: [variants.organizationId, variants.id],
    }),
    uniqueIndex("payment_links_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("payment_links_token_uidx").on(table.publicTokenDigest),
    index("payment_links_org_env_created_idx").on(
      table.organizationId,
      table.environment,
      table.createdAt,
      table.id,
    ),
    check("payment_links_environment_check", sql`${table.environment} in ('test', 'live')`),
    check("payment_links_kind_check", sql`${table.kind} in ('product', 'fixed', 'flexible')`),
    check("payment_links_status_check", sql`${table.status} in ('active', 'inactive')`),
    check("payment_links_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      "payment_links_usage_check",
      sql`${table.completedUsageCount} >= 0 and (${table.usageLimit} is null or (${table.usageLimit} > 0 and ${table.completedUsageCount} <= ${table.usageLimit}))`,
    ),
    check(
      "payment_links_amount_check",
      sql`(${table.kind} = 'product' and ${table.variantId} is not null and ${table.quantity} > 0 and ${table.fixedAmount} is null and ${table.minimumAmount} is null) or (${table.kind} = 'fixed' and ${table.variantId} is null and ${table.fixedAmount} > 0 and ${table.minimumAmount} is null) or (${table.kind} = 'flexible' and ${table.variantId} is null and ${table.fixedAmount} is null and ${table.minimumAmount} > 0 and (${table.maximumAmount} is null or ${table.maximumAmount} >= ${table.minimumAmount}))`,
    ),
  ],
);

export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    merchantId: uuid("merchant_id").notNull(),
    locationId: uuid("location_id").notNull(),
    paymentLinkId: uuid("payment_link_id"),
    customerId: uuid("customer_id"),
    orderId: uuid("order_id"),
    paymentId: uuid("payment_id"),
    publicTokenDigest: text("public_token_digest").notNull(),
    publicTokenPrefix: text("public_token_prefix").notNull(),
    status: text("status").notNull().default("open"),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    customerCapture: jsonb("customer_capture")
      .$type<{ name: boolean; email: boolean; phone: boolean }>()
      .notNull()
      .default({ name: true, email: true, phone: false }),
    customerDetails: jsonb("customer_details").$type<{
      name?: string;
      email?: string;
      phone?: string;
    }>(),
    successUrl: text("success_url"),
    cancelUrl: text("cancel_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    lateCompletion: boolean("late_completion").notNull().default(false),
    linkUsageCounted: boolean("link_usage_counted").notNull().default(false),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "checkout_sessions_merchant_org_fk",
      columns: [table.organizationId, table.merchantId],
      foreignColumns: [merchants.organizationId, merchants.id],
    }),
    foreignKey({
      name: "checkout_sessions_location_org_fk",
      columns: [table.organizationId, table.locationId],
      foreignColumns: [locations.organizationId, locations.id],
    }),
    foreignKey({
      name: "checkout_sessions_link_org_fk",
      columns: [table.organizationId, table.paymentLinkId],
      foreignColumns: [paymentLinks.organizationId, paymentLinks.id],
    }),
    foreignKey({
      name: "checkout_sessions_customer_org_fk",
      columns: [table.organizationId, table.customerId],
      foreignColumns: [customers.organizationId, customers.id],
    }),
    foreignKey({
      name: "checkout_sessions_order_org_fk",
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
    }),
    uniqueIndex("checkout_sessions_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("checkout_sessions_token_uidx").on(table.publicTokenDigest),
    uniqueIndex("checkout_sessions_order_uidx")
      .on(table.organizationId, table.environment, table.orderId)
      .where(sql`${table.orderId} is not null`),
    uniqueIndex("checkout_sessions_payment_uidx")
      .on(table.organizationId, table.environment, table.paymentId)
      .where(sql`${table.paymentId} is not null`),
    index("checkout_sessions_org_env_created_idx").on(
      table.organizationId,
      table.environment,
      table.createdAt,
      table.id,
    ),
    check("checkout_sessions_environment_check", sql`${table.environment} in ('test', 'live')`),
    check(
      "checkout_sessions_status_check",
      sql`${table.status} in ('open', 'processing', 'completed', 'expired', 'cancelled')`,
    ),
    check("checkout_sessions_amount_check", sql`${table.amount} > 0`),
    check("checkout_sessions_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const checkoutLineItems = pgTable(
  "checkout_line_items",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    checkoutSessionId: uuid("checkout_session_id").notNull(),
    variantId: uuid("variant_id"),
    description: text("description").notNull(),
    variantTitle: text("variant_title"),
    sku: text("sku"),
    unitAmount: bigint("unit_amount", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    quantity: integer("quantity").notNull(),
    totalAmount: bigint("total_amount", { mode: "bigint" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "checkout_items_session_org_fk",
      columns: [table.organizationId, table.checkoutSessionId],
      foreignColumns: [checkoutSessions.organizationId, checkoutSessions.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "checkout_items_variant_org_fk",
      columns: [table.organizationId, table.variantId],
      foreignColumns: [variants.organizationId, variants.id],
    }),
    uniqueIndex("checkout_items_org_id_uidx").on(table.organizationId, table.id),
    index("checkout_items_session_idx").on(table.organizationId, table.checkoutSessionId),
    check(
      "checkout_items_amount_check",
      sql`${table.unitAmount} > 0 and ${table.quantity} > 0 and ${table.totalAmount} = ${table.unitAmount} * ${table.quantity}`,
    ),
    check("checkout_items_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    orderId: uuid("order_id").notNull(),
    customerId: uuid("customer_id"),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("created"),
    providerAccountId: uuid("provider_account_id").notNull(),
    latestAttemptId: uuid("latest_attempt_id"),
    refundedAmount: bigint("refunded_amount", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    succeededAt: timestamp("succeeded_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "payments_order_org_fk",
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
    }),
    foreignKey({
      name: "payments_customer_org_fk",
      columns: [table.organizationId, table.customerId],
      foreignColumns: [customers.organizationId, customers.id],
    }),
    foreignKey({
      name: "payments_provider_account_org_fk",
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccounts.organizationId, providerAccounts.id],
    }),
    uniqueIndex("payments_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("payments_order_succeeded_uidx")
      .on(table.organizationId, table.environment, table.orderId)
      .where(sql`${table.status} in ('succeeded', 'partially_refunded', 'refunded')`),
    index("payments_org_env_created_idx").on(
      table.organizationId,
      table.environment,
      table.createdAt,
      table.id,
    ),
    index("payments_org_order_idx").on(table.organizationId, table.orderId),
    check("payments_environment_check", sql`${table.environment} in ('test', 'live')`),
    check(
      "payments_status_check",
      sql`${table.status} in ('created', 'pending', 'succeeded', 'failed', 'cancelled', 'partially_refunded', 'refunded')`,
    ),
    check("payments_amount_check", sql`${table.amount} > 0`),
    check(
      "payments_refunded_amount_check",
      sql`${table.refundedAmount} >= 0 and ${table.refundedAmount} <= ${table.amount}`,
    ),
    check("payments_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    paymentId: uuid("payment_id").notNull(),
    providerAccountId: uuid("provider_account_id").notNull(),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("created"),
    providerReference: text("provider_reference"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    requestMetadata: jsonb("request_metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    responseMetadata: jsonb("response_metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    version: integer("version").notNull().default(1),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "payment_attempts_payment_org_fk",
      columns: [table.organizationId, table.paymentId],
      foreignColumns: [payments.organizationId, payments.id],
    }),
    foreignKey({
      name: "payment_attempts_provider_account_org_fk",
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccounts.organizationId, providerAccounts.id],
    }),
    uniqueIndex("payment_attempts_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("payment_attempts_provider_ref_uidx")
      .on(table.providerAccountId, table.environment, table.providerReference)
      .where(sql`${table.providerReference} is not null`),
    uniqueIndex("payment_attempts_active_uidx")
      .on(table.organizationId, table.paymentId)
      .where(sql`${table.status} in ('created', 'submitted', 'pending', 'unknown')`),
    index("payment_attempts_org_payment_created_idx").on(
      table.organizationId,
      table.paymentId,
      table.createdAt,
    ),
    check("payment_attempts_environment_check", sql`${table.environment} in ('test', 'live')`),
    check(
      "payment_attempts_status_check",
      sql`${table.status} in ('created', 'submitted', 'pending', 'succeeded', 'failed', 'unknown')`,
    ),
  ],
);

export const refunds = pgTable(
  "refunds",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    paymentId: uuid("payment_id").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("created"),
    reason: text("reason").notNull(),
    providerReference: text("provider_reference"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "refunds_payment_org_fk",
      columns: [table.organizationId, table.paymentId],
      foreignColumns: [payments.organizationId, payments.id],
    }),
    uniqueIndex("refunds_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("refunds_provider_ref_uidx")
      .on(table.organizationId, table.environment, table.providerReference)
      .where(sql`${table.providerReference} is not null`),
    index("refunds_org_payment_created_idx").on(
      table.organizationId,
      table.paymentId,
      table.createdAt,
    ),
    check("refunds_environment_check", sql`${table.environment} in ('test', 'live')`),
    check(
      "refunds_status_check",
      sql`${table.status} in ('created', 'pending', 'succeeded', 'failed')`,
    ),
    check("refunds_amount_check", sql`${table.amount} > 0`),
    check("refunds_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    paymentId: uuid("payment_id").notNull(),
    refundId: uuid("refund_id"),
    kind: text("kind").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    providerReference: text("provider_reference").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "transactions_payment_org_fk",
      columns: [table.organizationId, table.paymentId],
      foreignColumns: [payments.organizationId, payments.id],
    }),
    foreignKey({
      name: "transactions_refund_org_fk",
      columns: [table.organizationId, table.refundId],
      foreignColumns: [refunds.organizationId, refunds.id],
    }),
    uniqueIndex("transactions_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("transactions_provider_evidence_uidx").on(
      table.organizationId,
      table.environment,
      table.kind,
      table.providerReference,
    ),
    index("transactions_org_payment_created_idx").on(
      table.organizationId,
      table.paymentId,
      table.createdAt,
    ),
    check("transactions_environment_check", sql`${table.environment} in ('test', 'live')`),
    check("transactions_kind_check", sql`${table.kind} in ('charge', 'refund')`),
    check("transactions_amount_check", sql`${table.amount} > 0`),
    check("transactions_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const providerEvents = pgTable(
  "provider_events",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    providerAccountId: uuid("provider_account_id").notNull(),
    externalId: text("external_id").notNull(),
    type: text("type").notNull(),
    objectReference: text("object_reference").notNull(),
    payloadDigest: text("payload_digest").notNull(),
    normalizedData: jsonb("normalized_data").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("received"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "provider_events_account_org_fk",
      columns: [table.organizationId, table.providerAccountId],
      foreignColumns: [providerAccounts.organizationId, providerAccounts.id],
    }),
    uniqueIndex("provider_events_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("provider_events_account_external_uidx").on(
      table.providerAccountId,
      table.environment,
      table.externalId,
    ),
    index("provider_events_org_received_idx").on(table.organizationId, table.receivedAt, table.id),
    check("provider_events_environment_check", sql`${table.environment} in ('test', 'live')`),
    check(
      "provider_events_status_check",
      sql`${table.status} in ('received', 'processed', 'ignored', 'failed')`,
    ),
  ],
);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    url: text("url").notNull(),
    secretCiphertext: text("secret_ciphertext").notNull(),
    status: text("status").notNull().default("enabled"),
    failureCount: integer("failure_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("webhook_endpoints_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("webhook_endpoints_org_env_url_uidx").on(
      table.organizationId,
      table.environment,
      table.url,
    ),
    check("webhook_endpoints_environment_check", sql`${table.environment} in ('test', 'live')`),
    check("webhook_endpoints_status_check", sql`${table.status} in ('enabled', 'disabled')`),
  ],
);

export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    endpointId: uuid("endpoint_id").notNull(),
    eventPattern: text("event_pattern").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "webhook_subscriptions_endpoint_org_fk",
      columns: [table.organizationId, table.endpointId],
      foreignColumns: [webhookEndpoints.organizationId, webhookEndpoints.id],
    }).onDelete("cascade"),
    uniqueIndex("webhook_subscriptions_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("webhook_subscriptions_endpoint_pattern_uidx").on(
      table.endpointId,
      table.eventPattern,
    ),
  ],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    eventId: uuid("event_id").notNull(),
    endpointId: uuid("endpoint_id").notNull(),
    generation: integer("generation").notNull().default(1),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    lastStatusCode: integer("last_status_code"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "webhook_deliveries_event_org_fk",
      columns: [table.organizationId, table.eventId],
      foreignColumns: [events.organizationId, events.id],
    }),
    foreignKey({
      name: "webhook_deliveries_endpoint_org_fk",
      columns: [table.organizationId, table.endpointId],
      foreignColumns: [webhookEndpoints.organizationId, webhookEndpoints.id],
    }),
    uniqueIndex("webhook_deliveries_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("webhook_deliveries_event_endpoint_generation_uidx").on(
      table.eventId,
      table.endpointId,
      table.generation,
    ),
    index("webhook_deliveries_status_next_idx").on(table.status, table.nextAttemptAt),
    check("webhook_deliveries_environment_check", sql`${table.environment} in ('test', 'live')`),
    check(
      "webhook_deliveries_status_check",
      sql`${table.status} in ('queued', 'delivering', 'retry_scheduled', 'succeeded', 'failed', 'disabled')`,
    ),
  ],
);

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("subscription_plans_org_id_uidx").on(table.organizationId, table.id),
    index("subscription_plans_org_status_idx").on(
      table.organizationId,
      table.status,
      table.createdAt,
    ),
    check("subscription_plans_status_check", sql`${table.status} in ('active', 'archived')`),
  ],
);

export const recurringPrices = pgTable(
  "recurring_prices",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    planId: uuid("plan_id").notNull(),
    currency: text("currency").notNull(),
    unitAmount: bigint("unit_amount", { mode: "bigint" }).notNull(),
    interval: text("interval").notNull(),
    intervalCount: integer("interval_count").notNull().default(1),
    status: text("status").notNull().default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "recurring_prices_plan_org_fk",
      columns: [table.organizationId, table.planId],
      foreignColumns: [subscriptionPlans.organizationId, subscriptionPlans.id],
    }),
    uniqueIndex("recurring_prices_org_id_uidx").on(table.organizationId, table.id),
    index("recurring_prices_org_plan_status_idx").on(
      table.organizationId,
      table.planId,
      table.status,
    ),
    check("recurring_prices_amount_check", sql`${table.unitAmount} > 0`),
    check("recurring_prices_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      "recurring_prices_interval_check",
      sql`${table.interval} in ('month', 'year') and ${table.intervalCount} = 1`,
    ),
    check("recurring_prices_status_check", sql`${table.status} in ('active', 'archived')`),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    merchantId: uuid("merchant_id").notNull(),
    locationId: uuid("location_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    planId: uuid("plan_id").notNull(),
    priceId: uuid("price_id").notNull(),
    status: text("status").notNull(),
    currency: text("currency").notNull(),
    unitAmount: bigint("unit_amount", { mode: "bigint" }).notNull(),
    interval: text("interval").notNull(),
    intervalCount: integer("interval_count").notNull(),
    billingTimezone: text("billing_timezone").notNull().default("UTC"),
    anchorDay: integer("anchor_day").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    nextBillingAt: timestamp("next_billing_at", { withTimezone: true }),
    trialStart: timestamp("trial_start", { withTimezone: true }),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    paymentMethodReference: text("payment_method_reference"),
    mockRenewalOutcome: text("mock_renewal_outcome").notNull().default("succeed"),
    retryCount: integer("retry_count").notNull().default(0),
    version: integer("version").notNull().default(1),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "subscriptions_merchant_org_fk",
      columns: [table.organizationId, table.merchantId],
      foreignColumns: [merchants.organizationId, merchants.id],
    }),
    foreignKey({
      name: "subscriptions_location_org_fk",
      columns: [table.organizationId, table.locationId],
      foreignColumns: [locations.organizationId, locations.id],
    }),
    foreignKey({
      name: "subscriptions_customer_org_fk",
      columns: [table.organizationId, table.customerId],
      foreignColumns: [customers.organizationId, customers.id],
    }),
    foreignKey({
      name: "subscriptions_plan_org_fk",
      columns: [table.organizationId, table.planId],
      foreignColumns: [subscriptionPlans.organizationId, subscriptionPlans.id],
    }),
    foreignKey({
      name: "subscriptions_price_org_fk",
      columns: [table.organizationId, table.priceId],
      foreignColumns: [recurringPrices.organizationId, recurringPrices.id],
    }),
    uniqueIndex("subscriptions_org_id_uidx").on(table.organizationId, table.id),
    index("subscriptions_due_idx").on(
      table.environment,
      table.status,
      table.nextBillingAt,
      table.id,
    ),
    index("subscriptions_org_customer_idx").on(
      table.organizationId,
      table.customerId,
      table.createdAt,
    ),
    check("subscriptions_environment_check", sql`${table.environment} in ('test', 'live')`),
    check(
      "subscriptions_status_check",
      sql`${table.status} in ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'ended')`,
    ),
    check("subscriptions_amount_check", sql`${table.unitAmount} > 0`),
    check("subscriptions_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      "subscriptions_interval_check",
      sql`${table.interval} in ('month', 'year') and ${table.intervalCount} = 1`,
    ),
    check("subscriptions_anchor_check", sql`${table.anchorDay} between 1 and 31`),
    check(
      "subscriptions_period_check",
      sql`${table.currentPeriodEnd} > ${table.currentPeriodStart}`,
    ),
    check(
      "subscriptions_mock_outcome_check",
      sql`${table.mockRenewalOutcome} in ('succeed', 'fail', 'pending')`,
    ),
  ],
);

export const invoiceCounters = pgTable(
  "invoice_counters",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    year: integer("year").notNull(),
    nextValue: integer("next_value").notNull().default(1),
  },
  (table) => [
    uniqueIndex("invoice_counters_org_env_year_uidx").on(
      table.organizationId,
      table.environment,
      table.year,
    ),
    check("invoice_counters_environment_check", sql`${table.environment} in ('test', 'live')`),
    check("invoice_counters_next_check", sql`${table.nextValue} > 0`),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    merchantId: uuid("merchant_id").notNull(),
    locationId: uuid("location_id"),
    customerId: uuid("customer_id").notNull(),
    subscriptionId: uuid("subscription_id"),
    billingPeriodStart: timestamp("billing_period_start", { withTimezone: true }),
    billingPeriodEnd: timestamp("billing_period_end", { withTimezone: true }),
    number: text("number"),
    status: text("status").notNull().default("draft"),
    currency: text("currency").notNull(),
    subtotalAmount: bigint("subtotal_amount", { mode: "bigint" }).notNull(),
    totalAmount: bigint("total_amount", { mode: "bigint" }).notNull(),
    publicTokenDigest: text("public_token_digest"),
    publicTokenPrefix: text("public_token_prefix"),
    checkoutSessionId: uuid("checkout_session_id"),
    orderId: uuid("order_id"),
    paymentId: uuid("payment_id"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "invoices_merchant_org_fk",
      columns: [table.organizationId, table.merchantId],
      foreignColumns: [merchants.organizationId, merchants.id],
    }),
    foreignKey({
      name: "invoices_location_org_fk",
      columns: [table.organizationId, table.locationId],
      foreignColumns: [locations.organizationId, locations.id],
    }),
    foreignKey({
      name: "invoices_customer_org_fk",
      columns: [table.organizationId, table.customerId],
      foreignColumns: [customers.organizationId, customers.id],
    }),
    foreignKey({
      name: "invoices_subscription_org_fk",
      columns: [table.organizationId, table.subscriptionId],
      foreignColumns: [subscriptions.organizationId, subscriptions.id],
    }),
    foreignKey({
      name: "invoices_checkout_org_fk",
      columns: [table.organizationId, table.checkoutSessionId],
      foreignColumns: [checkoutSessions.organizationId, checkoutSessions.id],
    }),
    foreignKey({
      name: "invoices_order_org_fk",
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
    }),
    foreignKey({
      name: "invoices_payment_org_fk",
      columns: [table.organizationId, table.paymentId],
      foreignColumns: [payments.organizationId, payments.id],
    }),
    uniqueIndex("invoices_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("invoices_org_env_number_uidx")
      .on(table.organizationId, table.environment, table.number)
      .where(sql`${table.number} is not null`),
    uniqueIndex("invoices_public_token_uidx")
      .on(table.publicTokenDigest)
      .where(sql`${table.publicTokenDigest} is not null`),
    uniqueIndex("invoices_subscription_period_uidx")
      .on(table.organizationId, table.environment, table.subscriptionId, table.billingPeriodStart)
      .where(sql`${table.subscriptionId} is not null`),
    index("invoices_org_env_created_idx").on(
      table.organizationId,
      table.environment,
      table.createdAt,
      table.id,
    ),
    check("invoices_environment_check", sql`${table.environment} in ('test', 'live')`),
    check("invoices_status_check", sql`${table.status} in ('draft', 'open', 'paid', 'void')`),
    check("invoices_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      "invoices_amount_check",
      sql`${table.subtotalAmount} > 0 and ${table.totalAmount} = ${table.subtotalAmount}`,
    ),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    invoiceId: uuid("invoice_id").notNull(),
    productId: uuid("product_id"),
    variantId: uuid("variant_id"),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unitAmount: bigint("unit_amount", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    totalAmount: bigint("total_amount", { mode: "bigint" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "invoice_items_invoice_org_fk",
      columns: [table.organizationId, table.invoiceId],
      foreignColumns: [invoices.organizationId, invoices.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "invoice_items_product_org_fk",
      columns: [table.organizationId, table.productId],
      foreignColumns: [products.organizationId, products.id],
    }),
    foreignKey({
      name: "invoice_items_variant_org_fk",
      columns: [table.organizationId, table.variantId],
      foreignColumns: [variants.organizationId, variants.id],
    }),
    uniqueIndex("invoice_items_org_id_uidx").on(table.organizationId, table.id),
    index("invoice_items_invoice_idx").on(table.organizationId, table.invoiceId),
    check(
      "invoice_items_amount_check",
      sql`${table.quantity} > 0 and ${table.unitAmount} > 0 and ${table.totalAmount} = ${table.unitAmount} * ${table.quantity}`,
    ),
    check("invoice_items_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const subscriptionRenewals = pgTable(
  "subscription_renewals",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    environment: text("environment").notNull(),
    subscriptionId: uuid("subscription_id").notNull(),
    invoiceId: uuid("invoice_id"),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("started"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    lastPaymentId: uuid("last_payment_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: "subscription_renewals_subscription_org_fk",
      columns: [table.organizationId, table.subscriptionId],
      foreignColumns: [subscriptions.organizationId, subscriptions.id],
    }),
    foreignKey({
      name: "subscription_renewals_invoice_org_fk",
      columns: [table.organizationId, table.invoiceId],
      foreignColumns: [invoices.organizationId, invoices.id],
    }),
    foreignKey({
      name: "subscription_renewals_payment_org_fk",
      columns: [table.organizationId, table.lastPaymentId],
      foreignColumns: [payments.organizationId, payments.id],
    }),
    uniqueIndex("subscription_renewals_period_uidx").on(
      table.organizationId,
      table.environment,
      table.subscriptionId,
      table.periodStart,
    ),
    uniqueIndex("subscription_renewals_org_id_uidx").on(table.organizationId, table.id),
    index("subscription_renewals_retry_idx").on(table.environment, table.status, table.nextRetryAt),
    check("subscription_renewals_environment_check", sql`${table.environment} in ('test', 'live')`),
    check(
      "subscription_renewals_status_check",
      sql`${table.status} in ('started', 'pending', 'failed', 'succeeded', 'exhausted')`,
    ),
    check("subscription_renewals_period_check", sql`${table.periodEnd} > ${table.periodStart}`),
    check("subscription_renewals_attempt_check", sql`${table.attemptCount} between 0 and 3`),
  ],
);

export const seedVersions = pgTable("seed_versions", {
  key: text("key").primaryKey(),
  version: integer("version").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});
