# Phase 10 Marketplace Plan

## Scope and architecture

Marketplace is an optional discovery channel over canonical Storefront and Commerce resources. A listing references one organization-owned canonical Product and never copies variants, price, inventory, customers, orders, checkout, or payments. Public purchase hands one merchant product and selected variant to the existing storefront checkout service with `marketplace` source attribution.

The V1.3 lifecycle follows the approved specification: `draft`, `submitted`, `approved`, `rejected`, `suspended`, and `archived`. A listing is discoverable and purchasable only when approved, eligible, and backed by an active store, published product, active variant, positive inventory, accepted terms, verified marketplace profile, and active compatible provider account. Moderation records actor, reason code, explanation, and time. Rejection and suspension preserve an appeal seam.

## Model

- `marketplaces`: optional deployment-level marketplace configuration and enabled state.
- `marketplace_categories`: manually curated stable taxonomy.
- `marketplace_profiles`: merchant opt-in, public identity overrides, contact verification, terms acceptance, suspension state, and public slug.
- `marketplace_listings`: marketplace/profile/product references, public copy overrides, category, lifecycle/moderation evidence, eligibility snapshot, and deterministic ranking fields.
- Canonical order source metadata records the Marketplace channel without changing payment or transaction truth.

One organization participates once in a marketplace. Product ownership is enforced by composite foreign-key/database checks plus tenant-scoped services. A product can have one non-archived listing per marketplace. No cross-merchant cart exists.

## Public discovery

PostgreSQL full-text/simple search supports bounded query, category, merchant, currency, price, and availability filters. Only an explicit public projection is returned. Search ordering is deterministic: configured rank, recency, then identifier. Marketplace-disabled state yields no public surface.

Public routes cover marketplace home/search, category browse, merchant profile, and listing detail. Checkout handoff re-resolves the listing and canonical variant inside a transaction, rejects price hints, validates merchant/product/listing state and inventory, then invokes canonical checkout creation.

## Merchant and moderation APIs

Merchant operations cover profile opt-in/update, listing collection/detail, create, submit, and archive. Marketplace moderation operations cover approve, reject, and suspend with reason evidence. Operations use existing session/API-key authentication, idempotency, tenant context, audit, error, and request-ID conventions.

Permissions are `marketplace:read`, `marketplace:manage`, and `marketplace:moderate`. Organization owners/admins manage their participation; appropriately scoped product managers may manage listings; platform moderation remains separately privileged. RLS is the final tenant defense for private data, while public queries use a narrow security-definer projection or dedicated public repository.

## Correctness and security

- Product/variant price remains canonical at checkout; listing copy cannot alter money.
- Inventory is revalidated immediately before canonical checkout creation.
- Test/live environment is part of all private and purchase boundaries.
- Foreign organization/product/listing identifiers return safe not-found responses.
- Search input is bounded and parameterized; public copy is rendered as text.
- Draft, submitted, rejected, suspended, archived, unpublished, inactive, and out-of-stock resources cannot be purchased.
- Fees, payouts, settlement, escrow, reviews, recommendations, sponsored rank, automated moderation, and multi-vendor checkout are deferred.

## Events and analytics

Meaningful lifecycle events are listing created, submitted, approved, rejected, suspended, and archived. Purchases continue to emit canonical order/checkout/payment events only. Existing analytics reads canonical order channel attribution; no parallel Marketplace financial metrics are created.

## Delivery sequence

1. Document approved boundaries and contracts.
2. Add schema, migration, grants, constraints, RLS, taxonomy, and feature configuration.
3. Add typed contracts and Marketplace domain services.
4. Add merchant, moderation, and public APIs.
5. Reuse canonical checkout and add source attribution.
6. Add SDK and OpenAPI.
7. Add merchant/public dashboard surfaces.
8. Extend deterministic multi-merchant seed data.
9. Add unit, PostgreSQL, API, RBAC, security, and browser tests.
10. Complete security, commerce-correctness, regression, and handoff documents.

## Acceptance criteria

Marketplace remains optional; listings reference canonical products; two merchants can be safely discovered; public projections exclude private fields; lifecycle, ownership, RLS, RBAC, environment, price, inventory, and eligibility controls hold; a Marketplace purchase produces canonical Order → Checkout → Payment state; SDK and OpenAPI match runtime; full Phase 1–9 regression and production builds pass.
