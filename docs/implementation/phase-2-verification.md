# Phase 2 Core Commerce verification

**Verification date:** 2026-08-28  
**Environment:** Local Docker PostgreSQL, Node.js 25 runtime (project supports Node 20–25), pnpm 11.19.0, Playwright Chromium

## 1. Verification summary

Phase 2 has been verified across clean database setup, schema controls, static quality, unit/integration/API/browser tests, production builds, and worker startup. No required command remains failing.

## 2. Commands and results

| Check                       | Command                                           | Result                                                             |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| Locked install              | `pnpm install --frozen-lockfile`                  | Pass                                                               |
| Existing database migration | `pnpm db:migrate`                                 | Pass                                                               |
| Repeatable seed             | `pnpm db:seed` twice                              | Pass                                                               |
| Database controls           | `pnpm db:check`                                   | Pass: application role, 17 forced-RLS tables, append-only grants   |
| Clean database              | `pnpm verify:clean-db`                            | Pass: migrate, seed, check, then temporary database removed        |
| OpenAPI                     | `pnpm openapi:validate`                           | Pass: OpenAPI 3.1, 17 unique operations, resolved local references |
| Formatting                  | `pnpm format:check`                               | Pass                                                               |
| Lint                        | `pnpm lint`                                       | Pass                                                               |
| Types                       | `pnpm typecheck`                                  | Pass across 13 packages                                            |
| Unit                        | `pnpm test`                                       | Pass: 19 tests in 11 files                                         |
| PostgreSQL integration      | `pnpm test:integration`                           | Pass: 7 tests in 3 files                                           |
| API/browser E2E             | `pnpm test:e2e`                                   | Pass: 3 Chromium tests                                             |
| Production build            | `pnpm build`                                      | Pass: dashboard, worker, and package builds                        |
| Worker startup              | bounded `pnpm --filter @yinne/worker start` smoke | Pass                                                               |

## 3. Coverage evidence

### Unit

- UUIDv7/request IDs and environment validation;
- authentication and RBAC;
- canonical API errors and response casing;
- event envelope and worker payload;
- BigInt money parsing, exact arithmetic, and overflow;
- strict order contracts and idempotency-key bounds;
- SDK authentication, idempotency header, and error normalization.

### Integration

- forced tenant RLS, including Phase 2 commerce rows and unscoped application queries;
- API-key lifecycle/scope/mode from Phase 1 regression coverage;
- customer/catalogue creation and product activation;
- inventory adjustment, negative-stock rejection, and movement immutability;
- server-derived order snapshots and exact totals;
- no inventory decrement on unpaid order creation;
- idempotency replay and conflicting reuse;
- cancellation and repeated-cancellation rejection;
- absence of paid/fulfil mutation services.

### API and browser

- owner sign-in and Phase 1 settings/API-key regression flow;
- dashboard customer and draft product creation, product activation, inventory adjustment, unpaid order creation, and cancellation;
- no paid/fulfil dashboard control;
- authenticated HTTP order creation with request ID;
- matching idempotency replay returns the same order;
- conflicting idempotency reuse returns canonical `409 idempotency_key_reused`.

## 4. Seed verification

The deterministic base seed contains 20 customers, 12 products with one variant each, 48 per-location inventory levels with corresponding opening movements, and 15 unpaid orders (13 unfulfilled and 2 cancelled). Re-running the seed succeeds. Test-created records may increase counts in the developer database without changing the deterministic base.

## 5. Clean database safety

`pnpm verify:clean-db` creates only the fixed temporary database `yinne_phase2_verify`, runs all migrations, seed, and database checks against it, terminates its connections, and drops it in a `finally` block. The temporary database was removed after verification.

## 6. Build evidence

The dashboard production build generated all commerce pages and 17 Phase 2 HTTP operations. The worker produced its ESM bundle and declarations. Turbo's no-output warnings for typecheck-only library build scripts are expected and are not failures.

## 7. Known non-blocking constraints

- Rate limiting is single-instance.
- Unpaid orders do not reserve stock; Payments Core must re-check/decrement atomically.
- Customer anonymization administration, merchant publication/storefront, payment, fulfilment execution, and advanced analytics are deferred.
- Local E2E uses `http://127.0.0.1:3010` as its explicit allowed origin; normal development remains `http://localhost:3000`.

These are disclosed scope boundaries rather than failed Phase 2 requirements.
