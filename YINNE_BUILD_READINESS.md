# Yinne build readiness

## 1. What exactly is Yinne?

Yinne is provider-neutral, open-source, self-hostable infrastructure for merchant commerce and financial operations. It provides canonical commerce/payment objects, orchestration, APIs, events, permissions, and reference applications around external regulated providers.

## 2. Who is it for?

Banks, payment companies, fintech/SaaS teams, enterprises, startups, self-hosters, and developers building merchant-facing products without rebuilding catalogue, checkout, reconciliation, webhooks, RBAC, and developer tooling.

## 3. What problem does it solve?

It separates reusable merchant software from provider execution while preserving financial state, retry safety, auditability, tenant isolation, and portability.

## 4. What does V1 contain?

Organizations, merchant brands, memberships, predefined scoped RBAC, API keys, test/live separation, customers, products/variants, default/minimal locations, inventory levels/movements, orders, checkout sessions, payments/attempts/operational transactions, mock refunds, payment links, deterministic mock provider, outbox/events, inbound/outbound webhooks, audit/idempotency, core analytics, dashboard, storefront, hosted checkout, REST/OpenAPI, TypeScript SDK, docs, Docker, and Acme seed.

Core software behavior is REAL IN V1; financial execution is visibly SIMULATED through mock.

## 5. What does V1 not contain?

Real PSP execution, custody, raw card handling, banking, lending, a regulated ledger, settlement balances, invoices, payouts, subscriptions, terminals, advanced inventory, custom domains, marketplace, capital scores, tax/shipping engines, cross-currency totals, custom roles, microservices, Kafka, or Kubernetes. Later modules are PLANNED; regulated activities remain OUT OF SCOPE.

## 6. Core entities

Organization, Merchant, Location, User, OrganizationMember, Role/Permission/Assignment, Customer, Product/Variant/MerchantProduct, InventoryLevel/Movement, Order/Item, CheckoutSession/LineItem, Payment/Attempt, Transaction, Refund, PaymentLink, ProviderAccount/Event, Event/OutboxMessage, WebhookEndpoint/Subscription/Delivery, APIKey, IdempotencyRecord, AuditLog. Employee is modeled as a member; Provider is adapter registry metadata.

## 7. Architecture

A TypeScript modular monolith with HTTP and worker modes, PostgreSQL source of truth/queue/outbox, Next.js reference apps, Drizzle, Zod, Auth.js/OIDC, Graphile Worker, OpenAPI 3.1, and OpenTelemetry. Dependency rules point inward and cross-module behavior uses ports/events. Docker Compose needs only web, worker, and PostgreSQL.

## 8. Provider strategy

Small capability interfaces, discovery, normalized errors/results, encrypted tenant accounts, explicit environment/currency routing, one default route in V1, stable provider idempotency, unknown-state reconciliation, no unsafe automatic failover, verified normalized provider events, deterministic mock, and a mandatory conformance suite.

## 9. Security strategy

Layered auth/RBAC, direct tenant keys plus composite constraints and RLS, hashed/scoped API keys, encrypted provider/webhook secrets, signed replay-protected webhooks, SSRF/rate/CSRF/CORS/CSP controls, parameterized/validated input, immutable audit/evidence, live/test isolation, supply-chain checks, encrypted tested backups, and no raw card data.

## 10. Golden path

Clone and bootstrap → Acme loads → create/publish product and stock → create payment link → buyer creates/confirms checkout → mock success → one payment/transaction → paid order → inventory movement → analytics → event/outbox → signed public webhook → dashboard inspection. Duplicate client/provider delivery leaves all counts unchanged.

## 11. What must be completed before coding starts?

Approve the public names, tenant/Merchant distinction, money representation, payment/transaction boundary, order creation timing, event envelope/versioning, test/live isolation, conservative V1 scope, threat model, OpenAPI skeleton, and ADRs. The planning pass supplies recommended decisions; maintainers need one formal sign-off review, plus short technical spikes for Drizzle RLS transaction context, Graphile Worker outbox leasing, Auth.js organization session invalidation, and raw-body webhook ingress in the chosen Next.js runtime.

## 12. What should be built first?

Repository boundaries and automated architecture rules; PostgreSQL migrations/RLS and TenantContext; money/ID/error primitives; auth/organization/merchant/default-location/RBAC; audit and idempotency. Do not begin UI/payment execution before those foundations.

## 13. Implementation sequence

Foundation → organization/security → commerce/inventory/order → provider contract/mock and payment states → checkout/links → events/webhooks → apps/OpenAPI/SDK/docs/seed → analytics/security/reliability/accessibility hardening.

## 14. Largest risks

Cross-tenant leakage; duplicate or unknown payments; integer/currency/rounding mistakes; false provider portability; settlement/ledger misunderstanding; webhook forgery/replay/SSRF; public contract lock-in; open-source maintainer burden; scope creep; misleading analytics/capital claims. Each has controls and acceptance gates in planning docs.

## 15. Is it ready?

The product and technical blueprint is internally actionable and resolves the major architectural questions. Implementation may start after maintainers record the planning sign-off and the four bounded spikes above confirm library/runtime mechanics; these are implementation-start tasks, not unresolved product design blockers. No production code should precede approval of the non-negotiable financial and tenant invariants.

READY FOR IMPLEMENTATION
