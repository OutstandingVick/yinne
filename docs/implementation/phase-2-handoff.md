# Phase 2 Core Commerce handoff

## 1. Delivered outcome

Yinne now has a locally runnable, tenant-safe core commerce layer: customers, organization-owned products and variants, per-location inventory with append-only movements, and immutable unpaid commercial orders. The database, domain services, `/v1` API, OpenAPI 3.1 contract, TypeScript SDK, dashboard, seed, CI, and tests all carry the same behavior.

An order remains a commercial record, not proof of payment. No payment/provider/refund implementation was added.

## 2. Repository additions

```text
modules/commerce       Customer, catalogue, inventory, order services/tests
packages/application  Shared request context, authorization, recording
packages/sdk          HTTP-only typed TypeScript SDK
openapi               OpenAPI 3.1 runtime contract
apps/dashboard        Commerce pages/actions and 17 new /v1 operations
packages/database     Commerce schema, migrations, seed, clean-db verifier
docs/implementation   Phase 2 plan/log/reviews/verification/handoff
```

## 3. Database model

New tables: `customers`, `products`, `variants`, `inventory_levels`, `inventory_movements`, `orders`, and `order_items`.

All use UUIDv7 IDs and tenant ownership. Composite foreign keys prevent cross-organization relationships. All seven new tables have forced RLS. Inventory movements and order items are append-only through both grants and triggers. Monetary values are PostgreSQL bigint minor units.

## 4. Commerce behavior

- Customers: create/list/retrieve/update; optional external reference unique per organization; PII redaction by permission; no hard delete.
- Products: draft creation, active transition with an active variant, archive terminal state, nested variants, immutable ordered currency.
- Inventory: one level per variant/location, atomic row-locked delta adjustments, nonnegative invariant, append-only movements.
- Orders: server-derived snapshots/totals, one currency, stock validation, `unpaid/unfulfilled` creation, unpaid cancellation only, no deletion.

Order creation does not reserve/decrement stock. Payments Core owns the future atomic payment-success re-check and decrement.

## 5. API and SDK

The public contract is [openapi/yinne-v1.json](../../openapi/yinne-v1.json). Order creation requires `Idempotency-Key`; matching retries replay the order and conflicting reuse returns `409`.

`@yinne/sdk` exposes typed customer, product, inventory, and order clients. It sends bearer authentication, generates or accepts order idempotency keys, and throws `YinneApiError` with canonical request IDs/details.

## 6. Dashboard

Working commerce pages:

- `/commerce/customers` and customer detail;
- `/commerce/products` and product detail;
- `/commerce/inventory`;
- `/commerce/orders` and order detail.

Home shows real commerce counts. Pages include search/filters, forms, state badges, empty/loading/error handling, and persistent Test Mode messaging. Payments remains `Later`; no paid or fulfil action exists.

## 7. Seed

The repeatable base dataset includes one organization/merchant, four locations, seven role examples, 20 customers, 12 products/variants, 48 levels/opening movements, and 15 unpaid orders. Login remains `owner@acme.test` using `YINNE_SEED_PASSWORD`.

## 8. Verification

Verified:

- frozen install;
- existing and empty-database migrations;
- repeatable seed and database security checks;
- OpenAPI validation;
- format, lint, and typecheck;
- 19 unit, 7 PostgreSQL integration, and 3 Playwright/API tests;
- dashboard/worker/package builds;
- bounded worker startup.

See `phase-2-verification.md`, `phase-2-security-review.md`, and `phase-2-financial-correctness-review.md` for evidence and accepted limitations.

## 9. Local commands

```bash
cd /Users/macbook/yinne
pnpm install --frozen-lockfile
docker compose up -d
pnpm db:migrate
pnpm worker:migrate
pnpm db:seed
pnpm db:check
pnpm dev
```

Full verification:

```bash
pnpm verify:clean-db
pnpm openapi:validate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

## 10. Payments Core obligations

- Introduce payment-attempt/provider state independently from orders.
- Preserve integer money and idempotency.
- On payment success, atomically re-check and decrement inventory with order-linked movements.
- Decide the explicit failure policy if stock is unavailable at payment success.
- Never infer financial truth from an unpaid order or mutable dashboard action.
- Keep providers/card data outside Yinne's core storage boundary.

## 11. Deferred scope

Checkout, payment links, provider integrations, payment/refund/payout state, storefront publication, marketplace, shipping/tax/discounts, fulfilment execution, reservations, customer anonymization administration, and advanced analytics.

PHASE 2 COMPLETE — READY FOR PAYMENTS CORE
