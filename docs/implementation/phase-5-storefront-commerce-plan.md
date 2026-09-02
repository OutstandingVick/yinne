# Phase 5 Storefront + Merchant Commerce implementation plan

**Date:** 2026-09-02  
**Status:** Approved implementation baseline

## 1. Architectural decision

Storefront is a replaceable reference application and public API projection over Yinne's existing Commerce, Checkout, and Payments modules. It owns presentation, a browser cart, constrained theme rendering, discovery metadata, and checkout handoff. It never owns authoritative prices, stock, Orders, Payment state, provider execution, or financial evidence.

The planning model already has an organization-owned Merchant, but a public shop needs independently controlled publication, routing, branding, and default-location configuration. Phase 5 therefore adds one `Store` configuration per Merchant and environment. Products remain canonical organization Products and Variants; a small `StoreListing` projection is the planned MerchantProduct publication boundary, not a duplicate catalogue.

## 2. Domain model and lifecycle

`Store` contains organization, environment, merchant, public name, globally unique normalized slug, description, optional HTTPS logo URL, status, default location, contact email/phone, constrained appearance tokens, catalogue version, and timestamps. Status transitions are controlled: `draft -> active -> paused -> active` and any non-archived state to terminal `archived`. A draft, paused, or archived store has no public catalogue exposure.

Slugs are lowercase ASCII letters, digits, and single hyphens; reserved application/system route names are rejected. Slugs identify only active public projections and never reveal organization IDs. The Phase 5 route is `/store/:slug`; custom domains and slug redirects are excluded.

`StoreListing` contains store, canonical product, publication state, featured flag, display order, optional safe image URL/alt text, and timestamps. Publication requires an active Product with at least one active Variant in the Store currency. Unpublishing only changes discovery; historical Checkout and Order snapshots remain intact.

## 3. Configuration, branding, and location

Merchants configure public name, description, safe contact fields, optional HTTPS logo, default location, and a constrained token object: primary/background/text colors, type scale, and border radius. Values are schema validated and rendered as CSS variables. HTML, Markdown, custom CSS/JavaScript, plugins, and uploaded executable assets are rejected.

The default location must belong to the Store's organization and Merchant. It is the inventory source for availability and the location passed into Checkout. Phase 5 is single-location per cart/store; multi-location routing and shipping calculation remain later work.

## 4. Public catalogue and availability

Public APIs return explicit allow-listed projections only: safe Store identity/theme/contact fields; listing IDs; Product names/slugs/descriptions; safe listing image data; active Variant IDs/titles/prices/currency; and availability. Metadata, internal IDs, SKUs, cost, stock counts, tenant IDs, audit data, and unpublished resources are excluded.

Only active stores, published listings, active products, and active variants appear. Availability is derived at read and checkout-initiation time from canonical Inventory at the Store location. Public responses expose `in_stock`, `low_stock`, or `out_of_stock`, not exact quantities. Listing queries are paginated, ordered, and bounded; no per-card query loop is permitted. Public GET responses may use short revalidation keyed by Store catalogue version and are invalidated by Store/listing/Product events.

## 5. Cart architecture

The cart is client-side, scoped by Store slug, and persists only Variant IDs and positive bounded quantities. Display snapshots may be retained for responsive rendering but are never trusted. It rejects cross-store mixing in the UI. The initiation endpoint resolves every Variant again, verifies publication, currency, location, and current stock, then returns explicit unavailable/price-change details or an authoritative Checkout Session.

Cart contents survive retryable initiation failures. Successful handoff clears the cart only after the browser receives the canonical hosted Checkout URL.

## 6. Guest, Order, Checkout, and Payments flow

Public initiation accepts Store slug, Variant references/quantities, and an idempotency key. A tenant-scoped application service resolves the Store and calls the existing Checkout Session creation service with canonical product configuration, Store Merchant/default Location, and trusted success/cancel URLs. The established Phase 4 boundary then creates or reuses a canonical Customer at confirmation, creates the canonical Order from the immutable quote, and invokes Payments Core. Payment success alone decrements inventory, marks the Order paid, writes the Transaction, and emits financial events.

This preserves the implemented Phase 4 sequence (authoritative Checkout quote before Order creation) while satisfying the golden-path outcome without a second order or payment implementation. Repeated initiation with the same idempotency key returns the same Checkout Session and cannot create duplicate Orders. Failure reopens the same session for retry; pending remains processing until provider reconciliation. Success returns to `/store/:slug/order/:checkout_token`, which reads a capability-scoped, PII-minimized confirmation projection.

Orders created from Storefront carry safe source metadata (`channel: storefront`, Store ID, listing/catalogue version) through the approved Checkout metadata boundary so merchant order views can identify the channel. Storefront never calls a provider adapter.

## 7. API boundaries

Merchant-authenticated operations:

