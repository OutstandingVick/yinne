# Phase 4 Checkout and Payment Links implementation plan

**Status:** Approved for implementation  
**Prepared:** 2026-08-28

## Scope and boundaries

Phase 4 adds canonical Checkout Sessions, unauthenticated Hosted Checkout, reusable Payment Links, authenticated management APIs, SDK/OpenAPI support, merchant dashboard surfaces, public events, and webhook delivery through the existing outbox. It reuses Commerce Orders and Phase 3 Payments/Mock Provider; it does not introduce a second order, payment, inventory, transaction, provider, idempotency, or webhook path.

Full storefronts, real PSPs, raw card collection, saved instruments, shipping/tax/discount engines, subscriptions, invoices, payouts, marketplace, custom domains, and advanced fraud controls remain excluded.

## Domain models and state machines

`CheckoutSession` is an environment-bound, expiring customer interaction, distinct from its eventual `Order`, `Payment`, and optional source `PaymentLink`. It stores merchant/location, immutable quoted line-item or collection snapshots, integer minor-unit total and ISO currency, required customer fields, safe metadata, HTTPS completion/cancellation URLs, expiry, version, and nullable customer/order/payment references.

States are `open -> processing -> completed`, `open|processing -> cancelled`, and `open -> expired`. A failed payment returns `processing -> open` for explicit retry. Expiry is applied lazily under a row lock and by ordinary reads; the default is 30 minutes and the accepted range is 5 minutes through 24 hours. A pending/unknown payment is not cancelled by time passing. Its later success completes the session and records a late-completion flag. Completed, cancelled, and expired sessions never regress.

`PaymentLink` is a reusable, environment-bound public configuration. V1 supports:

- `product`: one active product variant and positive quantity; each new session snapshots the then-current canonical variant price and currency.
- `fixed`: one server-stored positive minor-unit amount, currency, and description.
- `flexible`: one fixed currency with positive minimum and optional maximum; the buyer's integer amount must be inside those bounds before it is snapshotted.

Links have active/inactive status, start/expiry windows, optional completed-use limit, customer capture policy, merchant/location, version, and safe metadata. A public visit does not consume usage. Every submission creates or replays one fresh session; only successful completion increments usage. Confirmation locks the link and refuses an exhausted or newly unavailable link. Product archival or currency mismatch prevents new sessions without mutating existing snapshots.

## Public access and security

Hosted pages are `/checkout/:token` and `/pay/:token`. Tokens are independent cryptographically random 256-bit URL-safe capabilities, never database IDs, tenant IDs, API keys, or sequential slugs. The database stores a SHA-256 digest and a short display prefix. SECURITY DEFINER resolver functions with a fixed search path reveal only the tenant/environment/resource tuple needed to establish RLS context; all details are then read inside the normal forced-RLS transaction. Tokens and customer details are excluded from logs, audit payloads, events, and provider metadata.

Public mutations accept narrow schemas, strict sizes, CSRF-safe same-origin form posts, rate limits, and an idempotency key generated before submission. Redirect URLs are stored only after HTTPS validation (localhost HTTP is allowed in development), are never accepted during public confirmation, and are used only from the trusted session record. No page or API accepts PAN, CVV, bank credentials, arbitrary payment totals, currencies, provider references, or status changes.

Guest checkout is supported. Required name/email/phone fields are validated according to the session policy. A canonical Customer is created or attached once during confirmation, before Order creation, and its ID is saved on the session. A session retry reuses that customer, order, and payment.

## Commerce and payment orchestration

Session creation resolves variants and prices server-side and snapshots the quote. Confirmation is a versioned, single-writer orchestration:

1. lock and validate the session, expiry, and optional link availability;
2. validate and persist required customer data through the existing Customers service;
3. create/replay a canonical Order through Commerce from the trusted quote (fixed/flexible collections use a narrowly scoped Commerce collection-order command rather than writing order tables in Checkout);
4. create/replay a canonical Payment through Payments, which derives its total and currency from that Order;
5. execute the selected provider outside long-lived locks and reconcile the normalized result;
6. copy only the resulting references/status into Checkout.

Checkout verifies the Order total/currency equals its quote before payment. Payment success remains the sole path that creates a charge Transaction, marks the Order paid, decrements stock when applicable, and emits financial events. Payment reconciliation also updates the linked session and increments a link's completed usage exactly once under locks. Pending responses keep the session processing; provider webhook success/failure triggers the same reconciliation helper. Failed attempts reopen the session without creating financial evidence.

