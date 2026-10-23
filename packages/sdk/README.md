# @yinne/sdk

The official TypeScript SDK for the [Yinne](https://www.yinne.store) commerce and payments API:
orders, inventory, payments, refunds, payment links, checkout, invoices, subscriptions, analytics
and more. Works in Node.js 18+, Bun, Deno and the browser.

```bash
npm install @yinne/sdk
```

## Quick start

```ts
import { YinneClient } from "@yinne/sdk";

const yinne = new YinneClient({ apiKey: process.env.YINNE_API_KEY! });

const { data: orders } = await yinne.orders.list({ financial_status: "paid", limit: 20 });

const link = await yinne.paymentLinks.create({
  kind: "fixed",
  merchant_id: "…",
  location_id: "…",
  name: "Coffee subscription",
  currency: "NGN",
  amount: "1250000", // minor units: ₦12,500.00
});
```

Create API keys in the dashboard under **Developer → API keys**. Keep secret keys on the server.

## Options

```ts
new YinneClient({
  apiKey: "yk_test_…",
  baseUrl: "https://app.yinne.store", // default
  timeoutMs: 30_000, // abort slow requests
  maxRetries: 2, // retry 429/5xx/network failures on safe requests
});
```

Retries only apply to reads and to writes that carry an idempotency key, so a request can never be
applied twice. Writes that create money movements accept `{ idempotencyKey }`; one is generated
for you when omitted.

## Errors

```ts
import { YinneApiError, YinneConnectionError } from "@yinne/sdk";

try {
  await yinne.orders.create(input, { idempotencyKey: "order-1042" });
} catch (error) {
  if (error instanceof YinneApiError) {
    console.error(error.status, error.code, error.message, error.requestId);
  } else if (error instanceof YinneConnectionError) {
    console.error("Network problem or timeout:", error.message);
  }
}
```

## Pagination

```ts
import { paginate } from "@yinne/sdk";

for await (const customer of paginate(yinne.customers.list, { limit: 100 })) {
  console.log(customer.name);
}
```

## Public client (headless storefronts)

`YinnePublicClient` calls Yinne's public endpoints and needs no API key, so it is safe in the
browser.

```ts
import { YinnePublicClient } from "@yinne/sdk";

const shop = new YinnePublicClient();
const store = await shop.stores.retrieve("acme-coffee");
const results = await shop.marketplace.search({ q: "espresso" });
const session = await shop.paymentLinks.open("plink_token");
window.location.href = session.checkout_url ?? "/"; // hosted checkout
```

## Resources

`customers`, `products`, `inventory`, `orders`, `payments`, `refunds`, `transactions`,
`providerAccounts`, `checkoutSessions`, `paymentLinks`, `storefront`, `locations`, `employees`,
`invoices`, `subscriptionPlans`, `subscriptions`, `analytics`, `capital` and `marketplace`. Every
method is fully typed; see the generated `.d.ts` for request and response shapes.

## License

Apache-2.0
