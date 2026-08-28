# Phase 2 Core Commerce Implementation Plan

**Status:** Approved for implementation  
**Prepared:** 2026-08-28  
**Depends on:** Phase 1 Foundation handoff (`PHASE 1 COMPLETE — READY FOR CORE COMMERCE`)

## 1. Objective

Phase 2 turns the Phase 1 platform foundation into a usable, tenant-safe commerce system. It adds customers, products and variants, per-location inventory, and unpaid commercial orders across the database, domain services, HTTP API, TypeScript SDK, dashboard, deterministic seed data, and tests.

This phase does not implement payment attempts, provider integrations, checkout, refunds, storefronts, marketplace behavior, or advanced fulfilment. An order is a durable commercial record, not evidence of payment.

## 2. Readiness and constraints

Implementation proceeds on the verified Phase 1 controls:

- organization and environment tenant context;
- Auth.js user sessions and hashed API-key principals;
- predefined, scoped RBAC;
- request IDs, validation, rate limiting, canonical errors, and cursor pagination;
- forced PostgreSQL RLS and composite tenant ownership constraints;
- append-only audit, domain-event, and transactional-outbox records;
- a dedicated Graphile Worker role and queue boundary.

Existing product and architecture decisions remain authoritative. Phase 2 extends them without redesigning Yinne or weakening Phase 1 isolation.

## 3. Scope

### 3.1 Domain capabilities

- Customers: create, list, retrieve, and update.
- Products: create, list, retrieve, update, activate, and archive.
- Variants: create and update beneath a product; immutable currency once referenced by an order; archive through status.
- Inventory: read per variant and location; adjust through append-only movements.
- Orders: create, list, retrieve, and cancel under explicit state rules.

### 3.2 Delivery surfaces

- PostgreSQL schema, constraints, indexes, migrations, RLS, and grants.
- Domain services and transactional domain-event/audit/outbox recording.
- Versioned `/v1` HTTP resources with search, filters, cursor pagination, validation, and RBAC.
- A typed `@yinne/sdk` package that uses the HTTP API only.
- An OpenAPI 3.1 contract checked in with the runtime implementation.
- Dashboard pages for Customers, Products, Inventory, and Orders.
- Deterministic development seed data.
- Unit, integration, API, and end-to-end verification.

## 4. Architecture and dependency decisions

### 4.1 Shared application primitives

A new `@yinne/application` package will own the reusable request context, authorization guard, and transactional recording helpers currently embedded in the organizations module. The organizations module will consume those helpers without changing its external behavior. Commerce modules will not import dashboard code, and the dashboard will continue to call services rather than the database directly.

### 4.2 Commerce modules

`modules/commerce` will expose customer, catalogue, inventory, and order services. Contracts remain in `@yinne/contracts`, money primitives in `@yinne/core`, persistence in `@yinne/database`, and event schemas in `@yinne/events`.

### 4.3 Canonical products and deferred publication

Products and variants are organization-owned canonical records. `merchant_products` and storefront publication are intentionally deferred because merchant presentation and public storefronts are outside Phase 2. A product may move from `draft` to `active` for internal sale readiness and may then be used in orders; this is not public storefront publication.

## 5. Data model

All primary IDs use UUIDv7. Every tenant-owned row carries `organization_id`; all child relationships use composite organization-aware foreign keys where applicable.

### 5.1 Customers

Fields: organization, name, normalized email, phone, external reference, metadata, timestamps, and optimistic version. External references are unique per organization when present. Email and creation-time indexes support lookup and pagination.

No hard-delete endpoint is exposed. Customers referenced by orders must remain available for historical integrity. Privacy anonymization is a later controlled administration workflow rather than an inferred delete operation in Phase 2.

### 5.2 Products and variants

Products contain name, tenant-unique slug, description, `draft | active | archived` status, metadata, timestamps, and version. Variants contain product ownership, tenant-unique SKU, title, integer minor-unit amount, ISO-style three-letter currency, inventory-tracking flag, `active | archived` status, timestamps, and version.

Allowed product transitions are:

- `draft -> active` when at least one active variant exists;
- `draft -> archived`;
- `active -> archived`;
- `archived` is terminal in Phase 2.

