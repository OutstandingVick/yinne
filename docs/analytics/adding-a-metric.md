# Adding an Analytics Metric

1. Add the full business definition to `metric-catalogue.md`: meaning, formula, numerator/denominator, source, included/excluded states, refund/currency/time/location/channel behavior, and edge cases.
2. Prove the canonical source is not already counted through another entity. A charge represented by Transaction, Payment, and Order is one fact, not three.
3. Implement integer-safe server-side math in `@yinne/analytics`; never define formulas in React.
4. Apply tenant, environment, authorized-location, currency, and bounded time filters before aggregation.
5. Return formula version, bounds, timezone, freshness, filters, explicit empty values, and ratio numerators/denominators.
6. Add a known-answer fixture plus unit, PostgreSQL, multi-currency, timezone, zero-denominator, API, SDK/OpenAPI, and E2E coverage proportional to the metric.
7. Update correctness, financial, security, performance, and UX reviews. If semantics are not rigorous, defer the metric and explain why.
