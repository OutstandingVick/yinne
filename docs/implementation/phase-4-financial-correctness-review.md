# Phase 4 financial correctness review

**Verdict:** PASS for Phase 4 test-mode execution.

- Product quotes resolve active canonical Variants and snapshot current bigint unit amounts/currency. Fixed/flexible values are positive integer minor-unit strings with server-stored currency and enforced bounds.
- Confirmation creates/replays one canonical Commerce Order and Payments derives its amount/currency exclusively from that Order. Collection links use a Commerce-owned collection OrderItem; Checkout never writes payment/transaction/inventory facts.
- Payment success remains the sole boundary for one charge Transaction, Order paid transition, applicable stock decrement, and financial events.
- Checkout reconciliation occurs in Payments finalization. The Checkout, optional link row, payment, Order effect, Transaction, audit, DomainEvents, and outbox records commit together.
- Row locks, unique Order/Payment references, provider evidence uniqueness, idempotency records, `link_usage_counted`, and locked usage-limit checks prevent replay from double charging or double consuming a link.
- Failure creates no charge Transaction and reopens Checkout. Pending stays processing; verified webhook finalization reaches the same success/failure path. Expiration does not cancel a processing payment; late success is recorded.

The executed smoke test produced one Customer, Order, Payment, charge, completed Checkout, and one completed link use; replay retained the same Payment and usage count.
