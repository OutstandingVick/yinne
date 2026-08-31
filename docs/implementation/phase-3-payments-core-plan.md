# Phase 3 Payments Core implementation plan

**Status:** Approved for implementation  
**Prepared:** 2026-08-28

## Scope and boundaries

Phase 3 adds canonical organization-owned, environment-bound Payments, PaymentAttempts, immutable Transactions, Refunds, ProviderAccounts, ProviderEvents, deterministic Mock Provider execution, signed inbound provider webhooks, payment/refund APIs, public payment event delivery, SDK and dashboard surfaces. It integrates successful payment and refund facts with the existing Commerce order service. Hosted checkout, payment links, real PSP/bank/stablecoin adapters, card collection/vaulting, payouts, subscriptions, invoices, marketplace, capital intelligence, and advanced analytics remain excluded.

## Domain model and commerce integration

- **Order** is the commercial obligation. Phase 3 accepts only an unpaid, unfulfilled, non-cancelled order and derives customer, amount, currency, merchant, and location server-side. Partial order payments are not supported.
- **Payment** is the canonical intent to collect the order total in one currency. It owns status and cumulative refunded amount, but contains no provider response blob.
- **PaymentAttempt** is one provider execution. It owns provider reference, normalized safe evidence, and failure fields. One submitted/pending attempt may exist per payment.
- **Transaction** is append-only evidence created only for a succeeded charge or refund. Amounts are positive minor-unit bigint; `kind` supplies direction.
- **Refund** is an idempotent request against a succeeded/partially-refunded payment. Multiple partial refunds are allowed; row locking prevents their succeeded sum exceeding the charge.
- **ProviderEvent** is signed, deduplicated external evidence. It is not a DomainEvent.
- **DomainEvent** is internal committed business evidence and drives the existing outbox.
- **WebhookDelivery** is an asynchronous, retryable public projection of one DomainEvent.

On first payment success, Payments calls a Commerce transaction helper rather than duplicating order rules. The helper locks the order and inventory levels, rechecks stock, writes order-linked negative movements, marks the order paid, and records `order.paid` within the same PostgreSQL transaction as payment/attempt/transaction/events. If stock is unavailable, the provider evidence is retained as an attempt/provider event and processing fails visibly; it is never guessed away.

## State machines

- Payment: `created -> pending|succeeded|failed`; `pending -> succeeded|failed`; `succeeded -> partially_refunded|refunded`; `partially_refunded -> partially_refunded|refunded`. Financial terminal facts never regress.
- Attempt: `created -> submitted -> pending|succeeded|failed|unknown`; `pending|unknown -> succeeded|failed`. API clients cannot patch status.
- Refund: `created -> pending|succeeded|failed`; `pending -> succeeded|failed`.

Provider execution and verified provider events own attempt/payment/refund execution transitions. Refund commands create requests; only normalized provider results create refund financial facts.

## Provider contract and selection

The capability-based adapter contract exposes capabilities, execute/retrieve payment, refund, verify webhook, and normalize event. Results use provider-neutral statuses, stable references, safe metadata, and normalized errors (`declined`, `invalid_request`, `unsupported`, `unavailable`, `timeout`, `conflict`, `unknown`). Provider selection accepts an explicit compatible account or the single enabled default matching organization, environment, capability, and currency. Ambiguity, disabled accounts, unsupported currencies, and cross-environment use fail before execution. There is no automatic provider failover.

Mock Provider requires no credentials and is rejected outside test mode. Its per-request scenario is restricted to test-only confirmation data: `success`, `failure:declined`, `pending:then_success`, `pending:then_failure`, `timeout:then_success`, `refund_success`, and `refund_failure`. References and event IDs derive deterministically from Yinne IDs; no random/global-next-result behavior is used. HMAC-SHA256 webhook signatures cover `timestamp.raw_body`, use constant-time comparison, and enforce a five-minute replay window.

## Database and transaction semantics