- `GET /v1/store`
- `PATCH /v1/store`
- `POST /v1/store/activate`, `/pause`, and `/archive`
- `GET /v1/store/listings`
- `POST /v1/store/products/:product_id/publish`
- `POST /v1/store/products/:product_id/unpublish`

Public, no-store-or-short-cache, rate-limited operations:

- `GET /public/stores/:slug`
- `GET /public/stores/:slug/products`
- `GET /public/stores/:slug/products/:product_slug`
- `POST /public/stores/:slug/checkout`
- `GET /public/stores/:slug/orders/:checkout_token`

Public errors deliberately collapse unavailable, foreign, paused, and unpublished resources to `404`; validation and stale-cart conflicts are safe structured errors with request IDs. Writes use idempotency, origin/content-type controls, and strict body limits.

## 8. Dashboard and reference application

Dashboard adds Storefront navigation with overview, setup diagnostics/public URL, settings/appearance, and catalogue publication controls. Every mutation has loading, validation, success, and failure feedback. Preview is clearly distinguished from public availability.

The public Storefront supplies home/catalogue, Product detail/Variant selection, cart review, checkout handoff, and confirmation/pending/failure states. It is responsive, keyboard operable, screen-reader labelled, supports visible focus and reduced motion, preserves usable layouts at 200% zoom, and avoids color-only status. Images have explicit dimensions, lazy loading, and alt text.

## 9. SDK, OpenAPI, events, permissions, and audit

The TypeScript SDK receives typed merchant Store/listing operations and public Storefront reads/initiation. OpenAPI 3.1 documents every operation, projection, error, idempotency header, and public security override.

New stable events are `store.created`, `store.updated`, `store.activated`, `store.paused`, `product.published`, and `product.unpublished`. They use the existing event/outbox/webhook transaction and omit contact data, appearance bodies, tokens, and tenant-sensitive fields. Merchant configuration and publication mutations create immutable audits.

Permissions are `storefront:read`, `storefront:write`, and `storefront:publish`, assigned through the predefined role matrix. Public reads do not bypass RLS directly: a narrow fixed-search-path resolver establishes organization/environment, after which repositories execute under forced RLS. Test/live rows, public slugs, Checkout Sessions, events, and idempotency remain environment isolated.

## 10. Security, SEO, and performance

All display strings are rendered as text. URLs allow HTTPS (localhost HTTP only in development); theme values are enumerated/bounded; no secrets, raw stock, customer PII, capability digest, provider data, or arbitrary metadata enters public projections/events. Public endpoints receive the existing layered rate limits and security headers. Composite foreign keys, forced RLS, least-privilege grants, and immutable history constraints apply to new tables.

SEO scope is page title, description, canonical Store URL, indexable active catalogue/product pages, noindex unavailable/cart/checkout/confirmation pages, and basic Product JSON-LD using only public projections. Sitemap generation, feeds, localization, and advanced SEO tooling are excluded.

Catalogue reads use indexed slug/status/order columns, bounded pagination, aggregate availability joins, and compact payloads. Core content remains server-rendered; cart JavaScript is progressively isolated.

## 11. Seed and demonstrations

The repeatable Acme Coffee seed creates an active branded Store with its default location, a public URL, published products and variants, one featured product, low-stock and out-of-stock examples, and at least one unpublished active Product. All prices, stock, Orders, Checkout Sessions, Payments, Transactions, events, and Customers remain canonical records.

## 12. Test strategy and acceptance

Unit tests cover slugs/reserved words, lifecycle transitions, theme/URL sanitization, cart validation, public projections, and SDK contracts. PostgreSQL integration tests cover composite ownership, forced RLS/test-live isolation, publication constraints, bounded catalogue/availability, event/audit atomicity, idempotent initiation, stale/out-of-stock revalidation, and foreign-resource non-disclosure.

API/browser tests cover merchant configuration and publishing; browse → Product → Variant → cart → guest Hosted Checkout → Mock success → confirmation; decline and retry without duplicate Order; pending then verified webhook completion; price/stock change handling; mobile/keyboard basics; and safe unavailable states. Full gates are migrations from Phase 4 and clean DB, repeatable seed, DB checks, OpenAPI validation, format, lint, typecheck, unit/integration/E2E suites, production builds, and bounded Worker processing.

Acceptance requires one canonical Customer, Order, Checkout Session, Payment, charge Transaction, inventory decrement, events/outbox/webhook projections, and merchant-visible Storefront source for one successful purchase; replay leaves all counts unchanged. No public response leaks foreign/unpublished/internal data, and no Storefront code writes financial truth.

## 13. Explicit exclusions

Marketplace, multi-vendor carts, subscriptions, invoices, capital intelligence, reviews, ratings, recommendations, wishlists, loyalty, coupons/discounts, tax engines, carrier/shipping pricing, fulfilment providers, custom domains, real PSPs, CMS/blogging, AI merchandising, arbitrary themes, saved buyer accounts, and advanced analytics remain out of scope.
