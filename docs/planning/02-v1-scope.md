# V1 scope and reality contract

## Objective

V1 proves the full local merchant-commerce loop, not breadth. It is complete only when the golden path works through UI and public API with deterministic replay and tenant-isolation tests.

## Included

| Area           | Deliverable                                                                                                     | Reality         |
| -------------- | --------------------------------------------------------------------------------------------------------------- | --------------- |
| Platform       | Organizations, merchant brand, memberships, predefined RBAC, scoped roles, API keys, audit, test/live partition | REAL IN V1      |
| Commerce       | Customers, products/variants, minimal inventory ledger, orders/items                                            | REAL IN V1      |
| Payments       | Checkout sessions, attempts, payments, operational transactions, links, mock refunds                            | REAL IN V1      |
| Provider       | Mock adapter and conformance kit                                                                                | SIMULATED IN V1 |
| Infrastructure | Outbox, event store, provider events, public webhooks, idempotency                                              | REAL IN V1      |
| Interfaces     | Dashboard, storefront, hosted checkout                                                                          | REAL IN V1      |
| Developer      | REST /v1, OpenAPI 3.1, TypeScript SDK, docs, Docker seed                                                        | REAL IN V1      |
| Analytics      | GMV, successful-payment count, AOV, refund rate, freshness                                                      | REAL IN V1      |

One currency per checkout/order/payment; no cross-currency total. Multi-brand is preserved in authorization/schema though Acme demonstrates one brand.

## Deferred/excluded

| Capability                                  | Status                     | Reason                                    |
| ------------------------------------------- | -------------------------- | ----------------------------------------- |
| Real provider adapters                      | PLANNED V1.1               | After conformance/security review         |
| Invoices and payouts                        | PLANNED V1.1               | Not golden-path dependencies              |
| Full location/employee/terminal UI          | PLANNED V1.1               | Minimal location scope exists             |
| Subscriptions                               | PLANNED V1.2               | Depends on invoice, retry, mandate design |
| Advanced inventory/reservations/transfers   | PLANNED V1.2               | V1 uses stock-on-hand + movements         |
| Marketplace                                 | PLANNED V1.3               | Moderation/fees; listing seam reserved    |
| Capital intelligence                        | PLANNED V1.3 pilot         | Needs regulatory/product validation       |
| Payout/VA/renewal mock scenarios            | SIMULATED conformance-only | Not user-facing claims                    |
| Custody, lending, card handling, tax filing | OUT OF SCOPE               | Regulated/specialist responsibilities     |

Locations, minimal inventory, refunds, and core analytics move earlier than proposed because they are explicit golden-path outputs.

## Constraints

- Predefined roles only; custom-role schema is architecture-ready but API-disabled.
- One explicit default route per currency/environment; no automatic provider failover.
- Hosted checkout redirects to provider/tokenized surfaces and accepts no raw card fields.
- Storefront: list/detail/cart/checkout, theme tokens, slug host. Custom domains later.
- Links: product/cart fixed amount and flexible collection. Invoice/subscription kinds are rejected in V1.

## Exit

All gates in Definition of Done pass; no unresolved critical/high threat findings; clean-machine demo succeeds; restore/replay tests pass; OpenAPI and SDK examples pass; no planned capability is described as supported.
