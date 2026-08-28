# Phase 2 Core Commerce implementation log

**Implementation date:** 2026-08-28  
**Plan:** `phase-2-core-commerce-plan.md`

## 1. Delivered architecture

Phase 2 extends the Phase 1 modular monolith without changing its approved boundaries.

- Added `@yinne/application` for the shared request context, scoped authorization, authorized-location resolution, and transactional audit/event/outbox recording. The organizations module now consumes these primitives.
- Added `@yinne/commerce` with customer, catalogue, inventory, and order services.
- Added `@yinne/sdk`, an HTTP-only TypeScript client with grouped commerce resources and normalized errors.
- Extended `@yinne/core` with checked BigInt minor-unit operations.
- Extended `@yinne/contracts` with strict, bounded commerce inputs and filters.
- Extended `@yinne/events` with Phase 2 domain event types while preserving the Phase 1 type.
- Added an OpenAPI 3.1 contract and repository validation command.

No dashboard component imports the database, and the SDK imports neither services nor persistence.

## 2. Persistence

Migrations `0004_absurd_night_thrasher.sql` and `0005_curious_otto_octavius.sql` add:

- `customers`;
- `products` and `variants`;
- `inventory_levels` and append-only `inventory_movements`;
- `orders` and append-only `order_items`.

The migrations include composite tenant ownership indexes/foreign keys, status/currency/amount/quantity constraints, forced RLS, restricted application-role grants, and database triggers that reject inventory-movement and order-item updates/deletes. The migration ordering was corrected during an empty-schema dry run so composite unique indexes exist before dependent foreign keys.

The database check now verifies the application role, forced RLS across all 17 tenant tables, and absence of mutation grants on append-only records.

## 3. Customers

Implemented create/list/retrieve/update services and `/v1` routes with search, email filtering, composite cursor pagination, normalized email, tenant-unique optional external references, metadata bounds, events, audit, and outbox. Customer reads redact email/phone without `customers:pii_read`. No hard-delete surface exists.

## 4. Catalogue

Implemented product and nested variant creation, listing, retrieval, updating, activation, archive, search/status filters, and detail dashboard pages.

State rules:

- products start `draft`;
- activation requires `products:publish` and an active variant;
- draft/active products may be archived;
- archived products and variants are terminal in Phase 2;
- archived catalogue records cannot be newly ordered;
- variant currency cannot change after the variant appears in an order snapshot.

Merchant publication remains deferred with storefront behavior.

## 5. Inventory

Inventory is stored by variant and fulfilment location. Adjustments:

1. authorize against the location;
2. validate an active, inventory-tracked variant and active location;
3. create a zero level if missing;
4. lock the level row;
5. calculate using BigInt;
6. reject zero, underflow, and overflow;
7. update the level and append a movement;
8. persist audit/event/outbox records in the same transaction.

The dashboard provides search/location filtering and an adjustment form. There is no direct level-set or movement-edit operation.

## 6. Orders

Implemented create/list/retrieve/cancel services and HTTP/dashboard surfaces. Creation validates merchant/location ownership, customer ownership, active catalogue, one order currency, server-side prices, positive bounded quantities, checked totals, and current stock availability.

Orders are created only as `unpaid/unfulfilled`. Items snapshot product name, variant title, SKU, price, currency, quantity, and total. The client cannot submit trusted prices or totals. The only Phase 2 transition is `unpaid/unfulfilled -> unpaid/cancelled`; there is no paid or fulfil action.

Order creation validates stock but does not decrement or reserve it. The payment-success transaction in Payments Core must re-check and atomically decrement stock.

## 7. Idempotency

`POST /v1/orders` requires a 16–255 character `Idempotency-Key`. The implementation scopes its SHA-256 digest to organization, environment, principal, and operation; stores a request digest and JSON-safe response; serializes concurrent attempts with a transaction advisory lock; replays matching requests; rejects different input under the same key; and retains records for seven days.

Dashboard order creation generates a unique key. The SDK generates one when the caller does not provide one and accepts an explicit stable key.

## 8. API and SDK

Seventeen Phase 2 operations are documented in `openapi/yinne-v1.json`. Runtime routes reuse Phase 1 authentication, mode, RLS context, request IDs, canonical errors, no-store responses, origin checks, rate limiting, snake_case serialization, and bounded Zod schemas. BigInt values serialize as decimal strings.

The SDK exposes:

- `customers.list/retrieve/create/update`;
- `products.list/retrieve/create/update/archive/createVariant`;
- `inventory.list/adjust`;
- `orders.list/retrieve/create/cancel`.

## 9. Dashboard and seed

Commerce navigation now links to working Customers, Products, Inventory, and Orders pages. Pages include real counts, search/filter controls, creation/action forms, details, empty/loading/error states, state badges, test-mode messaging, and an explicit payment boundary. Payments, Operations, and Intelligence remain `Later`.

The repeatable Phase 2 seed preserves Phase 1 identities and adds 20 customers, 12 products/variants, 48 inventory levels with opening movements, and 15 unpaid orders, two of which are cancelled. It creates no payment/provider/refund records and rejects production/live execution.

## 10. Verification-driven fixes

- Reordered composite indexes ahead of composite foreign keys after the initial migration dry run failed atomically.
- Added recursive PostgreSQL unique-violation unwrapping for Drizzle errors.
- Added BigInt response serialization.
- Configured the E2E server's exact allowed origin and retained same-origin browser CSRF handling.
- Stabilized browser navigation and order-row assertions around asynchronous server actions.
- Added clean-database migration/seed verification with automatic removal of the temporary database.

## 11. Explicit deferrals

Payments, payment attempts/providers, checkout sessions, payment links, refunds, storefront/merchant publication, marketplace behavior, shipping/tax/discounts, reservations, fulfilment execution, customer anonymization administration, and advanced analytics remain out of scope.

No ADR was required because implementation stayed inside approved Phase 2 architecture. Inventory timing and canonical product scope are recorded in the Phase 2 plan.
