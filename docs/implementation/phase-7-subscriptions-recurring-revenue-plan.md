# Phase 7 Subscriptions + Recurring Revenue plan

## Canonical decisions

Phase 7 implements the planned V1.2 Subscription module without redesigning the Phase 1–6 core.
`SubscriptionPlan` describes an offering; immutable `Price` versions hold currency, integer minor-unit
amount, and monthly/annual interval; `Subscription` owns customer lifecycle and snapshots agreed
price terms. Renewal uses the Phase 6 canonical Invoice and existing Checkout/Payments pipeline.

The supported states are `trialing`, `active`, `past_due`, `paused`, `cancelled`, and `ended`.
Creation without trial begins active only after its initial Invoice payment succeeds. Trials are test
mode only until a real provider supplies an opaque mandate/payment-method reference. Pause stops new
billing and preserves the remaining boundary; resume restarts a full snapshotted interval. Immediate
cancellation is terminal; period-end cancellation remains active until the current boundary.

## Calendar and financial rules

Scheduling uses UTC instants and an IANA billing timezone for display. Monthly/yearly advancement uses
calendar arithmetic with an immutable anchor day: clamp to the destination month's last day, then
return to the anchor when possible. Leap-day annual renewal clamps to February 28 in non-leap years.
DST never changes the UTC financial instant. Only month x1 and year x1 are exposed initially.

All amounts use checked BigInt minor units and supported ISO currencies. Prices are immutable after
creation; archival prevents new subscriptions but existing subscriptions continue from their
snapshots. Invoices snapshot description, period, quantity, amount, and currency.

## Renewal architecture

Graphile Worker periodically enqueues and executes bounded, index-supported, tenant/environment-aware
renewals. `subscription_id + period_start` is the stable renewal key and a database unique constraint
guarantees one Invoice per period. Each execution row is locked; replay returns the existing result.

The worker creates and issues the canonical Invoice, then initiates canonical Checkout/Payment. Mock
test mode uses deterministic outcomes (`succeed`, `fail`, `pending`) stored as non-sensitive test
configuration. No raw cards, vault, or production unattended charging are represented. Payment
success pays the Invoice and advances the Subscription once. Failure leaves the same Invoice open,
marks past due, and schedules attempts at +1 and +3 days. Exhaustion remains past due. Pending remains
open until canonical provider reconciliation. Manual retry reuses the Invoice and is idempotent.

## Product surface

Private APIs cover Plan and Price create/list/detail/archive and Subscription
create/list/detail/pause/resume/cancel/retry. Filters are bounded and cursor-ready. SDK and OpenAPI
mirror runtime behavior. RBAC adds subscription read/write/cancel/retry scopes with organization and
Location-aware authorization. Every mutation writes audit and outbox events transactionally.

Dashboard navigation adds Plans and Subscriptions with real list/detail/create/lifecycle/retry states.
No advanced analytics is added; only operational status and recurring totals are shown.

## Persistence and events

New tables are subscription_plans, recurring_prices, subscriptions, and subscription_renewals.
Invoices gain nullable subscription and billing-period linkage. Composite ownership, environment
constraints, forced RLS, runtime grants, indexes, unique renewal keys, and check constraints are
required. Events cover plan/price lifecycle; subscription created/trialed/activated/paused/resumed,
cancel scheduled/cancelled; renewal started/succeeded/failed/pending/retried; and period advanced.

## Seed and tests

Acme Coffee receives active/archived plans, monthly/annual prices, and active, trialing, past-due,
paused, period-end-cancel, cancelled, successful-due, failed-due, and pending-due subscriptions.
Fixtures and a test clock make renewal deterministic.

Tests cover money validation, state transitions, month-end/leap-year/DST semantics, immutable terms,
tenant/environment isolation, duplicate scheduler execution, duplicate provider events, success,
failure, pending, retry, pause/resume, cancellation, API errors, Worker behavior, and E2E dashboards.

## Security and acceptance

No payment credential or raw provider secret is stored. Live unattended execution is rejected without
a provider capability. Tenant and environment are enforced in application queries, RLS, constraints,
and worker payloads. Audit/event payloads omit sensitive tokens.

Acceptance requires deterministic dates, one Invoice per period, one advancement per successful
Payment, canonical Invoice/Payment/Transaction use, replay-safe jobs/webhooks/retries, passing full
regression and builds, exact SDK/OpenAPI parity, and documentation that does not claim production
saved-card support.

## Explicit exclusions

Real PSPs, provider-native subscription truth, raw cards, vaulting, metering, seats, proration,
coupons, currency switching, bundles, entitlements, tax, accounting/revenue recognition, automated
email/SMS dunning, marketplace, capital intelligence, and advanced analytics remain excluded.
