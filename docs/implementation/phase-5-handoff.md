# Phase 5 Storefront + Merchant Commerce handoff

## 1. Delivered outcome

Yinne now provides a complete merchant Storefront golden path: configure Store, publish canonical Products, browse publicly, select a Variant, persist a cart, revalidate stock and price, create a canonical Checkout Session, capture a guest Customer, create one canonical Order, execute deterministic Mock payment, decrement Inventory on success, record a Transaction/events, and return a confirmation.

## 2. Architecture

Storefront is a replaceable public projection and reference UI. It consumes Commerce, Checkout, and Payments and does not duplicate their business objects or financial rules. Dependency direction remains inward.

## 3. Store domain

One environment-bound Store configuration belongs to an existing Merchant. It carries public name, slug, description, optional logo/contact, currency, default Location, constrained appearance, catalogue version, lifecycle/version, and timestamps.

## 4. Publication model

StoreListing is the planned MerchantProduct-style publication boundary over a canonical Product. It stores publication state, featured/order presentation, and optional safe image data; it never copies price, currency, Variant, or stock truth.

## 5. Store lifecycle

Supported transitions are draft to active, active to paused, paused to active, and any non-archived state to terminal archived. Activation requires a published Product; paused/archived Stores cannot resolve publicly.

## 6. Public routing

The reference URL is `/store/:slug`. Slugs are globally unique per environment, normalized, and reject system/reserved routes. Custom domains and redirects remain deferred.

## 7. Public projections

Allow-listed Store/Product/Variant projections omit tenant IDs, Merchant/Location IDs, SKU, metadata, exact stock, audit, customer, token-digest, and provider data. Foreign/inactive/unpublished resources collapse to 404.

## 8. Availability

Availability comes from canonical Inventory at the Store default Location and is exposed only as `in_stock`, `low_stock`, or `out_of_stock`. Tracked stock is rechecked at Checkout initiation and again by Payments at success.

## 9. Cart

The client cart is Store-scoped and persists only Variant IDs and bounded quantities. It survives initiation errors, prevents cross-Store composition, and clears only after a canonical hosted Checkout URL is returned.

## 10. Checkout integration

Storefront validates publication/currency/stock, then invokes the Phase 4 Checkout service with Merchant, Location, canonical items, capture policy, return URLs, source metadata, and a stable idempotency key.

## 11. Guest customer behavior

Hosted Checkout collects only configured name/email/phone fields. Confirmation creates or reuses a canonical Customer through Commerce. Storefront stores no buyer account or PII.

## 12. Order behavior

Phase 4 Checkout creates one canonical immutable Order from its quote. Storefront source/catalogue metadata follows the approved metadata boundary. Retried initiation/confirmation does not create duplicate Orders.

## 13. Payment behavior

Payments Core remains the exclusive provider boundary and derives amount/currency from Order. Success alone creates charge evidence, pays Order, decrements stock, completes Checkout, and emits financial events. Storefront never calls a provider.

## 14. Failure and pending behavior

Decline creates no charge and leaves the Checkout retryable. Pending/unknown remains processing until verified webhook reconciliation. Cart initiation errors explain changed/unavailable inventory without accepting client prices.

## 15. Merchant API

Implemented Store retrieve/update, activate/pause/archive, and Product publish/unpublish operations under `/v1/store`. All use existing authentication, request IDs, canonical errors, tenant context, RBAC, audit, and event/outbox recording.

## 16. Public API

Implemented Store, catalogue, Product detail, and Checkout initiation under `/v1/public/stores/:slug`. Reads are bounded; writes are rate-limited and schema/idempotency controlled; public security overrides are documented.

## 17. Dashboard

Added Storefront navigation, overview/public URL/status, safe settings, and catalogue publication management. States are server-backed and no financial data is fabricated.

## 18. Public reference application

Added responsive Store home/catalogue, Product/Variant detail, persistent cart, hosted Checkout handoff, and confirmation. Empty/unavailable/error/loading/busy messaging is explicit.

