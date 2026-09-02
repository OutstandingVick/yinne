# Phase 6 financial correctness review

## Invariants

- Money is represented as integer minor units and validated before persistence.
- An Invoice total is the checked sum of immutable line-item snapshots.
- Draft to open allocates one number within organization, environment, and calendar year.
- Only open Invoices are payable; paid and void are terminal.
- `overdue` is derived from open plus due date and never stored as a competing source of truth.
- Collection creates a canonical Checkout Session, Order, and Payment rather than a parallel rail.
- Payment finalization must match Invoice amount and currency and writes Payment and Invoice state in
  the same database transaction.

## Concurrency and replay

Invoice creation and collection accept idempotency keys. Row locking serializes lifecycle mutations.
Unique constraints prevent duplicate invoice numbers and duplicate Payment relationships. A replayed
provider success remains idempotent in the Payments domain; a second successful Payment cannot move
a paid Invoice through another state transition.

## Reconciliation keys

Support and accounting can correlate `invoice_id`, `checkout_session_id`, `order_id`, and
`payment_id`. These identifiers are retained after payment or voiding. Invoice records do not replace
the Payment ledger or Order snapshot.

## Result

The implementation preserves a single canonical payment path and does not use floating point money.
Partial settlement, credit notes, tax calculation, refunds, and recurring billing are excluded rather
than approximated.
