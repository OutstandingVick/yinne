# Phase 8 Analytics and Business Intelligence Plan

## Architecture decision

Phase 8 will expose bounded, tenant-scoped PostgreSQL analytics queries over canonical operational facts. No warehouse or persisted daily aggregate is justified at current scale. Every response carries formula version, reporting timezone, exclusive UTC bounds, currency partitions, freshness, and applied filters. The browser only renders API results.

## Metric catalogue and sources

- GMV and collected volume: succeeded `charge` transactions, grouped by currency and provider `occurred_at`.
- Net collected: succeeded charges minus succeeded refund transactions; refunds are recognized when they occur.
- Paid order metrics and AOV: canonical paid commerce orders and immutable order totals; non-order invoices are excluded.
- Payment outcome metrics: Payment state for payment-level rates and PaymentAttempt state for attempt diagnostics; pending is separate.
- Customers: canonical customer records, with buyers/new/repeat derived from distinct paid commerce orders.
- Products: immutable OrderItem descriptions, quantities, and amounts; never current catalogue prices.
- Channel/location: immutable Order channel and location identifiers, filtered by authorized location scope before aggregation.
- Subscriptions: canonical subscription and renewal states; MRR uses snapshotted price terms and integer-safe normalization.
- Invoices: canonical invoice state and due date; overdue is open with `due_at` before the reporting instant.

The detailed formula contract lives in `docs/analytics/metric-catalogue.md` and is authoritative over UI wording.

## Consistency and freshness

Reports are transactionally consistent within each query and near-real-time relative to committed operational facts. `freshness.asOf` is the server query time. Cross-report calls may observe later commits. There is no falsely claimed global snapshot.

## Time semantics

Intervals are half-open `[from,to)`. Inputs are ISO instants or supported presets resolved server-side. Calendar boundaries use the organization's IANA timezone, falling back to `Africa/Lagos` until a configurable reporting timezone exists. Custom windows are bounded to 366 days. Grouped dates are merchant-local calendar dates.

## Currency and money semantics

Money remains BigInt minor units serialized as decimal strings. Every monetary result is partitioned by ISO currency. No FX conversion or mixed-currency total is permitted. Ratios use integer numerator/denominator inputs and explicit decimal rounding; money never passes through binary floating-point arithmetic.

## Refund, customer, and attribution semantics

Refunds affect net collected in the window in which the successful refund transaction occurred. Gross metrics remain gross. New buyers are customers whose first paid order occurs in-window; repeat buyers have at least two lifetime paid orders as of `to`. Anonymous orders are excluded from customer ratios and disclosed as identity coverage. Product attribution uses item snapshots. Location and channel come from the order, never URL inference.

## Subscription and invoice semantics

Active and trialing are reported separately; MRR/ARR include only active subscriptions. Monthly MRR is `amount / intervalCount`; yearly MRR is `amount / (12 × intervalCount)`, rounded half-up in minor units per subscription. ARR is MRR × 12. Churn is deferred because historical active-at-period-start state is not persisted rigorously. Renewal rates use one subscription billing-period renewal, not attempts. Invoice collection is reported as explicit count- and value-based ratios for issued invoices in the window.

## Query and performance strategy

Create a focused `@yinne/analytics` module with report services rather than a god query. Each query requires organization/environment and bounded time. Location filters are intersected with authorized scope. Existing indexes are reused; targeted indexes may be added after `EXPLAIN` review. Queries aggregate in PostgreSQL and return bounded time series and ranked lists. Default ranking limit is 10, maximum 100.

## Materialization, refresh, and rebuild

No materialized table ships in Phase 8. Consequently replay cannot double-count, late events appear automatically, and rebuilding means rerunning canonical queries. A bounded Graphile Worker `analytics_refresh` task validates/query-warms a tenant interval and provides the extension seam for future materialization without changing metric contracts.

## API and SDK

Add grouped GET reports under `/v1/analytics/{overview,sales,payments,customers,subscriptions,invoices,locations,products}`. Shared parameters are `from`, `to`, `timezone`, `currency`, `locationId`, `granularity`, and bounded `limit` where applicable. Contracts use stable JSON schemas and canonical API errors. The SDK mirrors every runtime operation.

## Dashboard

Add Analytics navigation and Overview, Sales, Payments, Customers, Subscriptions, Invoices, Locations, and Products views. Server components call the same analytics service/API definitions. Controls and empty states preserve timezone, currency, freshness, formulas, and scope. Charts use accessible tables/text fallbacks and do not invent calculations.

## RBAC and privacy

Add `analytics:read`. Owner/admin/analyst receive organization analytics; location-scoped employees can only query authorized locations. RLS remains defense in depth. Customer reports expose counts and aggregates, never unnecessary PII or provider messages.

## Tests and reviews

Add unit formula/window tests, known-answer PostgreSQL integration tests, multi-currency, timezone/DST, zero-denominator, partial-refund, anonymous-customer, location-scope, API, worker replay, E2E, and full regression coverage. Produce analytics, financial, security, performance, and UX/accessibility reviews plus verification and handoff documents.

## Capital Intelligence feature interface

Expose explainable, versioned signals only: net-collected growth, volume volatility when at least eight complete weekly observations exist, payment failure rate, refund volume rate, repeat purchase rate, invoice overdue value, active subscriptions, MRR, and renewal success. Phase 8 does not score, recommend, forecast, or label risk.

## Acceptance criteria

- Every shipped metric has one documented formula and canonical source.
- Money cannot be double-counted or summed across currencies.
- Timezone boundaries, refunds, pending states, retries, and zero denominators are explicit.
- Tenant, environment, RBAC, and location scope are enforced before aggregation.
- Runtime, SDK, OpenAPI, dashboard, fixtures, and documentation agree.
- All repository verification and production startup checks pass.

## Explicit exclusions

Capital scoring/UI, ML, forecasting, recommendations, fraud, accounting/revenue recognition, tax, external warehouses, streaming infrastructure, attribution modeling, segmentation, predictive LTV, FX conversion, and persisted analytics aggregates are excluded.