## 19. Appearance and assets

Branding is limited to validated colors, type scale, radius, public text, and HTTPS image/logo URLs. Arbitrary HTML, Markdown, CSS, JavaScript, plugins, and executable uploads are disallowed.

## 20. SEO and performance

Active Store/Product pages produce title, description, canonical path, and indexability; cart/confirmation/unavailable states are noindex. Server-rendered bounded joins avoid per-card queries; images declare dimensions and lazy-load in catalogue.

## 21. Accessibility

Semantic landmarks/headings/lists, labels, native controls, keyboard focus, live alert/status regions, busy states, non-color availability text, reduced motion, responsive layouts, and configurable alt text cover scoped acceptance.

## 22. Database and migration

Migration `0009_reflective_golden_guardian.sql` adds Stores/listings, constraints, indexes, grants, forced RLS policies, and a fixed-search-path active-slug resolver. Composite ownership and migration ordering were verified against the Phase 4 database.

## 23. RBAC

Added `storefront:read`, `storefront:write`, and `storefront:publish`. Owner/Admin have full access; Manager manages/publishes; Finance, Staff, Analyst, and Developer receive read-only access consistent with duties.

## 24. Events and audit

Registered `store.created`, `store.updated`, `store.activated`, `store.paused`, `store.archived`, `product.published`, and `product.unpublished`. Mutations reuse atomic audit/event/outbox/webhook recording and safe payloads.

## 25. SDK and OpenAPI

`@yinne/sdk` exposes merchant Store management, publication, public catalogue, and Checkout initiation. OpenAPI 3.1 validates 52 operations including every implemented Phase 5 API and public security boundary.

## 26. Seed and demo

Repeatable Acme Coffee fixtures now include an active branded Store, default Location, nine published Products, featured items, an unpublished Product, and explicit low/out-of-stock states. Public demo URL is `/store/acme-coffee`.

## 27. Tests

Final automated coverage is 31 unit tests, 9 PostgreSQL integration tests, and 7 Chromium E2E tests. Phase 5 adds slug/theme/cart/lifecycle tests plus full public purchase and unavailable-resource non-disclosure paths.

## 28. Verification evidence

Passing gates: migration, repeatable seed, DB security check for 31 forced-RLS tables, OpenAPI validation, format, lint, 16-workspace typecheck, unit tests, integration tests, 16-workspace production build, and seven serial Chromium paths. See `phase-5-verification.md`.

## 29. Security verdict

PASS with no critical/high Phase 5 finding. Forced RLS, narrow resolver, safe projections, same-origin/rate/schema controls, idempotency, sanitized presentation, environment isolation, and capability separation were verified.

## 30. Financial and commerce verdict

PASS for deterministic test mode. Integer Variant prices, authoritative Checkout quote, canonical Order authority, payment-success stock boundary, immutable Transaction evidence, catalogue references, and retry/deduplication invariants remain intact.

## 31. Known limitations

Mock is the only provider; public rate limiting is in-process; asset proxying/scanning is operator hardening; exact stock is intentionally hidden; cart is browser-local; success confirmation is capability-light and does not expose buyer PII or order details.

## 32. Deferred scope

Marketplace, multi-vendor checkout, subscriptions, invoices, discounts, taxes, shipping rates/carriers, fulfilment providers, custom domains, real PSPs, reviews, recommendations, accounts, CMS, loyalty, AI merchandising, localization, and advanced SEO/analytics remain deferred.

## 33. Operations and next phase

Run `pnpm db:migrate`, `pnpm db:seed`, and `pnpm db:check`, then start dashboard and Worker. Operators should replace in-process rate limiting and validate production asset/provider controls before live use. The next approved phase is Operations & Invoicing, consuming the same canonical Orders, Payments, Transactions, events, and Storefront channel metadata.

PHASE 5 COMPLETE — READY FOR OPERATIONS & INVOICING
