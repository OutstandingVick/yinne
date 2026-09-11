# Phase 9 implementation log

1. Recorded the product boundary, `rules-1` contract, signal catalogue, and financing-range deferral before production code.
2. Added typed Capital contracts and an immutable, tenant/environment-scoped snapshot schema with replay uniqueness and forced RLS.
3. Centralized model weights, thresholds, windows, bands, and sufficiency rules.
4. Added one Analytics-owned Capital feature provider and pure signal/scoring/profile functions.
5. Added deterministic explanations, applicability-aware reweighting, sufficiency, score deltas, and immutable persistence.
6. Added domain events, audited/rate-limited job requests, secure Graphile Worker enqueueing, and replay-safe calculation execution.
7. Added four compact APIs, typed SDK methods, OpenAPI schemas, Intelligence navigation, and the Capital dashboard.
8. Expanded the Acme seed with sufficient historical activity and two known-answer profile snapshots.
9. Added unit, known-answer, PostgreSQL integration, worker, RBAC, API, and browser coverage.
10. Completed merchant, developer, governance, correctness, financial, fairness, security, performance, and accessibility documentation.

No lending, underwriting, offer, external-data, protected-attribute, geography-risk, machine-learning, FX, or financing-band behavior was added.
