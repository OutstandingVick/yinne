# Phase 7 Handoff: Subscriptions and Recurring Revenue

## 1. What was implemented

Phase 7 adds tenant- and environment-scoped subscription plans, recurring prices, subscriptions, renewal records, canonical recurring invoices and payments, lifecycle controls, worker execution, API/SDK contracts, dashboard workflows, fixtures, tests, and operational documentation.

## 2. Plan architecture

`subscription_plans` owns merchant-facing product identity and lifecycle. Plans can be created, listed, inspected, and archived; archival prevents new subscriptions without mutating existing ones.

## 3. Price architecture

`recurring_prices` belongs to a plan and defines BigInt minor-unit amount, ISO currency, monthly or yearly interval, and interval count. Prices are immutable commercial terms after creation and can be archived.

## 4. Subscription model

`subscriptions` links organization, environment, merchant, customer, plan, and price. It stores lifecycle state, current period, next billing time, trial/cancellation timestamps, and a stable commercial snapshot.

## 5. Subscription state machine

Explicit guards control `trialing`, `active`, `past_due`, `paused`, and `cancelled`. Invalid transitions return canonical API errors; cancellation is terminal.

## 6. Recurring date semantics

All calculations use UTC calendar dates. Monthly and yearly movement clamps to the final valid day, including month-end and leap-year cases, and interval counts are applied deterministically.

## 7. Price snapshot behavior

The subscription snapshots plan name, price amount, currency, interval, and interval count at creation. Later plan or price archival cannot rewrite existing commercial terms.

## 8. Initial billing behavior

Non-trial creation establishes the first period and synchronously starts its canonical renewal flow. Trialing subscriptions defer collection until trial expiry. The API reloads the subscription after initial billing so callers see the resulting state.

## 9. Renewal engine

The engine finds due subscriptions, claims one subscription-period pair, creates or reuses its renewal record and invoice, initiates canonical checkout/payment, records the outcome, and advances exactly one period only after success.

## 10. Worker architecture

Graphile Worker exposes `subscription_billing` with organization, environment, due time, and bounded batch input. Scheduling uses the existing worker conventions and delegates business behavior to the subscriptions module.

## 11. Renewal idempotency/concurrency protection

A unique tenant-scoped subscription/period constraint prevents duplicate renewal records. Transactional row locking, unique invoice linkage, canonical idempotency keys, and terminal-outcome checks make repeated jobs and callbacks safe.

## 12. Invoice integration

Every billing period uses the Phase 6 Invoice service and tables. Invoices carry subscription and period linkage; retry reuses the period invoice rather than generating a duplicate financial obligation.

## 13. Payment integration

Collection uses canonical Checkout and Payments Core. Payment success reconciles the invoice and atomically completes the linked renewal and subscription-period advancement.

## 14. Provider capability interaction

The Mock Provider deterministically supplies succeeded, failed, and pending outcomes through Payments Core. Phase 7 does not introduce provider-owned subscription state or claim saved-payment credentials.

## 15. Failed renewal behavior

A failed collection records the failed renewal and payment attempt, preserves the invoice, moves the subscription to `past_due`, and does not advance its billing period.

## 16. Retry behavior

Authorized retry is limited to eligible past-due subscriptions. It creates a fresh checkout/payment attempt for the existing renewal invoice under a new idempotency key, then applies the canonical outcome.

## 17. Pending behavior

Pending payment leaves the renewal pending and the current subscription period unchanged. A later idempotent canonical payment-success path performs reconciliation and one period advancement.

## 18. Cancellation

Immediate cancellation is supported, as is cancellation at the current period end. The latter records intent and allows the current paid period to finish; terminal cancellation prevents later billing.

## 19. Pause/resume where implemented

Active or trialing subscriptions can be paused. Resume returns a paused subscription to billable operation using controlled state transitions and audited service methods.

## 20. Trials where implemented

Creation accepts a bounded trial end. Trialing subscriptions retain normal price terms but do not collect until due; trial expiry enters the same canonical renewal engine.

## 21. API operations

Versioned operations cover plan create/list/detail/archive, recurring-price create/list/archive, subscription create/list/detail, cancel, pause, resume, and retry. Existing request IDs, tenancy, environment selection, validation, and error envelopes are reused.

