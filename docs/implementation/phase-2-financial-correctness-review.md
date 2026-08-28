# Phase 2 financial correctness review

**Review date:** 2026-08-28  
**Scope:** Money, prices, quantities, inventory, order totals, state transitions, and payment boundary

## 1. Verdict

No unresolved critical or high-severity financial-correctness finding remains in Phase 2.

## 2. Money representation

- Database monetary columns use PostgreSQL `bigint` minor units.
- Runtime calculations use JavaScript `bigint` only.
- API/SDK monetary fields are decimal integer strings.
- Decimal/floating-point amounts are rejected by contracts and money primitives.
- Values and derived totals are checked against PostgreSQL bigint maximum.

Unit tests cover values above JavaScript's safe-number range, decimal/sign/leading-zero rejection, multiplication, addition, and overflow.

Result: pass.

## 3. Price and total authority

- Order input contains only variant IDs and integer quantities; price and total fields are rejected as unknown.
- The order service reads the active variant price/currency and product/variant names/SKU from the database.
- Each line total is checked `unit_amount * quantity`.
- The order subtotal and total are checked sums of line totals.
- Database checks independently enforce nonnegative amounts and item multiplication equality.

Integration tests verify a non-round price (`125099`) multiplied by three yields the exact snapshot and total (`375297`).

Result: pass.

## 4. Currency consistency

- Variant currency is an uppercase three-letter code.
- Every line must match the order currency.
- One order cannot contain multiple currencies.
- Variant currency becomes immutable after the variant is referenced by an order.
- Phase 2 has no FX conversion, tax, discount, or shipping arithmetic.

Result: pass.

## 5. Quantity and inventory

- Order quantities are integers from 1 through 10,000; an order contains at most 100 unique variants.
- Inventory deltas are nonzero integer strings and use BigInt.
- Inventory-level updates lock the level row and reject negative or overflowing results.
- Each successful change appends the delta and resulting on-hand balance.
- Database constraints enforce nonnegative levels/results, and triggers enforce movement immutability.

Integration tests verify successful stock creation, negative-stock rejection, and database-level movement immutability.

Result: pass.

## 6. Order creation and stock timing

Order creation validates available stock at the selected location but does not decrement or reserve it. Tests verify on-hand remains unchanged after order creation.

This is deliberate: an unpaid order has not created a financial commitment. Payments Core must, in one transaction at payment success, lock/re-check inventory, reject insufficient stock according to its approved failure policy, decrement levels, and append order-linked movements.

Accepted consequence: multiple concurrent unpaid orders may reference the same on-hand stock. The UI and implementation log state this boundary; no component claims an unpaid order reserves stock.

Result: correct for Phase 2 scope, with an explicit Phase 3 obligation.

## 7. State machines

Phase 2 creation state is fixed to:

- `financial_status = unpaid`;
- `fulfilment_status = unfulfilled`.

The only exposed transition is:

- `unpaid/unfulfilled -> unpaid/cancelled`.

Cancellation takes a row lock and rejects repeated cancellation or any non-unpaid/non-unfulfilled state. There is no service, route, SDK method, or dashboard control to mark an order paid, refunded, fulfilled, or deleted. Tests assert the paid/fulfil mutation surface is absent.

Result: pass.

## 8. Idempotent commercial creation

Matching order-create retries return the original order ID and totals. Reusing a key with different quantities returns a conflict. The order, snapshots, audit, event, outbox, and completed idempotency response are written in one transaction; a rollback cannot leave a successful replay record for a failed order.

Result: pass.

## 9. Historical integrity

- Order items retain names, SKU, price, currency, quantity, and total independently of future catalogue changes.
- Order items cannot be updated/deleted.
- Orders have no delete API.
- Catalogue archive is non-destructive.
- Customer/order foreign keys prevent orphaned historical references.

Result: pass.

## 10. Deferred obligations for Payments Core

- Add payment-attempt and provider state machines without treating the order as payment evidence.
- Make payment-success inventory decrement atomic and idempotent.
- Define the policy when stock disappears between unpaid order creation and payment success.
- Add ledger-grade payment/refund records and reconciliation; do not retrofit financial truth into mutable order fields.
- Preserve integer minor units and one-currency-per-order invariants.
