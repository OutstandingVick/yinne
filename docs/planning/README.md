# Yinne planning index

Status: implementation-gating blueprint. No production application code belongs here.

Yinne is provider-neutral, self-hostable infrastructure for merchant commerce and financial operations. These documents are normative for V1; where they conflict, the decision log and V1 scope win.

## Documents

| #     | Document                                           | Purpose                                                                               |
| ----- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 00    | [Vision](./00-vision.md)                           | Positioning, users, principles, boundaries                                            |
| 01    | [Master PRD](./01-master-prd.md)                   | Outcomes, journeys, requirements, risks                                               |
| 02    | [V1 scope](./02-v1-scope.md)                       | Reality labels and release boundary                                                   |
| 03    | [System architecture](./03-system-architecture.md) | Runtime, deployment, packages, ADRs                                                   |
| 04    | [Domain model](./04-domain-model.md)               | Entities, ownership, relationships, states                                            |
| 05    | [Database design](./05-database-design.md)         | ERD, table specifications, isolation                                                  |
| 06    | [API specification](./06-api-specification.md)     | REST contract and examples                                                            |
| 07–11 | Infrastructure                                     | Providers, events, webhooks, RBAC, security                                           |
| 12–19 | Product specs                                      | Storefront, checkout, links, Sales OS, subscriptions, locations, marketplace, capital |
| 20    | [Analytics](./20-analytics-spec.md)                | Canonical metric definitions                                                          |
| 21–24 | Platform/project                                   | DX, design, demo, open source                                                         |
| 25–26 | Delivery                                           | Roadmap and definition of done                                                        |

Root verdict: [YINNE_BUILD_READINESS.md](../../YINNE_BUILD_READINESS.md).

## Normative conventions

- Every tenant row carries `organization_id`; authorization always derives it from credentials, never request input alone.
- Money persists as signed `bigint` minor units plus ISO-4217 currency. APIs use `{amount: "integer-string", currency}`.
- IDs are UUIDv7; API IDs may have resource prefixes.
- Times are UTC RFC 3339 externally and `timestamptz` internally.
- Financial writes require `Idempotency-Key`.
- State changes use commands and legal transitions, never generic status updates.
- Provider payloads stay in restricted envelopes, not canonical fields.
- Public API and webhook schemas version independently.

## Reality labels

- **REAL IN V1:** intended production behavior, though real movement requires a future provider adapter.
- **SIMULATED IN V1:** deterministic mock behavior, always visibly test-only.
- **PLANNED:** architecture-reserved and not exposed as working.
- **OUT OF SCOPE:** deliberately outside Yinne's boundary.
