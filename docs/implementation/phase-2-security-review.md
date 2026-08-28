# Phase 2 Core Commerce security review

**Review date:** 2026-08-28  
**Scope:** Phase 2 database, domain services, API, SDK, dashboard, seed, and tests

## 1. Verdict

No unresolved critical or high-severity security finding remains in the Phase 2 scope.

## 2. Tenant isolation

- Every new commerce table carries `organization_id`.
- Composite organization-aware foreign keys prevent cross-tenant customer, product, variant, location, inventory, order, and item relationships.
- All commerce tables enable and force PostgreSQL RLS.
- The restricted `yinne_app` role does not own tables and cannot bypass RLS.
- Services run in tenant transactions that set organization and environment locally.
- Integration tests prove a tenant cannot read another tenant's commerce rows, including through an unscoped application query.

Result: pass.

## 3. Authorization and scope

- Services enforce permission keys centrally; routes contain no role-name branching.
- API keys require the exact permission scope and matching environment.
- Inventory/order operations authorize against the affected location/merchant.
- List operations derive allowed locations for location/merchant-scoped principals.
- Organization-wide canonical customer/product mutation requires an organization-scoped assignment, avoiding accidental leakage through an undefined location boundary.
- Customer email/phone are redacted without `customers:pii_read`.

Result: pass. The canonical-resource restriction is intentional and documented in the plan.

## 4. Input and mass assignment

- API and dashboard boundaries use strict Zod schemas with length/count/range bounds.
- Unknown fields are rejected.
- Clients cannot supply order status, order number, prices, snapshots, or totals.
- Metadata is bounded to 16 KiB serialized size.
- IDs are validated as UUIDs at route boundaries.
- Search, filters, cursor, page size, inventory delta, item count, and quantity are bounded.

Result: pass.

## 5. Immutable and sensitive history

- Inventory movements and order items have insert/select-only application grants.
- Database triggers reject updates and deletes even through a more privileged accidental path.
- Paid-order deletion does not arise because no order delete surface exists.
- Audit/event/outbox recording is in the same transaction as each domain mutation.
- Order item snapshots prevent catalogue edits from rewriting history.

Result: pass.

## 6. Idempotency and request security

- Order idempotency keys are not stored raw; SHA-256 digests are scoped by tenant, mode, principal, and operation.
- A request digest detects conflicting reuse.
- PostgreSQL transaction advisory locks serialize concurrent identical keys.
- Completed responses are replayed and records expire after seven days.
- Session mutations require an explicitly allowed Origin or a browser-provided same-origin request indicator. Bearer API keys do not rely on cookies.
- Request IDs and canonical safe errors are returned; unhandled errors are logged server-side without stack leakage to clients.
- Rate limiting remains applied to all Phase 2 routes.

Result: pass.

## 7. Database role/grant review

`pnpm db:check` verifies:

- the connection is `yinne_app`;
- all 17 tenant tables have both RLS and forced RLS;
- the application role lacks inventory-movement UPDATE and order-item DELETE privileges.

The worker remains on the separate Phase 1 worker connection. Commerce services do not expand its permissions.

Result: pass.

## 8. Seed and environment safety

- Seed execution is blocked in production/live mode.
- Seed data is synthetic and deterministic.
- No real payment, credential, card, provider, or refund data is fabricated.
- The dashboard retains the persistent test-mode banner.

Result: pass.

## 9. Findings resolved during implementation

| Severity | Finding                                                                               | Resolution                                                                                      |
| -------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| High     | Generated composite foreign keys preceded their referenced composite unique indexes.  | Migration ordering corrected; empty-database verification now runs automatically.               |
| Medium   | BigInt values would not serialize through the original API response mapper.           | Explicit BigInt-to-decimal-string serialization added and tested.                               |
| Medium   | Dashboard actions initially relied on TypeScript types alone for commerce form input. | Strict runtime contract parsing added at dashboard boundaries.                                  |
| Medium   | Test HTTP origin differed from configured local origin.                               | E2E server now receives its exact allowed origin; production remains explicit allow-list based. |
| Low      | Drizzle wrapped unique violations, weakening normalized conflict mapping.             | Error causes are traversed safely to detect PostgreSQL `23505`.                                 |

## 10. Accepted limitations

- The in-memory HTTP rate limiter remains single-instance, as recorded in Phase 1. A shared limiter/gateway is required before horizontal scale.
- Customer privacy anonymization is not exposed in Phase 2. Hard deletion is intentionally unavailable; a dedicated audited privacy workflow is deferred.
- Inventory is not reserved for unpaid orders. This is a commercial consistency limitation reviewed separately, not a hidden security behavior.
- Credentials login remains local-development bootstrap; production identity is deferred.

These limitations do not block the approved Phase 2 test-mode scope.