Archived products and variants remain queryable but cannot be newly ordered or materially edited.

### 5.3 Inventory

An inventory level is unique for `(organization, variant, location)` and stores signed PostgreSQL `bigint` on-hand quantity plus a version. A nonnegative database constraint prevents invalid persisted stock.

Every adjustment appends an immutable inventory movement containing the delta, resulting on-hand value, reason, optional order reference, actor, and timestamp. Services create missing zero levels, lock the level row, calculate the new quantity with BigInt arithmetic, reject underflow or overflow, update the level, append the movement, and record audit/event/outbox entries in one transaction. Inventory movements receive no update or delete service and database grants prohibit application-role updates/deletes.

### 5.4 Orders and items

Orders contain organization, merchant, fulfilment location, optional customer, tenant-unique order number, currency, subtotal, total, financial status, fulfilment status, timestamps, and version. Items contain immutable product-name, variant-title, SKU, unit-price, currency, quantity, and line-total snapshots alongside the optional live variant reference.

Phase 2 creates orders only as:

- financial status: `unpaid`;
- fulfilment status: `unfulfilled`.

The only Phase 2 transition is `unpaid/unfulfilled -> unpaid/cancelled`. Paid, refunded, and fulfilled transitions require later payment/fulfilment capabilities and are not available through Phase 2 endpoints or dashboard actions. Orders are never hard-deleted.

## 6. Money and quantity correctness

- Monetary values are PostgreSQL `bigint` minor units and JavaScript `bigint` internally.
- API and SDK monetary values are decimal strings.
- Floating-point arithmetic and decimal currency amounts are prohibited.
- Quantities are positive bounded integers; line totals use checked BigInt multiplication.
- Product variants have one currency, and all order items must match the order currency.
- Prices, names, and SKUs are resolved server-side from active variants; clients cannot set trusted totals or snapshots.
- Subtotal and total are derived from line totals; Phase 2 has no tax, shipping, or discount amounts.
- Values are checked against PostgreSQL `bigint` bounds before persistence.

## 7. Inventory timing and oversell policy

Creating an order validates that each inventory-tracked variant has enough on-hand stock at the selected location, but it does not reserve or decrement inventory. This matches the approved golden path in which payment success performs the inventory decrement in a later phase.

Consequences are explicit:

- Phase 2 rejects an order that is already out of stock at creation time.
- Concurrent unpaid orders may reference the same available stock because no reservation exists yet.
- Manual inventory adjustment always rejects a resulting negative balance.
- Phase 3 must re-check and atomically decrement inventory when payment succeeds, so oversell protection is enforced at the financial commitment point.

## 8. Authorization and tenancy

All commerce services require an authenticated request context and run inside tenant-bound transactions. RLS is forced on every new tenant table.

Permission mapping:

- customers: `customers:read`, `customers:write`, `customers:pii_read`;
- products/variants: `products:read`, `products:write`, `products:publish` for activation;
- inventory: `inventory:read`, `inventory:adjust`;
- orders: `orders:read`, `orders:write`; `orders:fulfil` is reserved and unused in Phase 2.

Merchant- and location-scoped principals are always checked against the affected merchant/location. Canonical organization-wide mutations that do not have a defensible merchant or location boundary require an organization-scoped assignment. Order list/detail visibility and inventory access are filtered to authorized locations. Customer PII is returned only with `customers:pii_read`; otherwise sensitive fields are redacted. API-key scopes must also contain the requested permission.

## 9. API and idempotency

Resources will use snake_case JSON, canonical error envelopes, request IDs, bounded Zod schemas, and opaque cursor pagination.

Planned routes:

- `GET, POST /v1/customers`
- `GET, PATCH /v1/customers/{customer_id}`
- `GET, POST /v1/products`
- `GET, PATCH /v1/products/{product_id}`
- `POST /v1/products/{product_id}/archive`
- `POST /v1/products/{product_id}/variants`
- `PATCH /v1/products/{product_id}/variants/{variant_id}`
- `GET /v1/inventory-levels`
- `POST /v1/inventory-adjustments`
- `GET, POST /v1/orders`
- `GET /v1/orders/{order_id}`
- `POST /v1/orders/{order_id}/cancel`

