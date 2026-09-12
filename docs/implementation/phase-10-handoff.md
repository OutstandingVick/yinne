# Phase 10 Handoff: Marketplace

## Outcome

Yinne now has an optional multi-merchant Marketplace discovery layer over canonical commerce. Merchants opt in, publish product-linked listings, pass explicit eligibility and moderation, and become discoverable through a narrow public projection. Buyers select one canonical variant and hand off to the existing Storefront → Checkout → Payment flow.

## Architecture delivered

- `@yinne/marketplace` owns participant profiles, listing lifecycle, eligibility, moderation, and public discovery.
- `marketplaces` provides an enable/disable boundary; disabling the Yinne marketplace removes discovery resolution.
- `marketplace_categories` provides a manual taxonomy without a new catalogue system.
- `marketplace_profiles` stores organization/environment-bound opt-in, public identity, verified-contact and terms evidence, plus suspension state.
- `marketplace_listings` references canonical Product and owns only discovery overrides, category, state, rank, eligibility, and moderation evidence.
- Composite foreign keys and tenant services prevent an organization from listing another organization's Product.
- Private profiles/listings use forced RLS; public access goes through bounded security-definer resolvers and then explicit projections.

## Lifecycle and eligibility

The approved lifecycle is `draft → submitted → approved/rejected`, with approved listings able to become suspended or archived and rejected/suspended listings able to be resubmitted. Invalid transitions fail. Approval requires accepted terms, verified contact, unsuspended profile, active Store, active Product, Storefront publication, enabled provider, active variant, and sufficient tracked inventory. Eligibility checks and moderation reason/explanation are persisted.

Only approved listings backed by currently eligible canonical resources appear in browse/search. Draft, submitted, rejected, suspended, archived, unpublished, inactive, or unavailable resources cannot begin a new Marketplace checkout.

## Public marketplace

`/marketplace` provides multi-merchant browse and text search. Listing detail shows safe merchant identity, category, canonical product content, canonical variant amount/currency, and availability. PostgreSQL discovery supports bounded query, category, merchant, currency, price, availability, and limit filters with deterministic ordering.

The public API is:

```text
GET  /v1/public/marketplace
GET  /v1/public/marketplace/listings/{id}
POST /v1/public/marketplace/listings/{id}/checkout
```

Public output omits organization IDs, inventory quantities, product metadata, provider configuration, customer information, and moderation actors.

## Merchant and moderation surfaces

The authenticated Marketplace dashboard shows opt-in state, public profile, lifecycle, eligibility, listing collection, and links to approved public listings. Merchant APIs cover profile get/update, listing list/create, submit, and archive. Moderation APIs cover approve, reject, and suspend with required structured evidence.

Permissions are `marketplace:read`, `marketplace:manage`, and `marketplace:moderate`. Owners/admins inherit all; organization managers can read/manage; analysts can read. Moderation remains distinct from merchant management.

## Canonical checkout and financial correctness

Marketplace accepts only listing ID, canonical variant ID, quantity, and idempotency key. It does not accept merchant, amount, currency, inventory, provider, or fee values from the buyer. Immediately before handoff it re-resolves approved listing state and canonical Storefront publication, variant, price, currency, and stock.

The resulting CheckoutSession records `channel: marketplace` and `marketplace_listing_id`, then follows existing canonical confirmation behavior for Customer, Order, inventory, Payment, Transaction, Refund, events, and analytics. One merchant per checkout is structurally enforced. Marketplace emits lifecycle events only and does not duplicate purchase events.

No Marketplace commission, settlement, split payment, escrow, or payout was implemented because execution and reconciliation policy is not approved.

## SDK and OpenAPI

`@yinne/sdk` now exposes typed merchant profile and listing methods. The OpenAPI 3.1 document covers 105 operations, including authenticated lifecycle/moderation and unauthenticated public discovery/checkout handoff.

## Demo data

The repeatable seed enables Yinne Marketplace with Food & drink and Home & living categories. Acme Coffee includes an approved available listing, an unavailable listing, and an unpublished/submitted listing. Aso Living is a second organization with its own merchant, location, provider, Store, published canonical product/variant, real inventory, profile, and approved listing.

## Verification

```text
Lint                         passed
Typecheck                    22/22 packages
Unit/contract tests          26 files, 84 tests
PostgreSQL integration       6 files, 15 tests
Browser E2E                  25 tests
OpenAPI                      valid, 105 operations
Existing migration           passed
Clean migration/seed         passed
Forced RLS                   38 tenant tables
Production build             22/22 packages, 73 pages
Worker                       startup, processing, graceful SIGINT passed
```

Marketplace browser coverage proves two-merchant discovery, search, canonical pricing, listing detail, canonical hosted-checkout handoff, private projection boundaries, and inaccessible unpublished listings. Lifecycle and contracts prove valid transitions, moderation bypass rejection, bounded filters, invalid price ranges, and checkout price-injection rejection. The complete Phase 1–9 regression remains green.

Exact commands are recorded in `phase-10-verification.md`.

## Deferred scope

Multi-vendor cart/checkout, reviews, recommendations, personalization, sponsored ranking, automated moderation, commissions, split settlement, escrow, payouts, dispute adjudication, and Marketplace-specific financial analytics remain deferred. Any future fee must have provider execution, reconciliation, legal, accounting, refund, and reporting semantics before implementation.

## Git and release state

Phase 10 is exactly 30 additive commits after Phase 9 baseline `22ec49cb01ba9c70276b8bd4bb636929a51bf8cb`. Prior history was preserved, no force-push was used, no secrets or generated databases were committed, and `main` was kept deployable. The final commit is pushed to `origin/main` at `https://github.com/OutstandingVick/yinne`.

## Recommended next phase

Proceed to V1 hardening and release: production configuration, operational runbooks, abuse controls, observability/SLOs, accessibility and device matrices, backup/restore drills, dependency and supply-chain review, deployment rehearsal, and final security testing. Marketplace fees and settlement should remain gated behind a separate approved financial design.

PHASE 10 COMPLETE — READY FOR V1 HARDENING & RELEASE
