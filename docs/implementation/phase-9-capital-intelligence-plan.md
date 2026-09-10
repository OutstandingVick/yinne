# Phase 9 Capital Intelligence implementation plan

Status: approved implementation contract. Production code must conform to this document and the canonical planning specifications.

## Product boundary

Capital Intelligence is explainable merchant analytics. It describes business activity observed by Yinne; it is not lending, underwriting, eligibility, a credit bureau result, or a regulated credit decision. Loan products, external data, protected characteristics, opaque models, and financing estimates are excluded. The V1 financing-band decision is **deferred** because Yinne has neither partner-owned underwriting policy nor validated calibration.

## Capital Profile model

Each calculation creates an immutable `CapitalProfile` snapshot owned by organization and environment. It records model version, primary currency, status, integer score or null, descriptive band or null, data sufficiency, calculation/window timestamps, dimension and signal evidence, strengths, watch areas, change explanation, limitations, and creation time. The latest profile is selected from immutable history; no mutable score row exists.

## Input-signal catalogue and Analytics dependency

The scoring engine accepts one coherent `CapitalSignalSet` from a dedicated `CapitalSignalProvider`. The production provider composes canonical Analytics services and may add missing reusable Analytics features inside the Analytics module. Capital code must not scatter transactional queries. V1 uses six non-overlapping components from the approved capital specification: revenue consistency, positive growth, cash-flow stability, customer quality, refund risk, and operating history.

## Windows and currency

The model uses 180 complete local days ending at a supplied calculation instant. Weekly series use complete seven-day buckets. Money remains integer minor units and the profile is calculated for exactly one currency, defaulting to the organization's primary currency. No FX conversion or mixed-currency aggregation is permitted.

## Data sufficiency

A scored profile requires at least 90 observed days, 30 paid orders, and 70 points of observable base weight. Otherwise status is `insufficient_data`, score and band are null, and missing requirements are explicit. Sufficiency levels are `insufficient`, `limited`, `sufficient`, and `strong`, derived from observed days, order count, and identity coverage. Missing optional customer identity makes customer quality not applicable; its weight is removed and remaining applicable dimensions are proportionally reweighted. Missing data is never scored as zero or treated as good.

## Score architecture and weights

Model `rules-1` uses a 0–100 integer score with half-up rounding after weighted normalization:

| Dimension           | Base weight |
| ------------------- | ----------: |
| Revenue consistency |          25 |
| Positive growth     |          20 |
| Cash-flow stability |          20 |
| Customer quality    |          15 |
| Refund risk         |          10 |
| Operating history   |          10 |

Weights total 100. Each applicable signal produces a 0–100 normalized score. Final score is `round_half_up(sum(score × base_weight) / sum(applicable_base_weight))`. This prevents double counting GMV, net collected, order count, and transaction count as separate boosts.

## Normalization

Thresholds are centralized in immutable versioned configuration, documented in `docs/capital/models/v1.md`, and covered at every boundary. Revenue consistency maps weekly coefficient of variation downward; growth maps equal-period net-collected change with caps; cash-flow stability combines active-week share and maximum drawdown; customer quality maps repeat-customer revenue share only when identity coverage is sufficient; refund risk maps refund volume rate downward; operating history maps active months up to a 24-month cap. All thresholds are transparent heuristics, not statistically calibrated risk estimates.

## Bands and wording

Scores map to `limited` (0–39), `developing` (40–59), `stable` (60–79), and `highly_stable` (80–100). UI wording is descriptive and never uses “creditworthy,” “approved,” “safe borrower,” or similar underwriting claims.

## Explainability

Every signal snapshot contains key, dimension, raw aggregate evidence, normalized score, base/effective weight, contribution, applicability/status, threshold reason, and deterministic explanation. Strengths and watch areas are selected from deterministic signal rules. A new snapshot compares with the previous snapshot of the same model/currency and stores score delta plus the largest changed signal contributions.

## Recalculation, replay, and history

Graphile Worker performs calculations. Nightly scheduling is supported by a dispatcher job; authorized manual requests enqueue a calculation and return `202`. A uniqueness key on organization, environment, model version, currency, and lookback end makes replay converge on one immutable snapshot. Backfill supplies explicit calculation dates. Failures retry under Graphile Worker and cannot publish partial profiles.

## API and SDK

The compact API is `GET /v1/capital/profile`, `GET /v1/capital/profile/history`, `GET /v1/capital/signals`, and `POST /v1/capital/recalculate`. The SDK mirrors these as `capital.profile()`, `capital.history()`, `capital.signals()`, and `capital.recalculate()`. Responses expose aggregate evidence only.

## RBAC, security, audit, and events

Add `capital:read` and `capital:recalculate`. Owner, Admin, Finance, and Analyst may read organization-wide profiles; only Owner, Admin, and Finance may request recalculation. Any location-scoped assignment is rejected for Capital, even if it otherwise grants an analytics permission. Forced RLS, tenant/environment predicates, immutable-history triggers, bounded pagination, validation, rate limiting, and no mass-assigned scores are mandatory. Manual requests create `capital.recalculation_requested` audit evidence. Completed calculations emit `capital.profile_calculated`; meaningful score or band changes also emit `capital.profile_changed`. Public payloads contain summary metadata, not signal internals or PII.

## Dashboard

Navigation groups Analytics and Capital under Intelligence. Capital overview shows score, descriptive band, data sufficiency, update time, score change, strengths, watch areas, applicable dimensions, deterministic signal drilldown, history, limitations, and an explicit “not a credit decision” notice. Insufficient profiles emphasize missing requirements rather than showing a poor score.

## Model governance and fairness

Model configuration is code-reviewed and versioned; historical rows retain their original evidence and meaning. Changes require a new version, known-answer fixtures, backtesting, financial/security/fairness review, and migration guidance. V1 excludes personal/protected characteristics and geographic risk. Subscription use, invoice use, and multi-location operation are not scored, preserving business-model neutrality.

## Testing and correctness

Unit tests cover normalization, thresholds, weighting, missing-data reweighting, rounding, bands, sufficiency, and change explanations. Known-answer fixtures cover stable, insufficient, volatile, past-due-heavy context, subscription-led, and one-time commerce businesses without introducing inapplicable penalties. PostgreSQL tests cover immutable snapshots, uniqueness, RLS, tenant/environment isolation, and version retention. API, worker, SDK, OpenAPI, dashboard E2E, full regression, clean migrations/seed, and production builds are release gates.

## Acceptance criteria

Phase 9 is accepted only when the score is reproducible from versioned aggregate evidence; each contribution is explainable; insufficient data remains distinct from bad performance; optional business models are neutral; history is immutable; recalculation is worker-backed and replay-safe; tenant, environment, and organization-wide authorization hold; no PII/protected/geographic proxy enters the model; financing estimates remain absent; and all repository verification gates pass.

## Explicit exclusions

No origination, disbursement, servicing, bureau/open-banking ingestion, KYC/KYB, AML, hard checks, collections, rates, pricing, offers, approval, underwriting decisions, machine learning, external scraping, social data, personal scoring, FX conversion, or financing range is implemented.