Search and filter parameters are bounded and indexed where practical. Lists return `{ data, has_more, next_cursor }` plus the request ID added by the API shell.

`POST /v1/orders` requires an `Idempotency-Key` header. The key is scoped to organization, environment, principal, and operation. A request digest prevents reuse with different inputs; completed responses are replayed, and concurrent attempts serialize through the database. Stored keys expire after a bounded retention period. Dashboard actions and SDK calls generate a key when the caller does not supply one.

Other Phase 2 writes rely on uniqueness/version checks and do not claim idempotency.

## 10. SDK and OpenAPI

`@yinne/sdk` will expose a configured client with grouped `customers`, `products`, `inventory`, and `orders` resources, typed inputs/outputs, pagination types, canonical API errors, request-ID access, and order-create idempotency support. It depends on `fetch`, not application services or database code.

The checked-in OpenAPI 3.1 document will describe authentication, idempotency, pagination, errors, schemas, and every Phase 2 route. A repository command will lint/validate it, and contract tests will check critical runtime shapes against it.

## 11. Dashboard

Commerce navigation replaces the Phase 1 placeholder with Customers, Products, Inventory, and Orders. Pages will provide real loading, empty, error, filter/search, list, detail, and creation/adjustment/cancellation states using the existing design system. The home page will show real commerce counts while retaining the prominent test-mode boundary. Payments continues to display `Later` and no UI can mark an order paid or fulfilled.

## 12. Seed data

The deterministic seed will preserve Phase 1 identities and add approximately:

- 20 customers;
- 12 products with practical variants and mixed draft/active/archived states;
- per-location inventory levels and matching seed movements;
- 15 unpaid orders with immutable item snapshots, including some cancelled records.

Seed orders contain no payment attempt, provider reference, refund, or fabricated financial-success state.

## 13. Verification strategy

### Unit

- money parsing, checked multiplication, and API string serialization;
- state-transition guards;
- pagination/filter validation;
- SDK request, response, error, and idempotency behavior.

### Integration

- tenant isolation and forced RLS for each new table;
- RBAC and location-scope enforcement;
- customer/product/variant CRUD rules;
- atomic inventory adjustment, movement immutability, and negative-stock rejection;
- order snapshot/totals/currency validation;
- order cancellation rules;
- order idempotency replay and conflicting-key rejection;
- audit/event/outbox atomicity.

### API and end to end

- authenticated HTTP lifecycle for the core resources;
- canonical errors and request IDs;
- dashboard sign-in, commerce navigation, product/customer creation, inventory adjustment, order creation, and cancellation;
- confirmation that no paid/fulfilled action exists.

Final verification includes clean install, migration from an empty database, deterministic seed, schema checks, lint, format check, typecheck, unit tests, integration tests, API tests, browser tests, dashboard and worker builds, and worker startup.

## 14. Security and correctness review gates

Before handoff, Phase 2 receives separate written reviews for:

- tenant/RLS isolation, scoped authorization, PII redaction, input bounds, mass assignment, immutable history, and API-key/idempotency handling;
- BigInt-only money, server-derived totals, same-currency enforcement, state transitions, append-only inventory movements, atomic stock updates, and oversell behavior.

Any unresolved critical or high-severity issue makes the phase incomplete.

## 15. Implementation sequence

1. Extract shared application primitives without changing Phase 1 behavior.
2. Add money/quantity primitives and commerce contracts.
3. Add schema, migration, RLS, grants, and database checks.
4. Implement commerce services, state guards, recording, and idempotency.
5. Add API routes and OpenAPI contract.
6. Build and test the SDK.
7. Add dashboard flows and real home metrics.
8. Extend deterministic seed data.
9. Run unit, integration, API, and browser suites.
10. Complete security, financial-correctness, verification, implementation-log, and handoff documents.

## 16. Completion standard

Phase 2 is complete only when all in-scope flows work through their intended surfaces, all required checks pass from a clean environment, required reviews contain no unresolved critical/high findings, and the handoff can truthfully end with:

`PHASE 2 COMPLETE — READY FOR PAYMENTS CORE`
