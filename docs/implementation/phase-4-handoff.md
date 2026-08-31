# Phase 4 handoff

## 1. What was implemented

Phase 4 adds canonical Checkout Sessions, Hosted Checkout, reusable Payment Links, public/authenticated APIs, SDK/OpenAPI coverage, dashboard management, events/webhooks, fixtures, and tests over the existing Commerce and Payments cores.

## 2. Checkout Session model

An environment-bound, expiring interaction with merchant/location, optional source link/customer/order/payment references, immutable quoted items, bigint amount, currency, capture policy, trusted redirects, safe metadata, timestamps, and version. It is not an Order, Payment, or Payment Link.

## 3. Checkout state machine

`open -> processing -> completed`; `open -> expired|cancelled`; `processing -> open` after failure. Terminal states do not regress. Payment finalization owns financial resolution.

## 4. Payment Link model

An environment-bound reusable public configuration with merchant/location, kind/configuration, active state, currency, starts/expiry window, capture policy, optional completed-use limit, count, metadata, and version.

## 5. Supported Payment Link types

- Product: current active Variant price/currency is snapshotted per new session.
- Fixed: stored positive integer minor-unit amount and description.
- Flexible: stored currency, positive minimum, and optional maximum.

## 6. Public token architecture

URLs use random 256-bit base64url capabilities. Only SHA-256 digests and eight-character diagnostic prefixes are stored. Fixed-search-path `SECURITY DEFINER` functions reveal only tenant/environment/resource tuples to establish forced RLS. URLs are returned only at creation.

## 7. Expiration behavior

Sessions default to 30 minutes and accept 5 minutes–24 hours. Open sessions expire server-side under a lock. Processing sessions are not cancelled when time passes; later success completes them with `late_completion: true`.

## 8. Customer/guest behavior

Anonymous checkout is supported. Name/email/phone requirements come from the trusted capture policy. Confirmation creates or reuses one canonical Customer and stores only validated contact details.

## 9. Order integration

Product sessions call canonical `createOrder`. Fixed/flexible sessions call the Commerce-owned `createCollectionOrder`, producing an ordinary non-inventory OrderItem. Checkout does not implement alternate order tables or inventory mutation.

## 10. Payment integration

Checkout calls canonical `createPayment`; Payments derives amount/currency from Order, calls the provider adapter, writes PaymentAttempt/Transaction, applies Order/inventory effects, and reconciles Checkout/link usage in the same finalization transaction.

## 11. Pending flow

Pending/unknown Mock results leave Checkout processing. Verified provider webhook finalization uses the same Payment path and resolves Checkout to completed or open-on-failure. Financial terminal facts never regress.

## 12. Public Hosted Checkout

`/pay/:token` displays sanitized link data and creates one fresh session. `/checkout/:token` displays the real immutable quote, required guest fields, expiry/state, and supported test outcomes. No raw payment credentials are presented or accepted.

## 13. Redirect handling

Only authenticated session creation may set success/cancel URLs. HTTPS is required except localhost HTTP in development. Public confirmation cannot supply or override redirects.

## 14. API operations

Implemented list/create/retrieve/confirm/cancel Checkout operations; list/create/retrieve/update/activate/deactivate Payment Link operations; and public retrieve/submit endpoints for checkout and links.

## 15. SDK changes

`@yinne/sdk` adds typed CheckoutSession, CheckoutLineItem, and PaymentLink resources with list/retrieve/create/confirm/cancel/update/activation methods and automatic idempotency keys.

## 16. OpenAPI changes

OpenAPI 3.1 describes 42 operations, Phase 4 routes, public security overrides, capability parameters, idempotency, positive minor-unit money, and create schemas.

## 17. Dashboard pages

Added Checkout Session list/detail and Payment Link list/create pages plus navigation. Creation supports fixed/product/flexible configuration and one-time capability URL copying.

## 18. RBAC changes

Added `checkout:read/write` and `payment_links:read/write`. Owner/Admin have all; Finance/Manager manage both; Staff operates Checkout but cannot create arbitrary links; Analyst is read-only; Developer has scoped management.

## 19. Events/webhooks

Added checkout created/processing/completed/expired/cancelled and link created/activated/deactivated events. Existing atomic audit/event/outbox/webhook projection is reused; payloads omit tokens and customer PII.

## 20. Seed/demo changes

Repeatable seed includes active, inactive, exhausted links and open, processing, completed, expired sessions with immutable quote items. The public golden path is usable with the seeded active fixed link.

## 21. Tests

State/contract unit tests, PostgreSQL regression suites, API/runtime smoke tests, and five Playwright regressions pass. The new browser test covers public link → hosted checkout → guest → successful payment.

## 22. Security findings

PASS. Capability entropy/digest storage, narrow resolvers, forced RLS on 29 tables, composite ownership, RBAC, strict public schemas, rate limiting, no-store, CSP/frame controls, redirect validation, and PII/token omission were verified.

## 23. Financial-correctness findings

PASS. Money is bigint minor units; product/flexible bounds are server-derived; Order is payment authority; Payment success is the only charge/inventory boundary; locks, uniqueness, and idempotency prevent duplicate transactions or link usage.

## 24. UX/accessibility findings

PASS for scoped surfaces. Hosted UI is mobile-first with real quote/state/expiry, labels, native controls, autocomplete, focus rings, alert/status regions, busy states, and explicit Test Mode.

## 25. Known limitations

Capability URLs cannot be recovered after creation. Only Mock Provider/test execution exists. Flexible amounts are entered as minor units. Dashboard detail does not recover public tokens.

## 26. Deferred work

Real PSPs, cards/bank credentials, full Storefront, discounts, tax, shipping providers, saved methods, subscriptions, invoices, payouts, marketplace, custom domains, advanced fraud, and richer analytics remain deferred.

## 27. ADRs

No ADR was required. Capability resolution and collection orders apply existing security/Commerce boundaries without changing the approved architecture.

## 28. Exact run commands

```text
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:seed
pnpm db:check
pnpm openapi:validate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm --filter @yinne/worker start
```

Worker verification sends SIGINT after successful `outbox_dispatch` processing and expects `Worker received SIGINT; stopping gracefully.`

## 29. Recommended next implementation phase

Proceed to Storefront & Merchant Commerce, reusing Payment Links and Checkout Sessions as the only public commercial/payment entry points.

PHASE 4 COMPLETE — READY FOR STOREFRONT & MERCHANT COMMERCE