## 22. SDK changes

The TypeScript SDK exposes typed clients for all new plan, price, subscription, and lifecycle endpoints while retaining the shared transport and response conventions.

## 23. OpenAPI changes

`openapi/yinne-v1.json` documents the new schemas and operations. Validation passes as OpenAPI 3.1 with 82 total operations.

## 24. RBAC

Subscription read/write, cancellation, and retry permissions are registered in the established role matrix. API-key scopes and dashboard sessions are checked by the shared authorization layer.

## 25. Events/webhooks

Plan, price, subscription lifecycle, renewal, invoice, and payment consequences use the existing domain-event/outbox path. Stable aggregate IDs and versions preserve downstream webhook ordering and replay handling.

## 26. Audit behavior

Merchant lifecycle mutations use the existing actor/request context and audit conventions. Financial state is derived through canonical services rather than dashboard-side writes.

## 27. Dashboard changes

The dashboard adds real-data plan and subscription indexes, creation forms, detail views, price snapshots, period and renewal history, status presentation, and permitted lifecycle actions.

## 28. Seed/demo changes

The repeatable Acme Coffee seed supplies three plans, three prices, and eight subscription scenarios spanning active, trialing, past-due, paused, cancelled, successful, failed, and pending outcomes.

## 29. Tests

Verification passed 61 unit tests in 20 files, 9 PostgreSQL integration tests in 4 files, 15 Chromium E2E scenarios, OpenAPI validation, clean-database verification, and all 19 package builds. Subscription tests cover calendar boundaries and state transitions.

## 30. Security findings

No release blocker remains. All new mutable tables force RLS, tenant/environment keys are carried through relationships, authorization is server-side, public secrets are digested, and no card or reusable payment credential is stored.

## 31. Financial-correctness findings

Amounts remain BigInt minor units with explicit currency. Invoice is the canonical receivable and Payments Core is the canonical collection record. Failure/pending cannot advance service periods, and retry cannot create a second obligation.

## 32. Recurring-revenue-correctness findings

Date arithmetic is deterministic; terms are snapshotted; a subscription-period has one renewal and one invoice; worker replays are safe; and duplicate payment success cannot advance multiple periods. No correctness blocker remains.

## 33. UX/accessibility findings

Forms use labels, validation summaries, semantic controls, status text, and confirmation language. Tables and detail pages expose lifecycle and financial context without relying on color alone. No release-blocking finding remains.

## 34. Known limitations

The current provider is deterministic and test-only. Pause resumes without proration, trial configuration is deliberately simple, billing is UTC-based, and operator-triggered retry is the available dunning mechanism.

## 35. Deferred items

Real PSPs, saved-card vaulting, provider-native billing, metered or seat billing, proration, coupons, bundles, entitlements, tax, revenue recognition, accounting, notification campaigns, and advanced analytics remain out of scope.

## 36. ADRs

No new ADR was required. Phase 7 follows the approved tenancy, money, invoice, payment-provider, outbox/webhook, worker, and public-capability decisions documented by the existing ADRs and planning set.

## 37. Exact run commands

```bash
cd /Users/macbook/yinne
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm db:check
pnpm verify:clean-db
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm openapi:validate
pnpm test:e2e
pnpm build
pnpm --filter @yinne/worker start
```

Use `Ctrl-C` after the worker reports readiness to exercise graceful shutdown. Set the documented local environment variables, including `DATABASE_URL`, `AUTH_SECRET`, and `YINNE_SEED_PASSWORD`, before running database, dashboard, worker, or E2E commands.

## 38. Git/remote state

Phase 7 began at `3d7ee2fd9497c538b3cce4c4ee63c9662c378492` on `main`. Its 30 logical commits are pushed to `https://github.com/OutstandingVick/yinne`; no history was rewritten or force-pushed. The final commit is the commit containing this handoff.

## 39. Recommended next phase

Proceed to Analytics and Business Intelligence using the canonical orders, invoices, payments, refunds, and subscription-renewal facts now available. Analytics must remain a derived read model and must not become a second source of financial or subscription truth.

PHASE 7 COMPLETE — READY FOR ANALYTICS & BUSINESS INTELLIGENCE