Add `provider_accounts`, `payments`, `payment_attempts`, `transactions`, `refunds`, `provider_events`, `webhook_endpoints`, `webhook_subscriptions`, and `webhook_deliveries`. Every tenant row carries `organization_id`; financial rows also carry `environment`; composite ownership/environment constraints, checks, unique evidence/idempotency keys, indexes, forced RLS, and immutable triggers provide defense in depth. Provider credentials and webhook secrets are not exposed; Mock needs no provider credential. Public endpoint secrets are stored as server-peppered digests/encrypted material when endpoint administration is introduced.

State mutation, transaction evidence, commerce reaction, audit, DomainEvents, and outbox rows share one transaction. Provider calls occur outside long-running database transactions. Provider events are durably deduplicated before effects; same ID/same digest is acknowledged, while a changed digest conflicts.

## Idempotency, events, and public webhooks

Payment and refund POSTs require 16–255 printable-ASCII `Idempotency-Key`. Scope is organization, principal, environment, operation. SHA-256 request/key digests plus a transaction advisory lock guarantee same-key replay and conflict on changed payload. Provider idempotency derives from attempt/refund ID. Duplicate provider events, API retries, and worker retries must not create duplicate payments, transactions, order transitions, inventory movements, events, or deliveries.

Events added: `payment.created`, `payment.pending`, `payment.succeeded`, `payment.failed`, `refund.created`, `refund.pending`, `refund.succeeded`, `refund.failed`, `transaction.created`, `order.paid`, `order.partially_refunded`, and `order.refunded`. Existing outbox persistence remains the atomic boundary. Public delivery uses a stable versioned event envelope, subscription filtering, HMAC signing, stable event IDs, attempt history, bounded backoff, and never blocks payment execution.

## API, RBAC, SDK, UI

Implement list/create/get payments, create/list/get refunds, list/get transactions, list/get provider accounts, and Mock provider webhook/simulator operations. Lists are tenant/environment scoped, cursor paginated, and bounded. Payments require `payments:read`; creation uses `orders:write`; refunds require `payments:refund`; transactions use `payments:read`; provider settings use `providers:read/write`. Foreign tenant resources return 404. Staff/analyst/developer cannot refund under the existing matrix.

Extend `@yinne/sdk` with typed `payments`, `refunds`, `transactions`, `providerAccounts`, and Mock webhook construction/verification helpers. Update OpenAPI with exact runtime schemas, errors, idempotency, permissions, pagination, and test examples. Add real Payments, Transactions, Refunds, payment detail, Settings/Providers, and Developer/Mock Provider pages with persistent Test Mode treatment and no secret/raw-provider fields.

## Security and financial correctness

No float money, raw card fields, arbitrary order amount/currency, plaintext provider secrets, raw webhook logging, provider-specific branching in canonical models, live Mock execution, or mutable transactions. Validate metadata size/depth, signature shape/time, provider account ownership/environment/capability/currency, and all legal transitions. Lock payment/refund/order/inventory rows for finalization. Event and transaction uniqueness make replay harmless.

## Seed, tests, and acceptance

Acme gets one enabled default test Mock account plus succeeded, failed, pending, fully refunded, and partially refunded examples tied to varied seed orders. Seed remains repeatable and does not mark every order paid.

Tests cover state machines, money, provider capabilities/errors, contract conformance, deterministic scenarios, signatures, event normalization/deduplication, payment/refund idempotency, tenant and test/live isolation, amount/currency authority, refund concurrency/overrun, immutable transactions, outbox atomicity, order/inventory integration, API/RBAC, and browser success/pending lifecycles. Verification runs frozen install, existing/clean migrations, repeatable seed, DB checks, OpenAPI, format, lint, typecheck, unit/integration/API/provider tests, E2E, builds, and worker startup/job/shutdown.

Acceptance requires one replay-safe golden path from unpaid order through deterministic success to exactly one charge transaction, paid order, stock movement, domain/public event queue, SDK/API/dashboard visibility; equivalent failure and pending resolution paths; safe full/partial refunds; and all required Phase 3 reviews/handoff with no critical blocker.

## ADRs

None planned. The choices above directly apply the canonical planning. Any discovered materially irreversible conflict will be recorded before implementation proceeds.
