# Phase 8 handoff: Analytics and Business Intelligence

## 1. Implemented scope

Phase 8 adds canonical analytics contracts, report services, authenticated HTTP APIs, TypeScript SDK methods, dashboard views, deterministic seed evidence, worker refresh validation, and operator/developer documentation. Reports cover overview, sales, payments, customers, subscriptions, invoices, products, and locations.

## 2. Metric catalogue

The authoritative definitions, inclusions, exclusions, units, sources, and caveats are maintained in `docs/analytics/metric-catalogue.md`. Every shipped financial metric is formula-versioned as `analytics.v1`.

## 3. Source mapping

Reports read canonical PostgreSQL records: orders and order items for commerce, payments and refunds for collection performance, customers for acquisition, subscription and renewal records for recurring revenue, invoices for receivables, and inventory/location records for operational dimensions.

## 4. GMV

GMV is the sum of canonical commercial payment volume whose successful-payment timestamp is inside the half-open report window. Results are partitioned by currency and serialized as integer minor-unit strings.

## 5. Net collected

Net collected is successful collected volume less successful refunds in the same window. Refund values retain their original currency partition; currencies are never silently combined.

## 6. Order metrics

Sales reports expose order counts, paid order counts, and paid volume using canonical order/payment relationships. Location order counts use order creation time inside the selected window.

## 7. Payment metrics

Payment reports expose attempts, successes, failures, pending states, success rate, and collected volume. A zero denominator produces a non-comparable ratio instead of fabricated zero performance.

## 8. Refund metrics

Refund reporting uses successful canonical refunds and exposes counts and minor-unit totals by currency. Refund values feed net-collected calculations without mutating historical payment evidence.

## 9. Customer metrics

Customer reports expose customer counts and acquisition within the requested period, bounded to the tenant and permitted location scope where applicable.

## 10. Product metrics

Product ranking is based on units sold from paid orders, with paid-order count and paid-order volume. Ranking is deterministic and limited by the validated query limit.

## 11. Channel metrics

Channel attribution is derived only where a canonical source exists. No heuristic cross-channel identity stitching or unsupported attribution model was introduced.

## 12. Location metrics

Location reports include order count, paid order count, paid volume, and low-inventory warnings. Paid metrics require a qualifying payment in the selected window, and RBAC restricts visible locations.

## 13. Subscription metrics

Subscription analytics expose lifecycle counts, active recurring relationships, renewal outcomes, and recurring value from canonical subscription and recurring-price snapshots.

## 14. MRR and ARR

MRR normalizes eligible active recurring prices to a monthly value using documented interval rules; ARR is twelve times MRR. Values remain partitioned by currency and are not converted using unstated FX assumptions.

## 15. Invoice metrics

Invoice reports expose status counts, issued and paid activity, open receivables, and overdue amounts from canonical invoice state and immutable invoice snapshots.

## 16. Growth metrics

The contracts preserve query granularity and comparison metadata, but production growth/time-series computation is deferred until a canonical historical-series store is introduced. The API does not invent incomplete growth percentages.

## 17. Volatility metrics

Revenue volatility is not implemented in Phase 8. It requires a defined sampling cadence, minimum observation count, and missing-period policy before it can become a capital signal.

## 18. Timezone semantics

Every request validates an IANA timezone and reports it in metadata. Windows are half-open UTC instants (`from <= timestamp < to`); callers construct local business boundaries explicitly, avoiding server-local-time ambiguity.

## 19. Currency semantics

Money uses integer minor units end to end. Reports return maps keyed by ISO currency and never total unlike currencies or perform implicit conversion.

## 20. Aggregation strategy

Phase 8 performs bounded, tenant-scoped live aggregation over canonical tables. Query validation caps a reporting window at 366 days and applies deterministic limits to ranked results.

## 21. Materialization strategy

No analytics materialized table was added. Live reads keep the first analytics release consistent with source-of-truth records and avoid premature cache invalidation complexity.

## 22. Freshness model

Because reports query canonical records, freshness is transaction-level subject to database commit visibility. Response metadata identifies the formula version and reporting window.

## 23. Rebuild and backfill

There is no derived warehouse state to rebuild in Phase 8. The `analytics_refresh` worker validates report computation for a tenant/window and provides a seam for future materialization or scheduled snapshots.

## 24. API surface

