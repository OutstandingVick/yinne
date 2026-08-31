# Phase 3 Payments Core handoff

## 1. What was implemented

Canonical Payments, Attempts, immutable Transactions, full/partial Refunds, ProviderAccounts/Events, deterministic Mock Provider, signed/replay-safe provider ingress, order/inventory integration, domain/outbox/public-delivery queue projection, APIs, SDK, OpenAPI, dashboard, seed, tests, guides, and reviews.

## 2. Payment architecture

The modular-monolith Payments service creates canonical state in PostgreSQL, crosses a small provider adapter boundary outside long DB transactions, then commits normalized evidence and all downstream domain effects atomically.

## 3. Payment model

Organization/environment-owned intent linked to one Order, with server-derived customer/amount/currency, provider account, latest attempt, cumulative refund, metadata, explicit status/version, and timestamps. No provider response blob.

## 4. PaymentAttempt model

One execution instance with account/provider/status, stable reference, safe failure fields, restricted request/response metadata, lifecycle timestamps, and one-active-attempt constraint.

## 5. Transaction model

Positive bigint amount plus `charge|refund` direction, payment/refund links, currency, provider evidence, occurred time, and environment. Rows are unique evidence, append-only by grants and trigger, and are not ledger/settlement balances.

## 6. Refund model

Idempotent full or partial reversal request with explicit lifecycle, reason, reference/failure evidence, same payment currency, and locked remaining-refundable validation.

## 7. State machines

Payment supports created → pending/succeeded/failed and succeeded → partially_refunded/refunded. Pending resolves to succeeded/failed. Attempt supports created/submitted → pending/succeeded/failed/unknown and pending/unknown resolution. Refund supports created → pending/succeeded/failed. No arbitrary status PATCH exists.

## 8. Provider architecture

`ProviderAdapter` declares capabilities and normalized execute/retrieve/refund/verify operations. Core does not branch on Mock response shapes. Selection checks tenant, environment, enabled/default/explicit account, capability, and currency; it never automatically fails over after submission.

## 9. Mock Provider implementation

Test-only adapter with deterministic ID-derived references, safe normalized results, no external calls, and scenarios for success, decline, pending-success/failure, timeout-unknown-success reconciliation, and refund success/failure.

## 10. Provider capabilities

`payment.create`, `payment.retrieve`, `payment.refund`, and `webhook.verify`.

## 11. Provider webhook flow

Raw body + timestamp + HMAC signature is verified before normalization; replay window is five minutes; account/environment are resolved; event is stored; locked legal transition/financial effects/events commit; then 2xx acknowledgement returns.

## 12. Provider-event deduplication

Unique account/environment/external ID plus payload digest. Same digest replay is acknowledged with no effects; different digest conflicts. Integration tests prove one charge/stock/order transition.

## 13. Commerce integration

Payments calls Commerce transaction ports. It does not duplicate Order state rules.

## 14. Inventory/order behavior

Success locks the unpaid/unfulfilled Order and every tracked level, rechecks availability, decrements once with immutable order-linked movements, then marks paid. Refund changes financial status but does not imply physical restock.

## 15. Public webhook flow

Domain state, audit, stable Event, outbox job, and matching exact/wildcard WebhookDelivery queue rows persist together. Delivery is asynchronous and never blocks payment execution. External transport/SSRF operational hardening is intentionally not exercised in Phase 3 tests.

## 16. API operations

List/create/get Payments; list/create/get Refunds; list/get Transactions; list ProviderAccounts; signed Mock provider ingress. Create operations require canonical idempotency headers.

## 17. SDK changes

Typed `payments`, `refunds`, `transactions`, and `providerAccounts` clients with pagination, retrieval, automatic/explicit idempotency keys, and full payment evidence types.

## 18. OpenAPI changes

OpenAPI 3.1 now validates 27 operations and documents Phase 3 input schemas, idempotency, deterministic examples, provider ingress, minor-unit strings, and canonical errors.

## 19. Dashboard pages

Real Payments list/detail, Transactions, Refunds, Settings/Providers, Developer/Mock Provider, and order “Pay with Mock Provider” action. Detail includes attempt, transaction, refund, associated order, and Test Mode context without secret/raw provider fields.

## 20. RBAC changes

Existing canonical permissions are enforced: `orders:write` creates an order payment, `payments:read` reads financial evidence, `payments:refund` refunds, and `providers:read` views accounts. Staff/analyst/developer have no refund permission.

## 21. Events added

`payment.created|pending|succeeded|failed`, `refund.created|pending|succeeded|failed`, `transaction.created`, `order.paid|partially_refunded|refunded`.

## 22. Seed/demo changes

Acme has one enabled default test Mock account and succeeded, failed, pending, fully refunded, and partially refunded examples tied to different orders. Paid examples include charge/refund evidence and one stock movement; other unpaid orders remain.

## 23. Tests added

State/provider unit tests, provider contract behavior, PostgreSQL payment/refund/immutability/dedupe/outbox lifecycle, API idempotency/refund golden path, and browser payment detail verification. Final totals: 23 unit, 9 PostgreSQL integration, 4 E2E.

## 24. Security findings

Migration index ordering, replay-before-state-check, ciphertext-only endpoint secret naming, signature validation, and delivery atomicity were fixed. No critical/high finding remains; see `phase-3-security-review.md`.

## 25. Financial-correctness findings

PostgreSQL aggregate conversion to bigint, locked refund balance, immutable unique evidence, full-order authority, stock-at-success, and replay safety pass. See `phase-3-financial-correctness-review.md`.

## 26. Known limitations

Mock is the only adapter and is test-only. Timeout reconciliation is webhook-driven, not scheduled polling. Public delivery rows are queued, while arbitrary external URL transport/replay UI awaits complete SSRF/DNS pinning and secret-rotation operations. No automatic inventory return occurs on refund.

## 27. Deferred work

Hosted Checkout, Payment Links, real PSP/bank/stablecoin adapters, raw card collection, payouts, subscriptions, invoices, hosted outbound webhook endpoint administration/replay, marketplace, capital intelligence, and advanced analytics.

## 28. ADRs created

None. Implementation applied canonical planning without an irreversible design change.

## 29. Exact commands to run

```bash
cd /Users/macbook/yinne
pnpm install --frozen-lockfile
docker compose up -d
pnpm db:migrate && pnpm worker:migrate
pnpm db:seed && pnpm db:check
pnpm verify:clean-db
pnpm openapi:validate
pnpm format:check && pnpm lint && pnpm typecheck
pnpm test && pnpm test:integration && pnpm test:e2e
pnpm build
pnpm --filter @yinne/worker start
```

## 30. Recommended next implementation phase

Implementation Phase 4: Hosted Checkout and Payment Links, consuming this provider-neutral, replay-safe Payments Core without changing its canonical entities.

PHASE 3 COMPLETE — READY FOR CHECKOUT & PAYMENT LINKS
