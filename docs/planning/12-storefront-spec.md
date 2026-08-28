# Storefront specification

Storefront is a replaceable reference app using public/application APIs. It owns presentation, session cart, SEO, and theme rendering—not prices, inventory truth, order creation, or payment rules.

## Pages and status

| Page                           | Purpose / key actions and data                          | States / permission                                                                    | Release |
| ------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------- |
| Store home                     | Brand, featured products, collections teaser; browse    | Empty “products coming soon”; unavailable store 404/maintenance; public published data | V1      |
| Catalogue                      | Filter/page available products; add to cart             | Empty catalogue; retryable API error; public                                           | V1      |
| Product detail                 | Variant, integer price/currency, availability, quantity | Unavailable/out-of-stock disables purchase; public                                     | V1      |
| Cart                           | Edit quantities/remove/start checkout; server reprice   | Empty CTA; changed price/stock requires acknowledgement; public/session                | V1      |
| Checkout handoff               | Create hosted session and redirect                      | Preserve cart on failure; public/rate-limited                                          | V1      |
| Order success                  | Session/order summary via short-lived opaque token      | Pending state polls; no enumeration/PII leakage                                        | V1      |
| Search/collections             | Discovery                                               | Empty suggestions; public                                                              | V1.1    |
| Customer account/order history | Self-service                                            | auth/recovery states                                                                   | Planned |
| Custom domain setup            | Domain verification/TLS                                 | DNS diagnostics                                                                        | Planned |

V1 theme is logo, colors, type scale, radius, store text, and slug hostname. Validate contrast and sanitize assets/content. Custom CSS, plugins, custom domains, localization, reviews, recommendations, discounts, tax engines, and shipping-rate engines are later.

## Data flow and invariants

Cart is client convenience; server creates authoritative checkout from variant IDs/quantities, rereads price/inventory, and returns differences. A published MerchantProduct controls visibility. Product deletion/archive never breaks historical order snapshots. Cache only public catalogue GETs by merchant/version and purge on product events.

## Acceptance

All business actions are reproducible through API. A stale cart cannot underpay. Cross-tenant slugs/IDs cannot leak. Out-of-stock and price-change handling is explicit. Store is usable by keyboard/screen reader, supports low bandwidth, and never renders card fields.
