# Subscriptions specification — PLANNED V1.2

Canonical objects: SubscriptionPlan (product/entitlement definition), Price (currency, unit amount, interval unit/count), Subscription (customer, price, status, period), Invoice/InvoiceItem (immutable billed snapshot), Payment, and PaymentMethodReference (provider token/mandate only).

Intervals support day/week/month/year plus count; quarterly is month x3 and annual year x1. V1.2 should initially expose monthly and annual only. Weekly/quarterly follow after calendar tests; daily/custom intervals remain architecture-ready.

States: trialing, active, past_due, paused, cancelled, ended. Cancellation supports period-end or immediate policy; pause has resume time and billing behavior. Renewal worker creates one invoice per subscription/period using unique subscription_id + period_start, then payment. Failed attempts follow explicit retry schedule; provider recurring capability or stored token reference is required. Dunning does not silently extend service.

Trials have start/end and one conversion event. Price changes create new Price; existing subscriptions keep price unless scheduled migration. Time calculations use subscription billing timezone/calendar with UTC instants and documented month-end/DST behavior.

Acceptance before release: duplicate scheduler runs create one invoice; retry never double-charges; cancellation/pause boundary is deterministic; failed payments reach past_due; webhook/order does not invent provider mandates; test clock covers DST, leap day, month-end. Until then UI/API return module_not_enabled, never simulated production subscription claims.
