# Vision

## Definition and audience

Yinne is open-source infrastructure for merchant commerce and financial operations. It supplies reusable commerce objects, payment orchestration, operational workflows, public APIs, events, and reference applications around external financial providers.

It serves banks and PSPs building merchant suites; fintech and SaaS teams embedding commerce; enterprises operating multiple brands or locations; and developers who need a safe local-to-production foundation. It removes repeated work around catalogues, checkout, order/payment reconciliation, provider webhooks, permissions, and auditability.

## Product promise

A developer can clone Yinne, run it without credentials, complete the Acme Coffee golden path through a mock provider, then add a real provider via an explicit adapter without changing commerce logic.

## Principles as decision tests

1. **Provider neutral:** core behavior uses capability contracts. Provider-specific inputs live in adapter extensions.
2. **API first:** reference apps use the same application services and authorization rules as integrators.
3. **Modular:** modules own behavior and tables, composing through stable commands/events.
4. **Self-hostable:** PostgreSQL plus one application/worker codebase is sufficient for V1.
5. **Financially safe:** integer money, legal transitions, idempotency, verified webhooks, audit trails, atomic outbox.
6. **Composable:** canonical Product, Customer, Order, and Payment work across channels.
7. **Transparent:** metrics and future scores expose formula, window, exclusions, and limitations.
8. **Developer friendly:** OpenAPI is contractual; SDK, mock scenarios, fixtures, and errors follow it.

## Boundaries

Yinne is not a bank, processor, lender, core banking system, custodial wallet, card vault, compliance certification, or single-provider wrapper. It never stores PAN/CVV, holds funds, creates bank accounts itself, or asserts settlement beyond provider evidence. Provider-hosted or tokenized collection surfaces handle regulated credentials.

## Success measures

- Clean clone to successful mock checkout in under 15 minutes.
- Golden path creates exactly one payment, transaction, inventory effect, event chain, and public webhook despite retries.
- A new adapter requires no commerce-module edits.
- Every tenant command/query is organization-bounded below HTTP.
- OpenAPI/SDK examples and adapter conformance pass in CI.

## Capability truth

| Capability                                                        | Status          |
| ----------------------------------------------------------------- | --------------- |
| Organizations, auth, predefined RBAC, API keys                    | REAL IN V1      |
| Customers, products, variants, orders, minimal inventory/location | REAL IN V1      |
| Checkout, payment links, payments, transactions, mock refunds     | REAL IN V1      |
| Financial execution through mock                                  | SIMULATED IN V1 |
| Real PSP adapters, payouts, invoices, subscriptions               | PLANNED         |
| Marketplace and capital intelligence                              | PLANNED         |
| Custody, lending, raw card storage                                | OUT OF SCOPE    |

Minimal Location and inventory primitives enter V1 because the required golden path cannot honestly decrement stock or support later multi-location ownership without them.
