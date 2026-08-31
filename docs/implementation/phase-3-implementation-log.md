# Phase 3 implementation log

**Implementation date:** 2026-08-28

1. Audited build readiness, Phase 1/2 handoffs/reviews, payment/provider/event/webhook/security/API specifications, order state/inventory behavior, RLS, idempotency, outbox, worker, OpenAPI, SDK, and dashboard patterns.
2. Recorded `phase-3-payments-core-plan.md` before production changes; no ADR was needed.
3. Added provider accounts, payments, attempts, refunds, transactions, provider events, webhook endpoint/subscription/delivery tables, indexes, constraints, environment-aware forced RLS, append-only transaction grants/triggers, and migrations `0006`/`0007`.
4. Added provider-neutral contracts/state machines and deterministic Mock execution, normalized errors, stable references, signature/replay verification, normalization, and event deduplication.
5. Added two-phase payment execution: short creation transaction, provider boundary, then locked atomic finalization. Success creates one charge transaction and calls the Commerce-owned order port to recheck/decrement stock and mark paid.
6. Added full/partial refunds with locked remaining-balance validation, one refund transaction, cumulative payment/order states, and no automatic inventory restock.
7. Added payment/refund/transaction/provider list/get/create APIs, idempotency, SDK resources, 27-operation OpenAPI, dashboard lists/detail/actions, provider settings, and Mock developer guide.
8. Expanded event catalogue. Domain mutation, audit, event/outbox, Graphile job, and matching public webhook delivery rows persist atomically. Public delivery remains asynchronous and does not block payment finalization.
9. Expanded Acme with a default test Mock account plus succeeded, failed, pending, fully refunded, and partially refunded payment examples while preserving unpaid orders.
10. Added state/provider unit tests, PostgreSQL payment/refund/replay/immutability/outbox integration, API/browser golden path, provider contributor docs, and reviews.

Implementation fixes discovered during verification: composite unique indexes were moved before generated composite foreign keys; payment idempotency replay was moved before current-state rejection; PostgreSQL aggregate strings are explicitly converted to bigint; webhook secrets were renamed to ciphertext-only storage; and public delivery projection was made transactional with its source event.
