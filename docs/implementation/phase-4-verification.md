# Phase 4 verification

**Date:** 2026-08-28  
**Verdict:** PASS

Verified commands:

- `pnpm install` — pass.
- `pnpm db:generate` — pass; migration `0008_mixed_gunslinger.sql` generated and hardened.
- `pnpm db:migrate` — pass against the existing Phase 3 database.
- `pnpm db:seed` twice — pass and repeatable.
- `pnpm db:check` — pass; application role, forced RLS on 29 tables, and append-only grants verified.
- `pnpm openapi:validate` — pass; OpenAPI 3.1, 42 operations.
- `pnpm lint` — pass.
- `pnpm typecheck` — pass across 15 workspaces.
- `pnpm test` — pass; 14 files, 27 tests.
- `pnpm test:integration` — pass; 4 files, 9 PostgreSQL integration tests.
- `pnpm format:check` — pass.
- `pnpm build` — pass; all 15 workspaces, worker bundle, dashboard production build, 43 static-generation entries.
- `pnpm test:e2e` — pass; 5 Chromium tests including the public Payment Link and Hosted Checkout golden path.
- `pnpm --filter @yinne/worker start` — pass; worker connected, processed Checkout/Payment/Order/Transaction jobs, and logged graceful SIGINT shutdown.
- `pnpm test:e2e` — pass; 5 Chromium tests including the public Payment Link and Hosted Checkout golden path.
- `pnpm --filter @yinne/worker start` — pass; worker connected, processed Checkout/Payment/Order/Transaction outbox jobs, and logged graceful SIGINT shutdown.

Runtime smoke test on port 3010:

1. GET an active seeded fixed Payment Link returned sanitized test-mode configuration.
2. POST opened a new 250,000 NGN Checkout Session and a 43-character hosted capability URL.
3. POST confirmation with guest name/email and Mock `success` created a Customer, collection Order, Payment and charge, and returned `completed`.
4. Repeating confirmation returned the same Payment ID.
5. Reading the source Payment Link showed `completed_usage_count: 1`.
6. Repeating a public Payment Link submission with the same key returned the same Checkout Session ID and capability URL; only the per-response request ID differed.

The developer server was stopped after the test. Generated test commerce records remain in the local development database and are recoverable/reseedable fixtures, not production data.
