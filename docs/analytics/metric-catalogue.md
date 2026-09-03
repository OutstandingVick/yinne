# Yinne Metric Catalogue

Formula version: `analytics.v1`. All windows are half-open `[from,to)`, timestamps are stored as UTC, calendar grouping uses the requested approved IANA timezone, and money is returned as minor-unit decimal strings partitioned by ISO currency. Successful means the canonical persisted terminal success state. Unless stated otherwise, tenant, environment, authorized location, currency, and time filters apply before aggregation.

## Commerce and money

| Name                  | Meaning and formula                                                                             | Canonical source and states                                                          | Treatment and edge cases                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| GMV                   | Gross processed commercial volume = sum succeeded charge transaction amount                     | `transactions(type=charge,status=succeeded)` joined to `payments`; occurrence window | Refunds do not reduce GMV. Never add Orders or Payments to the transaction sum. Group by currency.    |
| Net collected         | Cash-flow-like processed volume = succeeded charge amount − succeeded refund transaction amount | `transactions` succeeded charge/refund; occurrence window                            | Only successful refunds subtract, at refund occurrence time. May be negative. Not accounting revenue. |
| Paid order volume     | Sum immutable total of paid commerce orders                                                     | `orders(status=paid)`; order paid time                                               | Non-order invoices excluded. Group by order currency.                                                 |
| Paid order count      | Distinct paid commerce orders                                                                   | `orders(status=paid)`                                                                | Payment retries never increase count.                                                                 |
| AOV                   | Paid order volume / paid order count                                                            | Paid `orders`                                                                        | Per currency. Null when count is zero; integer minor-unit result rounded half-up.                     |
| Refund volume rate    | Successful refund transaction amount / successful charge transaction amount                     | Succeeded `transactions` in same occurrence window                                   | Per currency; null when charge amount is zero.                                                        |
| Refunded payment rate | Distinct succeeded payments with any successful refund / succeeded payments                     | `payments`, `refunds(status=succeeded)`                                              | Null when no succeeded payments. Separate from refund volume rate.                                    |

## Payments

| Name                 | Meaning and formula                                 | Canonical source and states                        | Treatment and edge cases                                            |
| -------------------- | --------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| Payment success rate | Succeeded Payments / terminal Payments              | `payments`; terminal = succeeded or failed         | Pending excluded from denominator. Null for zero terminal payments. |
| Payment failure rate | Failed Payments / terminal Payments                 | `payments`                                         | Pending excluded. Null for zero terminal payments.                  |
| Attempt success rate | Succeeded attempts / terminal attempts              | `payment_attempts`; terminal = succeeded or failed | Retries count independently and are explicitly attempt-level.       |
| Failed attempts      | Count and normalized failure-code/provider grouping | `payment_attempts(status=failed)`                  | Raw sensitive provider messages excluded.                           |
| Pending payments     | Current count and amount                            | `payments(status=pending)`                         | Not treated as failed or collected. Partition by currency.          |

## Customers

| Name                      | Meaning and formula                                                     | Canonical source and states                                       | Treatment and edge cases                                             |
| ------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Total customers           | Created customer records as of `to`                                     | `customers(created_at < to)`                                      | Includes non-buyers and is labelled accordingly.                     |
| Buyers                    | Distinct identified customers with ≥1 paid order before `to`            | Paid `orders.customer_id`                                         | Anonymous orders excluded and disclosed via identity coverage.       |
| New buyers                | Customers whose first paid order is in `[from,to)`                      | Earliest paid `orders` per customer                               | Customer creation time is irrelevant.                                |
| Repeat buyers             | Buyers with ≥2 paid orders before `to`                                  | Paid `orders` grouped by customer                                 | Attempts do not count as purchases.                                  |
| Repeat purchase rate      | Repeat buyers / buyers                                                  | Same lifetime-to-`to` cohort                                      | Null when buyer count is zero; not called retention.                 |
| Historical customer value | Net collected attributed to identified customer's order-linked payments | Succeeded charge/refund transactions linked through payment/order | Descriptive, not predictive LTV; unattributed transactions excluded. |

## Product, channel, and location

