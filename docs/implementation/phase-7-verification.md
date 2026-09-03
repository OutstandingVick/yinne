# Phase 7 Verification

Verified on 2026-09-03 against the Phase 7 implementation and deterministic Acme Coffee test fixtures.

## Automated verification

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed |
| `pnpm format:check` | Passed |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed: 19/19 packages |
| `pnpm test` | Passed: 61/61 tests across 20 files |
| `pnpm test:integration` | Passed: 9/9 tests across 4 files |
| `pnpm openapi:validate` | Passed: OpenAPI 3.1, 82 operations |
| `pnpm verify:clean-db` | Passed: migrations, seed, 35 forced-RLS tables, append-only grants |
| `pnpm test:e2e` | Passed: 15/15 Chromium scenarios |
| `pnpm build` | Passed: 19/19 packages and 64 dashboard pages |

## Worker verification

The `subscription_billing` task was invoked directly for the seeded test tenant with a fixed `dueAt` timestamp and bounded batch size. It completed with exit code 0. The task intentionally returns no value; subscription, renewal, invoice, checkout, and payment outcomes are persisted transactionally.

The worker production bundle also passed through `tsup`. Native password-hashing bindings remain external to the bundle so the runtime loads the platform-specific package correctly.

## Database verification

The generated Phase 7 migration applies to an empty database before the seed runs. Composite tenant foreign keys, row-level security, forced RLS, tenant grants, and append-only financial/event grants were checked by the repository verification script. The temporary verification database was removed after the check.

The recurring seed is repeatable and restores mutable invoice fixtures before browser tests. The seeded subscription set covers active, trialing, past-due, paused, cancelled, successful renewal, failed renewal, and pending-payment scenarios.

## Behavioral verification

- Monthly and yearly UTC calendar arithmetic is covered, including end-of-month and leap-year clamping.
- Subscription transitions reject invalid pause, resume, cancel, and retry operations.
- Initial billing and recurring renewals reuse canonical Invoice, Checkout, and Payment services.
- Successful invoice payment advances the related subscription period and completes its renewal atomically.
- Failed collections move the subscription to `past_due`; retry creates a fresh payment attempt without duplicating the invoice.
- Pending payments retain the current period until the canonical payment-success path completes.
- Dashboard tests cover plan visibility, lifecycle states, immutable price snapshots, and renewal history.

## Result

No release-blocking Phase 7 verification failures remain.
