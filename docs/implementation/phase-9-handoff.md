# Phase 9 Handoff: Capital Intelligence

## 1. What was implemented

Yinne now produces a transparent, reproducible Capital Profile from canonical merchant analytics. It includes an integer score, stability band, sufficiency status, dimension and signal evidence, strengths, watch areas, change reasons, and immutable history.

## 2. Capital architecture

The dependency direction is transactional truth → Analytics truth → Capital signals → versioned deterministic scoring → immutable Capital Profile. HTTP reads materialized profiles; expensive calculation stays off the request path.

## 3. Signal catalogue

Every implemented input is defined in `docs/capital/signal-catalogue.md` with source, formula, window, applicability, normalization, direction, contribution, and edge behavior. No scoring input exists only in code.

## 4. Dimension model

The initial model uses revenue consistency, growth, cash-flow stability, customer quality, refund risk, and operating history. Conceptually overlapping activity measures are grouped instead of receiving duplicate boosts.

## 5. Score formula

Applicable normalized dimension scores are multiplied by configured weights, divided by total applicable weight, and rounded half-up to an integer from 0 through 100. Missing optional dimensions are excluded, never converted to zero.

## 6. Weighting

`rules-1` weights are revenue consistency 25%, growth 20%, cash-flow stability 20%, customer quality 15%, refund risk 10%, and operating history 10%. The configured total is 100%.

## 7. Normalization

Piecewise-linear thresholds in the centralized model configuration transform canonical raw values into 0–100 scores. Thresholds, clamps, inversion for adverse rates, and rounding are documented and unit tested.

## 8. Score bands

Scores map to `limited` (0–39), `developing` (40–59), `stable` (60–79), or `highly_stable` (80–100). Labels describe observed business stability and never credit approval.

## 9. Data sufficiency

Sufficiency is independent from performance. The model requires at least 90 observable days, 30 paid orders, and 70% observable configured weight before emitting a scored profile; otherwise the profile records insufficient evidence without a poor-score fallback.

## 10. Missing-data/reweighting behavior

Applicable dimensions are proportionally reweighted over their observable weight. Non-applicable subscription, invoice, or customer behavior does not silently contribute zero, and required evidence gaps are returned explicitly.

## 11. Business-model neutrality

The score does not require subscriptions, invoices, multiple locations, or a particular geography. A healthy single-location, one-time-commerce merchant can reach the full scale from applicable operational evidence.

## 12. Model versioning

The immutable identifier is `rules-1`. Weights, thresholds, windows, sufficiency rules, and bands live together in versioned configuration; future changes require a new model identifier and cannot reinterpret old snapshots.

## 13. CapitalProfile model

`capital_profiles` stores organization, environment, currency, model version, score, band, sufficiency, calculation window, summary, dimensions, signals, explanations, prior delta, and timestamps using Yinne identifiers and conventions.

## 14. Snapshot/history architecture

Profiles are append-only materialized snapshots. A unique organization/environment/model/currency/lookback-end boundary makes same-period replay safe, while forced RLS and a no-update grant preserve historical meaning.

## 15. Explainability

Each applicable signal retains its aggregate raw value, normalized score, configured weight, effective contribution, state, and deterministic explanation. Contributions reconcile with the displayed score.

## 16. Strengths/watch areas

Configured thresholds deterministically select plain-language strengths and watch areas. There is no generative text and no unsupported causal or lending claim.

## 17. Score-change explanations

Each new snapshot compares with the prior compatible snapshot, stores its integer delta, and ranks material dimension changes. The dashboard displays the movement and its leading deterministic contributors.

## 18. Recalculation architecture

Authorized manual requests enqueue calculation asynchronously. The service also supports scheduled or backfill callers using an explicit organization, environment, currency, as-of date, and model version.

## 19. Worker behavior

Graphile Worker registers `capital_recalculate`. The task validates its payload, opens the tenant-safe calculation path, persists through the replay boundary, emits evidence, supports normal retry semantics, and shuts down gracefully.

## 20. Analytics integration

`CapitalSignalProvider` is implemented in Analytics and retrieves one coherent feature set from canonical domain truth. Scoring itself is pure and never performs scattered transactional queries.

## 21. Currency behavior

V1 profiles are currency scoped. Monetary activity from different currencies is never summed without an FX policy; the requested currency is stored on every snapshot and enforced throughout lookup and replay identity.

## 22. Financing-band decision

Financing estimates are deferred. Available internal activity data cannot defensibly represent an offer, approval, eligibility, or regulated underwriting outcome, so the product ships the explainable profile without pseudo-lending output.

## 23. API operations

The compact surface is `GET /v1/capital/profile`, `GET /v1/capital/profile/history`, `GET /v1/capital/signals`, and `POST /v1/capital/recalculate`. Reads return materialized aggregates; recalculation returns an asynchronous job reference.

## 24. SDK changes

`@yinne/sdk` exposes typed `capital.profile()`, `capital.history()`, `capital.signals()`, and `capital.recalculate()` methods aligned with runtime contracts and Yinne error/request conventions.

