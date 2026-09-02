# Phase 5 financial correctness review

**Verdict:** PASS for deterministic test-mode execution.

Storefront stores no price or financial status. Public price strings are projected from canonical bigint Variant minor units. Checkout initiation re-reads active Variants/currency and available Inventory; the client cannot submit an amount. The resulting Checkout Session snapshots the quote through the existing Phase 4 service.

Guest confirmation creates/reuses the canonical Customer and creates exactly one canonical Order. Payments derives amount/currency from that Order. Payment success remains the only boundary for a charge Transaction, paid Order, and stock decrement. Decline creates no charge; pending remains processing for verified reconciliation.

Storefront initiation uses the existing idempotency store and stable key. Checkout confirmation, provider delivery, Transaction uniqueness, and stock effects retain Phase 3–4 locking/deduplication. No financial state is inferred from the confirmation UI.