Test/live isolation is inherited from request context and embedded in every row/reference. Mock Provider execution is allowed only in test mode. No link/session/provider account can cross environments.

## APIs, UI, SDK, events, and RBAC

Authenticated versioned APIs:

- `GET|POST /v1/checkout/sessions`
- `GET /v1/checkout/sessions/:id`
- `POST /v1/checkout/sessions/:id/confirm`
- `POST /v1/checkout/sessions/:id/cancel`
- `GET|POST /v1/payment-links`
- `GET|PATCH /v1/payment-links/:id`
- `POST /v1/payment-links/:id/activate`
- `POST /v1/payment-links/:id/deactivate`

Public routes expose only sanitized merchant, quote, expiry, capture requirements, and normalized payment state. Authenticated creates and confirmations require idempotency; public link submission and checkout confirmation use equivalent scoped idempotency. Lists are tenant/environment scoped and cursor paginated; foreign resources return 404.

Add granular `checkout:read`, `checkout:write`, `payment_links:read`, and `payment_links:write` permissions. Owner/Admin receive all; Finance and Manager can manage both; Staff can operate sessions but cannot create arbitrary links; Developer can manage both through scoped API access; Analyst is read-only. Existing merchant/location scope checks remain authoritative.

The dashboard adds Checkout Sessions list/detail and Payment Links list/create/detail with persistent test-mode treatment, copyable public URLs, clear status/expiry, integer-money formatting, accessible forms, error summaries, keyboard focus, pending polling, and no unsupported payment-method UI. Hosted pages use the shared design tokens/components but remain deliberately small and mobile-first.

Extend `@yinne/sdk` with typed checkout-session and payment-link resources and public retrieval/confirmation helpers. Update OpenAPI to match runtime schemas, idempotency headers, permissions, pagination, error envelopes, test examples, and public endpoints.

Add domain events `checkout.created`, `checkout.processing`, `checkout.completed`, `checkout.expired`, `checkout.cancelled`, `payment_link.created`, `payment_link.activated`, and `payment_link.deactivated`. Existing outbox/public webhook machinery delivers subscribed events; payloads contain IDs, status, amount/currency, and timestamps but no public tokens or customer PII.

## Idempotency and concurrency

Authenticated commands use the existing organization/principal/environment/operation idempotency store. Public commands use a digest of the public capability as principal scope and the same request-hash conflict rules. Advisory locks plus row locks make repeated submissions return the same session/order/payment. Unique session-to-order/payment constraints, payment financial evidence uniqueness, version checks, and a completion marker make retries and duplicate provider events harmless. Usage-limit checks and increments share the completion transaction.

## Testing and verification

Unit tests cover state transitions, expiry boundaries, URL/token validation, link kinds, amount bounds, customer requirements, and redirect safety. Integration/API tests cover tenant/RLS and environment isolation, RBAC, idempotency replay/conflict, server-derived money, immutable snapshots, product archival, use-limit concurrency, foreign 404s, event/outbox atomicity, and provider reconciliation. Public/E2E tests cover fixed/product link creation, anonymous checkout success, failed retry, pending-to-success webhook resolution, expiration, invalid token, cancellation, success redirect, and merchant visibility.

Verification includes frozen install, existing and clean migrations, repeatable seed, database checks, OpenAPI validation, format, lint, typecheck, unit/integration/API tests, E2E, dashboard/worker builds, and worker startup/job/shutdown. Seed data includes active/inactive/exhausted links and open/processing/completed/expired sessions without marking every order paid.

## Financial and security acceptance criteria

- Every displayed/charged amount and currency is server-derived and integer minor-unit exact.
- Exactly one successful charge produces exactly one Transaction, Order payment transition, inventory effect, checkout completion, link-use increment, DomainEvent set, and webhook projection despite retries.
- Failure creates no charge transaction or inventory decrement and permits an explicit safe retry.
- Pending remains visibly processing and verified webhook resolution reaches the same terminal facts.
- Public tokens are high entropy, tenant IDs stay hidden, RLS remains forced, redirects are constrained, no sensitive fields are accepted/exposed, and test/live/provider boundaries cannot be crossed.
- Authenticated API, SDK, dashboard, public pages, seed/demo flow, required reviews, verification evidence, and Phase 5 handoff agree with actual runtime behavior.

## ADRs

No new ADR is planned. The public token resolver is a narrowly scoped database security boundary, and collection orders are an explicit Commerce command; both apply existing architecture rather than replacing it. Any materially irreversible conflict discovered during implementation will be documented before proceeding.
