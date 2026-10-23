# Changelog

## 0.1.0

First public release.

- Typed clients for customers, products, inventory, orders, payments, refunds, transactions,
  checkout sessions, payment links, storefront, locations, employees, invoices, subscriptions,
  analytics, capital and marketplace.
- `YinnePublicClient` for keyless public endpoints: stores, payment links, checkout, invoices and
  the marketplace.
- Safe automatic retries with backoff (reads and idempotent writes only), request timeouts and
  `Retry-After` support.
- `YinneApiError` and `YinneConnectionError`, including clear errors for non-JSON responses.
- `paginate()` async iterator for list endpoints.
- Ships ESM, CommonJS and TypeScript declarations; works in Node.js 18+, Bun, Deno and browsers.