## 25. OpenAPI changes

The OpenAPI document defines Capital Profile, dimensions, signals, history, sufficiency, model version, and recalculation using Capital terminology. Validation passes with 94 total operations.

## 26. RBAC

Permissions are `capital:read` and `capital:recalculate`. Owners and administrators inherit both; finance receives both; analysts receive read; location-only managers cannot access organization-wide Capital data.

## 27. Events/webhooks

Meaningful events are `capital.profile_calculated`, `capital.profile_changed`, and `capital.recalculation_requested`. Existing outbox/webhook infrastructure carries profile-level evidence without broadcasting every intermediate signal or private transaction.

## 28. Audit behavior

Human recalculation requests create audited, tenant-bound evidence. Automated calculations are represented by job and domain-event records rather than being misrepresented as human actions.

## 29. Dashboard

The Intelligence navigation contains Analytics and Capital. `/capital` shows score, band, sufficiency, last update, movement, strengths, watch areas, applicable dimensions, signal drilldown, history, and the non-credit-decision disclaimer.

## 30. Seed/known-answer fixtures

Acme Coffee receives deterministic historical orders, payments, attempts, transactions, refunds, and two profile snapshots. The current fixture scores 72 (`stable`) after a prior score of 71, while synthetic unit fixtures cover insufficient, volatile, and applicability-neutral behavior.

## 31. Unit tests

The 80-test suite covers normalization, thresholds, weighting, missing-dimension reweighting, rounding, bands, sufficiency, exact known answers, contracts, RBAC, and worker registration.

## 32. Integration tests

Fifteen PostgreSQL integration tests across six files pass. Capital coverage includes persistence, history, immutable snapshots, replay identity, RLS, tenant/environment boundaries, and canonical Analytics feature behavior.

## 33. E2E tests

All 22 browser tests pass. Five Capital scenarios cover the seeded profile, deterministic history/change, aggregate-only signal exposure, denial for a location-only manager, and explicit insufficient-data behavior.

## 34. Capital-correctness findings

The review confirmed documented inputs, a 100% configured weight total, no activity double boost, deterministic reproduction, matching explanations, preserved model versions, and immutable history. Findings were closed before handoff.

## 35. Financial-correctness findings

Collected volume is sourced from successful monetary truth, refunds reduce the correct aggregate, failed/pending attempts do not inflate it, recurring and invoice signals do not duplicate general volume, and currency partitions are never silently combined.

## 36. Bias/fairness findings

No protected personal traits, inferred traits, social data, or geography-as-risk proxy are used. Sufficiency is distinct from performance, and applicability-aware weights prevent subscription, invoice, multi-location, and new-business feature bias.

## 37. Security findings

Forced RLS, service authorization, organization-scoped permissions, immutable persistence, payload validation, safe enqueueing, environment boundaries, aggregate signal responses, and replay constraints were tested. No unresolved cross-tenant, injection, tampering, or PII finding remains.

## 38. Performance findings

The worker obtains a coherent Analytics feature set once per profile and serves materialized reads afterward. Indexed snapshot lookup and bounded standard windows avoid dashboard-time historical scans and duplicated component queries.

## 39. UX/accessibility findings

The surface uses non-alarmist bands, explicit sufficiency and disclaimers, semantic headings, keyboard-operable disclosure, readable breakdowns, responsive layout, and text explanations that do not depend on chart color alone.

## 40. Known limitations

`rules-1` is an internal heuristic based only on Yinne-observed activity, uses no external bank or bureau data, performs no FX conversion, and is not validated for lending decisions. Sparse merchants correctly receive limited evidence rather than an inferred outcome.

## 41. Deferred capabilities

Financing ranges, lending, underwriting, offers, bureau/open-banking inputs, KYC/KYB, AML, machine learning, external alternative data, and personal credit scoring remain out of scope. Model backtesting must precede any materially different use.

## 42. ADRs

Existing architecture and planning ADRs remain authoritative. Phase 9 adds no contradictory architecture: Analytics owns canonical features, Capital owns versioned scoring and snapshots, and Graphile Worker owns materialized recalculation.

## 43. Exact run commands

```bash
pnpm install
docker compose up -d
pnpm worker:migrate
pnpm db:seed
pnpm db:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm openapi:validate
pnpm verify:clean-db
pnpm build
pnpm db:seed
pnpm test:e2e -- --workers=1
pnpm --filter @yinne/worker start
```

## 44. Git/remote state

Phase 9 is delivered as exactly 30 additive commits after Phase 8 baseline `0f1c58b00b4ad0c97e53399424e7ee66477b4c3e`. History was not rewritten or force-pushed; the final commit is pushed to `origin/main` at `https://github.com/OutstandingVick/yinne`.

## 45. Recommended next phase

Proceed to Marketplace only after defining its participant, listing, discovery, trust, settlement-boundary, dispute, and Capital-data-consent contracts. Capital outputs should remain merchant-controlled explainable evidence, never an automatic underwriting decision.

PHASE 9 COMPLETE — READY FOR MARKETPLACE
