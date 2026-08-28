# Yinne

Open-source infrastructure for merchant commerce and financial operations.

Phase 2 implements the tenant-safe core commerce layer: customers, catalogue products and variants, per-location inventory with immutable adjustments, and unpaid commercial orders with immutable item snapshots. It builds on organizations, scoped RBAC, API keys, audit/events/outbox, Auth.js local login, the `/v1` API, a typed TypeScript SDK, and a working commerce dashboard.

Payments are intentionally not implemented. An order is not evidence of payment, and no current surface can mark an order paid or fulfilled.

## Prerequisites

- Node.js 20–25
- pnpm 11
- Docker with Compose

## Local setup

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:migrate
pnpm worker:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:3000 and sign in with owner@acme.test and the YINNE_SEED_PASSWORD value. The seed is test/development-only and idempotent. The dashboard displays a persistent TEST MODE banner.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm openapi:validate
pnpm verify:clean-db
pnpm build
```

Integration and E2E tests require migrated PostgreSQL. Install the E2E browser once with `pnpm exec playwright install chromium`. Migrations use MIGRATION_DATABASE_URL; application/tests use the restricted DATABASE_URL role so forced RLS is exercised. Graphile Worker uses the dedicated WORKER_DATABASE_URL role. SQL migrations under packages/database/drizzle are canonical; do not use schema push in shared environments.

## Core commerce API

The OpenAPI 3.1 contract is at `openapi/yinne-v1.json`. Phase 2 exposes:

- `/v1/customers` and `/v1/customers/{id}`;
- `/v1/products`, product detail/archive, and nested variants;
- `/v1/inventory-levels` and `/v1/inventory-adjustments`;
- `/v1/orders`, order detail, and order cancellation.

Money is always an integer minor-unit string. Order creation requires an idempotency key and trusts only server-side catalogue prices:

```bash
curl http://localhost:3000/v1/orders \
  -H "Authorization: Bearer $YINNE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order-demo-00000001" \
  -d '{
    "merchant_id": "<merchant-uuid>",
    "location_id": "<location-uuid>",
    "currency": "NGN",
    "items": [{ "variant_id": "<variant-uuid>", "quantity": 2 }]
  }'
```

The workspace package `@yinne/sdk` provides typed `customers`, `products`, `inventory`, and `orders` clients:

```ts
import { YinneClient } from "@yinne/sdk";

const yinne = new YinneClient({ apiKey: process.env.YINNE_API_KEY! });
const order = await yinne.orders.create(
  {
    merchant_id: merchantId,
    location_id: locationId,
    currency: "NGN",
    items: [{ variant_id: variantId, quantity: 2 }],
  },
  { idempotencyKey: "order-demo-00000001" },
);
```

## Common errors

- Connection refused: wait for Docker PostgreSQL to become healthy.
- RLS returns no rows: run tenant queries inside withTenantTransaction and verify membership.
- Invalid session/key: AUTH_SECRET and API_KEY_PEPPER must each be at least 32 characters; test/live modes must match.
- Seed rejected: production or live mode intentionally prevents demo data.

See [the Phase 2 handoff](./docs/implementation/phase-2-handoff.md), [OpenAPI contract](./openapi/yinne-v1.json), and [planning](./docs/planning/README.md).

## Boundary

Yinne does not hold funds, store raw card data, provide bank accounts, make loans, or guarantee compliance. See SECURITY.md.
