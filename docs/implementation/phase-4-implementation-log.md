# Phase 4 implementation log

**Implemented:** 2026-08-28

- Added environment-bound `payment_links`, `checkout_sessions`, and append-only `checkout_line_items`, composite ownership constraints, forced RLS, capability resolvers, indexes, checks, grants, and immutable triggers in migration `0008_mixed_gunslinger.sql`.
- Added `@yinne/checkout` with product/fixed/flexible link validation, immutable server-priced quotes, expiration, public capability resolution, guest capture, Commerce Order orchestration, Payments execution, failure retry, pending handling, completion, and completed-use accounting.
- Extended Commerce with a narrowly scoped fixed/flexible collection-order command. It still writes canonical Orders/OrderItems and leaves payment, inventory, and transaction effects to Payments.
- Extended Payments finalization so normalized immediate or webhook results reconcile the linked Checkout in the same financial transaction and increment a link exactly once.
- Added granular RBAC, domain events/outbox delivery, authenticated/public API routes, hosted `/pay/:token` and `/checkout/:token`, merchant dashboard pages, SDK resources, OpenAPI operations, Phase 4 fixtures, and state/contract tests.
- Capability tokens are 256-bit random values; only SHA-256 digests and eight-character diagnostic prefixes are stored. Creation responses display public URLs once.

No real PSP, raw payment credentials, full storefront, discounts, tax, shipping, subscription, invoice, payout, marketplace, custom-domain, or advanced fraud feature was added.
