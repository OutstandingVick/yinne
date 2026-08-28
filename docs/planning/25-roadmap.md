# Roadmap, risks, and recommended answers

## Implementation sequence

0. **Planning gate:** approve names/boundaries, threat model, OpenAPI/event version policy, money/currency rules, and design spikes.
1. **Repository/platform skeleton:** workspace boundaries, config, PostgreSQL migrations/RLS, request/tenant context, auth/session, observability, test harness.
2. **Organization/security:** merchant/default location, memberships/RBAC/API keys, environment separation, audit/idempotency.
3. **Commerce core:** customer, product/variant, publish association, inventory movement, order snapshots/states.
4. **Payments foundation:** provider contract/conformance, mock, payment/attempt/transaction/refund states, routing/reconciliation.
5. **Checkout/links:** server quote, order creation, hosted flow, expiry, deterministic scenarios.
6. **Events/webhooks:** outbox consumers, public projections, delivery/replay/rotation, event explorer.
7. **Reference apps/DX:** dashboard, storefront, checkout, OpenAPI/SDK/docs, Acme seed.
8. **Analytics/hardening:** defined metrics, load/failure/security/accessibility, backup/upgrade, release candidate.

## Releases

- **V1:** golden path and core scope in 02.
- **V1.1:** first real provider adapter after audit; invoices; provider-reported payouts; full location/staff operations. Treat real adapter as beta until reconciliation evidence.
- **V1.2:** subscriptions monthly/annual; advanced inventory; multi-location comparisons.
- **V1.3:** opt-in marketplace MVP; capital financial-health pilot only after validation.
- Later: embedded checkout protocol, custom domains, additional providers, terminals, advanced taxes/shipping, optional broker/warehouse if measured.

## Risks and mitigations

| Risk                                         | Severity | Response                                                                       |
| -------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| Cross-tenant leak                            | Critical | direct org keys, composite FKs, policies + RLS, adversarial tests              |
| Duplicate/unknown payment                    | Critical | idempotency, single active attempt, outbox, reconciliation, no unsafe failover |
| Money/rounding error                         | Critical | bigint, currency metadata, allocation rules, property tests                    |
| Provider abstraction lies                    | High     | capability ports, explicit unsupported, metadata isolation, conformance        |
| Webhook forgery/replay/SSRF                  | High     | raw-body signature, time/dedupe, encrypted evidence, egress policy             |
| “Transaction” mistaken for ledger/settlement | High     | operational terminology/disclaimer/provider evidence                           |
| Scope creep                                  | High     | golden-path gate and module reality labels                                     |
| Open-source maintenance burden               | High     | narrow V1, contribution standards, experimental labels, ownership              |
| Capital score regulatory/misleading          | High     | defer, health wording, no band, explanations/legal review                      |
| Analytics ambiguity/late data                | Medium   | formulas, currency/time/freshness/version/restatement                          |
| Shared-schema operational error              | High     | TenantContext, RLS, backup tests; dedicated tier only later                    |
| Irreversible public contract                 | High     | OpenAPI/event diff gates, conservative V1 fields, deprecation                  |

## Open questions with recommended decisions

| Question                        | Recommendation                                                                                                                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is Merchant separate?           | Yes: organization tenant, merchant brand/trading profile.                                                                                                                                                       |
| Custom roles V1?                | No; predefined roles, extensible schema.                                                                                                                                                                        |
| Location V1?                    | Minimal primitive and scope now; rich operations V1.1.                                                                                                                                                          |
| Inventory V1?                   | Minimal levels/movements because golden path requires decrement.                                                                                                                                                |
| Order creation timing?          | Create/freeze order on checkout confirmation, not session creation; manual API orders also allowed.                                                                                                             |
| Reserve stock?                  | No general reservation V1; atomically check/decrement at payment success, surface oversell risk. Add reservation in V1.2. For scarce goods deployments should enable backorder=false and short session windows. |
| Automatic provider fallback?    | No after submission; explicit new attempt only.                                                                                                                                                                 |
| PostgreSQL queue enough?        | Yes until measured lag/throughput/retention demands a broker.                                                                                                                                                   |
| Drizzle or Prisma?              | Drizzle for SQL/RLS/locking control.                                                                                                                                                                            |
| Financing estimate V1.3?        | No; financial-health score only until partner/legal/calibration exist.                                                                                                                                          |
| License?                        | Apache-2.0.                                                                                                                                                                                                     |
| Raw provider payload retention? | Encrypted, access-controlled, configurable short retention; preserve digest/normalized evidence longer.                                                                                                         |
| Tax/shipping V1?                | Explicit zero or external/manual breakdown, no engine claims.                                                                                                                                                   |
| Multi-currency analytics?       | Partition only; never aggregate without conversion source, which is later.                                                                                                                                      |

## Hard-to-reverse decisions

Tenant identity, money representation, environment isolation, payment/transaction distinction, event envelope/versioning, order price snapshots, and public ID semantics must be approved before migrations or SDK generation. The recommendations above resolve them; implementation should change them only through ADR.
