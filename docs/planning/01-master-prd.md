# Master product requirements

## Problem and hypothesis

Merchant-product teams repeatedly rebuild catalogue, checkout, reconciliation, provider webhooks, permissions, and developer tooling. Provider APIs offer execution rails but not a coherent merchant operating model. Yinne hypothesizes that a provider-neutral canonical core plus reference applications materially reduces time-to-market without hiding financial state.

## Personas

| Persona            | Job                                  | Surface                 |
| ------------------ | ------------------------------------ | ----------------------- |
| Platform developer | Embed and automate merchant flows    | REST, SDK, docs         |
| Owner/admin        | Configure and supervise the business | Dashboard               |
| Finance operator   | Reconcile payments/refunds           | Dashboard/API           |
| Manager/staff      | Fulfil orders and manage local stock | Dashboard               |
| Buyer              | Select items and pay safely          | Storefront/checkout     |
| Adapter maintainer | Add rails without core coupling      | Provider contract/tests |
| Self-host operator | Deploy, secure, observe, upgrade     | Docker/runbooks         |

## Golden journey

1. Create organization, merchant brand, default location, users, API key, and mock provider account.
2. Create product/variant and stock; publish storefront and reusable link.
3. Buyer creates checkout; quoted line items freeze price/currency; confirmation creates an order.
4. Mock provider simulates an attempt. Success atomically updates payment/order, writes transaction and stock movement, and appends outbox events.
5. Developer receives a signed, retryable webhook and can inspect/replay delivery.

## Functional requirements

- Organization may operate many merchant brands; merchant owns trading presentation, while organization owns security/provider configuration.
- Products/customers are canonical organization resources; associations control brand/channel presentation.
- Every financial operation records actor, environment, provider account, idempotency result, and immutable evidence.
- Reference apps contain no private domain powers.
- Modules can be disabled with explicit dependencies: checkout requires commerce/payments; storefront requires catalogue/checkout.
- Lists are tenant-scoped, cursor-paginated, deterministic, filterable, and bounded.

## Quality requirements

- Correctness over availability for financial writes. Database transaction plus outbox is the atomic boundary.
- Reference target: P95 reads <300 ms and writes <700 ms excluding provider latency.
- WCAG 2.2 AA target and responsive, keyboard-operable flows.
- PostgreSQL is source of truth. Restore, migration, structured logging, tracing, metrics, and health procedures are release gates.
- No mandatory Yinne cloud dependency.

## Acceptance outcomes

- Replayed client request returns original response without repeated side effects.
- Duplicate/out-of-order provider notifications converge to one legal state.
- Disabling a module hides navigation and rejects commands without deleting data.
- Location-scoped users cannot infer other locations or tenants via IDs, counts, exports, logs, events, or errors.
- Failed webhooks show attempt history and support replay without mutating the source event.

Every command must validate identity, tenant and permission; perform legal state changes transactionally; persist audit/outbox evidence; return a request ID; and remain retry-safe.