Authenticated `GET /v1/analytics/{report}` supports `overview`, `sales`, `payments`, `customers`, `subscriptions`, `invoices`, `locations`, and `products`, with validated window, timezone, granularity, location, currency, and limit parameters.

## 25. SDK surface

The TypeScript SDK exposes typed methods for all eight report families and serializes analytics query parameters consistently with the HTTP contract.

## 26. OpenAPI

The OpenAPI 3.1 document includes the analytics route, parameters, report selector, authentication, success schemas, and standard errors. Repository validation passes with 90 total operations.

## 27. RBAC and location isolation

Analytics requires `analytics:read`. Application authorization resolves the principal's permitted location IDs, rejects an explicitly unauthorized location, and applies scope filters before aggregation; PostgreSQL forced RLS remains defense in depth.

## 28. Dashboard

The dashboard adds an analytics overview and report-specific pages for sales, payments, customers, subscriptions, invoices, products, and locations. Empty, unavailable, and non-comparable values render explicitly.

## 29. Seed and known answers

The Acme Coffee seed includes deterministic multi-domain and multi-currency analytics fixtures. `docs/analytics/acme-known-answer-dataset.md` records the expected August 2026 answers used by integration tests.

## 30. Tests

Verification passed: 68 unit tests in 22 files, 12 PostgreSQL integration tests in 5 files, and 17 browser journeys. Analytics tests cover formula math, query validation, known answers, API behavior, dashboard navigation, currency partitioning, and RBAC scope.

## 31. Security review

The security review found no unresolved Phase 8 blocker. Authentication, permission checks, tenant context, location restrictions, bounded inputs, parameterized queries, RLS, and non-public analytics routes are enforced.

## 32. Financial correctness review

The financial review confirms minor-unit arithmetic, explicit status inclusion, half-open timestamp windows, refund subtraction, immutable source usage, and strict currency separation. No floating-point money arithmetic is used.

## 33. Analytics correctness review

The analytics review confirms formula ownership, canonical source mapping, deterministic denominators, null comparison semantics, location/payment time boundaries, and known-answer coverage. Deferred metrics are labeled rather than approximated silently.

## 34. Performance review

The performance review accepts bounded live queries for the current dataset and records materialized rollups, index observation, and query telemetry as future scale work. The 366-day cap protects the initial surface.

## 35. UX and accessibility review

The analytics UI uses semantic headings, links, and tables; explicit labels replace color-only meaning; null and empty states are readable; and existing authenticated navigation patterns are preserved.

## 36. Capital Intelligence signals

Phase 8 supplies auditable inputs for future underwriting: collected volume, refund behavior, payment success, recurring revenue, receivables, customer activity, product concentration, and location performance. It does not calculate a credit score or financing recommendation.

## 37. Known limitations

Reports are live aggregates without historical snapshots, FX normalization, exported files, chart-series endpoints, cohort retention, anomaly detection, or configurable fiscal calendars. Timezone is validated metadata around caller-supplied UTC boundaries, not a server-side preset engine.

## 38. Deferred work

Deferred items include time-series persistence, period-over-period growth, volatility, cohorts, channel attribution enrichment, warehouse/materialized rollups, exports, scheduled delivery, advanced visualization, telemetry-driven indexing, and capital scoring.

## 39. ADRs

The architecture documentation records the operative decisions: canonical sources over event replay for v1, live bounded aggregation over premature materialization, half-open windows, formula versioning, null ratios for invalid denominators, and currency-partitioned minor units.

## 40. Verification commands

The release gates are `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm db:seed && pnpm test:e2e`, `pnpm openapi:validate`, `pnpm verify:clean-db`, and `pnpm build`. Worker verification covers direct `analytics_refresh` invocation and production startup/shutdown.

## 41. Git state

Phase 8 is delivered as exactly 20 commits after Phase 7 baseline `3807c833dfc3256a43adc5e93f88ac66a28f33f2`. The final commit contains this handoff; the working tree must be clean and local `main` must match `origin/main` before release.

## 42. Next phase

Phase 9 may build Capital Intelligence on these versioned, tenant-isolated signals. It should define eligibility policy, snapshot history, explainable scoring, adverse-action semantics, monitoring, and regulatory controls before exposing financing decisions.

PHASE 8 COMPLETE — READY FOR CAPITAL INTELLIGENCE
