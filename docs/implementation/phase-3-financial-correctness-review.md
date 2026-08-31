# Phase 3 financial correctness review

**Review date:** 2026-08-28

## Verdict

No unresolved critical or high-severity financial-correctness finding remains.

- All amounts are PostgreSQL/JavaScript bigint and API decimal integer strings; no float path exists.
- Payment amount, currency, customer, merchant, and location derive from the locked Order. Phase 3 supports full-order payment only.
- Explicit state machines reject regression and arbitrary status mutation. Provider timeout remains unknown/pending.
- Payment creation/refund are replay-safe; changed payload under a key conflicts. Stable provider keys/references derive from attempts/refunds.
- First success locks order/inventory, rechecks stock, decrements once with an order-linked immutable movement, creates exactly one charge transaction, marks the order paid, and writes events/outbox atomically.
- Duplicate provider events use unique account/environment/external ID and digest; replay produces no transaction, order, stock, event, or delivery duplication.
- Refund amount is positive, same currency, and bounded by `amount - succeeded_refunded - pending`. Payment/refund row locks and database checks prevent concurrent over-refund. Full and partial states are cumulative.
- Succeeded refund creates one immutable refund transaction and changes payment/order state. Inventory is deliberately not auto-restocked because refund is not proof of a returned physical item.
- Transactions use positive amount plus `charge|refund` kind, unique provider evidence, no dashboard mutation, no UPDATE/DELETE grant, and a rejection trigger. They are operational evidence, not settlement or ledger balances.
- Test/live accounts, rows, references, idempotency, and queries are isolated. Mock cannot be live.

Integration and browser/API tests prove exact charge/refund counts, one stock movement, idempotent replay, pending resolution, provider-event dedupe, partial/full refunds, and transaction immutability.
