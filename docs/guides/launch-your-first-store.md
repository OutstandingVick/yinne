# Launch your first Store

Yinne's Storefront is a reference shop over the same Products, Inventory, Checkout Sessions, Orders, Payments, and Transactions exposed by the API. It does not create a second commerce system.

## 1. Prepare the catalogue

Sign in to the dashboard, open **Products**, and create or activate at least one Product with an active Variant priced in your organization's currency. Open **Inventory** and add stock at the Store's default Location. Untracked Variants are treated as available; tracked Variants need sufficient stock.

## 2. Configure the Store

Open **Storefront → Store settings**. Choose a public name, lowercase hyphenated slug, description, optional HTTPS logo, and contact details. Yinne accepts constrained appearance tokens only; arbitrary HTML, CSS, and JavaScript are intentionally unsupported.

## 3. Publish products

Open **Storefront → Manage catalogue** and publish the Products customers should discover. Publication does not copy prices or stock. Public pages read canonical active Variants and availability at request time. Draft, archived, and unpublished Products return no public detail.

## 4. Activate and share

Activate the Store after it has a publishable Product. Its URL is:

```text
http://localhost:3000/store/<your-slug>
```

The included seed is available at `http://localhost:3000/store/acme-coffee`. Pausing removes the Store from public resolution without deleting configuration. Archival is terminal.

## 5. Test the buyer path

Browse a Product, select an available Variant, add it to the cart, and continue to secure checkout. The browser cart contains only Variant IDs and quantities. The server rereads publication, price, currency, and Inventory before creating the canonical Checkout Session.

Hosted Checkout collects approved guest details and creates/reuses a canonical Customer. Select a deterministic Mock outcome:

- success creates one paid Order, Payment, charge Transaction, stock movement, events, and confirmation;
- decline keeps the Checkout retryable and does not duplicate the Order;
- pending remains processing until the signed provider webhook resolves it.

Test mode never moves real money and Yinne never asks for card credentials.

## 6. Automate through the API

Use `GET/PATCH /v1/store`, lifecycle endpoints, and Product publish/unpublish endpoints with a scoped API key. Public reads and cart initiation are under `/v1/public/stores/:slug`. The `@yinne/sdk` `storefront` client wraps both sets. Store administration requires `storefront:read`, `storefront:write`, or `storefront:publish` as appropriate.

## Troubleshooting

- **Store unavailable:** confirm it is active in the current test/live environment.
- **Product cannot publish:** activate the Product and at least one same-currency Variant.
- **Cart changed:** return to the Product and choose an available Variant; the server prevented a stale or underpriced checkout.
- **Insufficient inventory:** adjust stock at the Store's default Location.
- **Checkout pending:** keep the hosted page open or deliver the deterministic signed Mock webhook.