| Name                    | Meaning and formula                                                       | Canonical source and states                     | Treatment and edge cases                                |
| ----------------------- | ------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| Product units sold      | Sum OrderItem quantity on paid orders                                     | `order_items` snapshots joined to paid `orders` | Current Product data never rewrites history.            |
| Product sales volume    | Sum OrderItem snapshot total on paid orders                               | Same                                            | Gross order allocation, partitioned by currency.        |
| Product order count     | Distinct paid orders containing snapshot product                          | Same                                            | Ranking always states units, volume, or count.          |
| Orders by channel       | Paid order count grouped by persisted `orders.source`                     | Paid `orders`                                   | No URL inference. Unknown remains an explicit bucket.   |
| Order volume by channel | Paid order total grouped by source/currency                               | Paid `orders`                                   | Invoice-only payments excluded.                         |
| Orders by location      | Total/paid order counts by immutable `location_id`                        | `orders`                                        | Authorized location intersection is applied first.      |
| Collected by location   | Succeeded order-linked charge minus refund transactions by order location | `transactions` → `payments` → `orders`          | Unattributed non-order payments excluded and disclosed. |
| Inventory warnings      | Count inventory levels at or below reorder threshold                      | `inventory_levels`                              | Current operational counter, not time-windowed history. |

## Subscriptions

| Name                     | Meaning and formula                                                                                         | Canonical source and states                           | Treatment and edge cases                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| Active subscriptions     | Count state `active` as of query time                                                                       | `subscriptions`                                       | Trialing, paused, past_due, cancelled separate.                               |
| MRR                      | Sum normalized snapshotted active price: monthly `amount/intervalCount`; yearly `amount/(12×intervalCount)` | Active `subscriptions` price snapshots                | Integer rational calculation, half-up per subscription, currency partitioned. |
| ARR                      | MRR × 12                                                                                                    | Canonical MRR result                                  | Never independently normalized.                                               |
| Subscriptions created    | Created in `[from,to)`                                                                                      | `subscriptions.created_at`                            | Includes failed initial collections, clearly labelled.                        |
| New active subscriptions | First activation/success in window where evidenced                                                          | Successful initial `subscription_renewals` in window  | Creation alone is insufficient.                                               |
| Cancelled subscriptions  | Cancellation effective time in window                                                                       | `subscriptions.cancelled_at`                          | Cancel-at-period-end counts when effective, not when requested.               |
| Renewal success rate     | Succeeded renewal periods / terminal renewal periods                                                        | `subscription_renewals`; terminal succeeded or failed | Retries do not multiply billing periods; pending excluded.                    |
| Failed renewal rate      | Failed renewal periods / terminal renewal periods                                                           | Same                                                  | Current final renewal outcome only.                                           |

Logo churn is deferred because the current operational model does not preserve a rigorous historical active-at-period-start population for arbitrary windows.

## Invoices

| Name                          | Meaning and formula                                                       | Canonical source and states           | Treatment and edge cases                           |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| Invoice counts                | Counts draft, open, paid, void; overdue is open with due date before `to` | `invoices`                            | Status and derived overdue are shown separately.   |
| Outstanding invoice value     | Sum open invoice total                                                    | `invoices(status=open)`               | Draft, void, paid excluded; currency partitioned.  |
| Overdue invoice value         | Sum open invoice total where `due_at < to`                                | `invoices`                            | Reporting instant is explicit.                     |
| Invoice count collection rate | Paid issued invoices / (paid + open issued invoices) issued in window     | `invoices` with `issued_at` in window | Draft/void excluded; null denominator yields null. |
| Invoice value collection rate | Paid issued value / (paid + open issued value) issued in window           | Same                                  | Per currency; gross issued cohort, not cash aging. |

## Growth and volatility

| Name                     | Meaning and formula                                                           | Canonical source and states         | Treatment and edge cases                                                                                |
| ------------------------ | ----------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Period growth            | `(current − previous) / abs(previous)` for equal immediately preceding window | Underlying metric's canonical facts | Null with reason `not_comparable` when previous is zero. Currency-specific for money.                   |
| Net-collected volatility | Population standard deviation / mean of complete weekly net-collected values  | Weekly succeeded transaction series | Includes zero weeks; null when mean ≤0 or fewer than 8 complete weeks. Labelled volatility, never risk. |

## Shared attribution and response rules

- `from` is inclusive and `to` exclusive. Presets and custom ranges are resolved on the server.
- Location is the canonical Order or Invoice location. Financial facts without sound location attribution remain in an explicit unattributed bucket rather than being guessed.
- Channel is the persisted order source. Non-order invoices are excluded from commerce channel metrics.
- API ratios return numerator, denominator, and a decimal string or `null` plus a reason.
- Empty count metrics return zero, empty currency partitions return `{}`, and undefined ratios return `null`; missing data is never fabricated.
- Freshness is the query `asOf` time because Phase 8 queries committed canonical data live.
