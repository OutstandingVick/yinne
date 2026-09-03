# Analytics Architecture

Yinne Analytics is a read-only business-intelligence layer over canonical operational facts. `@yinne/analytics` owns formulas and queries; HTTP, SDK, Worker, and dashboard surfaces delegate to it.

## Data flow

Committed Orders, OrderItems, Payments, PaymentAttempts, Transactions, Refunds, Customers, Subscriptions, Renewals, Invoices, Locations, and Inventory Levels are queried inside tenant transactions. Reports apply organization, environment, authorized-location, currency, and `[from,to)` filters before aggregation. Results include `analytics.v1` formula version and a live `as_of` watermark.

No analytics table is a source of truth. Phase 8 uses bounded live SQL because it is correct, replay-safe, automatically incorporates late facts, and is sufficient for current scale. `analytics_refresh` query-warms/validates the same reports and is the future materialization seam.

Money remains integer minor units. Currency partitions are never merged. Merchant calendar grouping uses an explicit IANA timezone; timestamps remain UTC at rest.
