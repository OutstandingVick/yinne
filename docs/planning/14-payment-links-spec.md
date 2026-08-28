# Payment links specification

PaymentLink is a reusable configuration that creates a fresh CheckoutSession per use. It never is a payment/order itself.

## Kinds and releases

- Product/cart fixed configuration: REAL IN V1; references canonical variants but checkout snapshots current valid price.
- Flexible amount/general collection/donation label: REAL IN V1 with min/max, single currency, customer fields.
- One-off fixed amount: REAL IN V1.
- Invoice and subscription links: PLANNED and rejected until those modules exist.

Fields: organization, merchant, slug/public token, kind/config version, currency, active/paused/expired/exhausted status, start/expiry, usage_limit, completed usage_count, customer capture schema, optional location/channel, metadata, timestamps. Usage counts completed checkouts, not visits. Limit enforcement locks link at session confirmation; abandoned sessions do not consume final usage.

Analytics distinguish unique visits (privacy-aware), sessions started, completed payments, conversion, GMV per currency, and source/UTM if consent/policy permits. Product association uses IDs, never copied catalogue records. Archived products make link unavailable; price changes apply to new sessions and do not mutate old ones.

Public page states: active offer and CTA; expired/paused/exhausted/unavailable messages without tenant detail; amount validation; safe rate-limited session creation. Admin actions: create, preview, activate/deactivate, duplicate, inspect usage. Custom slug changes create redirect only later.

Acceptance: every opening/confirmation is tenant- and status-checked; parallel final uses cannot exceed limit; retry creates no duplicate session/payment; flexible amount obeys integer currency bounds; links cannot expose unpublished cross-merchant products.
