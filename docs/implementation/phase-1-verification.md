# Phase 1 verification

Verification date: 2026-08-28  
Environment: macOS ARM64, Node.js 25.8.1, pnpm 11.19.0, PostgreSQL 16 in Docker, Chromium 151 via Playwright.

## Automated verification

| Command                             | Result                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`    | Pass                                                                       |
| `docker compose up -d`              | Pass; PostgreSQL healthy                                                   |
| `pnpm db:migrate`                   | Pass; repeatable/current                                                   |
| `pnpm worker:migrate`               | Pass; Graphile schema, enqueue function, and role grants current           |
| `pnpm db:seed`                      | Pass; repeatable Acme Coffee seed                                          |
| `pnpm db:check`                     | Pass; restricted role and forced RLS verified                              |
| `pnpm format:check`                 | Pass                                                                       |
| `pnpm lint`                         | Pass                                                                       |
| `pnpm typecheck`                    | Pass; 10/10 workspace packages                                             |
| `pnpm test`                         | Pass; 8 files, 12 tests                                                    |
| `pnpm test:integration`             | Pass; 2 files, 4 PostgreSQL tests                                          |
| `pnpm test:e2e`                     | Pass; 1 Chromium lifecycle test                                            |
| `pnpm build`                        | Pass; 10/10 workspace packages, worker bundle, and 20 Next.js routes/pages |
| `pnpm --filter @yinne/worker start` | Pass; production bundle connected, drained jobs, and stopped gracefully    |

## Security assertions exercised

- An application-role transaction scoped to Organization A cannot read Organization B, and a missing tenant setting exposes no tenant rows.
- Staff cannot create API keys; Owner can.
- Test context cannot create a live key.
- A valid key authenticates with its exact scopes and environment; the same secret fails after revocation.
- Persisted key rows, audit metadata, and serialized database records do not contain the plaintext secret.
- Tenant-sensitive administrative mutations write audit, event, outbox, and Graphile job state atomically.
- The dedicated worker consumed two real `outbox_dispatch` jobs, marked both outbox records `processed`, and left zero queued jobs.

## Manual browser verification

The app was opened at `http://localhost:3001` in the in-app browser because port 3000 was occupied locally.

1. The unauthenticated root redirected to `/sign-in`.
2. The seeded Owner signed in successfully and returned to `/`.
3. The protected shell showed Acme Coffee, the server-backed organization selector, Owner email, sign-out action, and the persistent `TEST MODE · No real financial execution is available` banner.
4. Home showed only real Phase 1 capabilities.
5. Commerce opened `Not available in this release`; it displayed no invented revenue, payment, order, or capital data.
6. Browser console inspection returned no warnings or errors.
7. A full Playwright lifecycle independently saved organization settings, created a once-visible test API key, and revoked it.

## Definition-of-done comparison

All Phase 1 gates in `docs/planning/26-definition-of-done.md` that apply to the platform-foundation phase are satisfied. Commerce, payment, provider, webhook-delivery, and financial-data gates are intentionally deferred and are not represented as complete.
