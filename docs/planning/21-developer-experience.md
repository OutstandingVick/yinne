# Developer experience and reference applications

## First-run contract

Prerequisites: Docker and Node LTS/pnpm only. A documented bootstrap copies example environment, starts PostgreSQL/web/worker, migrates, seeds Acme, and prints dashboard/storefront/docs URLs plus test credentials. Health check distinguishes database, migrations, worker lag, and configuration. No provider credential is needed.

## TypeScript SDK

```ts
import { Yinne } from "@yinne/sdk";

const yinne = new Yinne({
  apiKey: process.env.YINNE_API_KEY!,
  // baseUrl may point to a self-hosted instance
});

const customer = await yinne.customers.create({ name: "Jane Doe", email: "jane@example.com" });
const checkout = await yinne.checkout.sessions.create({
  customer_id: customer.id,
  merchant_id: "mer_01",
  items: [{ variant_id: "var_01", quantity: 1 }],
});
```

Resource groups mirror REST: organization, members, merchants, locations, customers, products, inventory, orders, checkout.sessions, payments, refunds, transactions, paymentLinks, providerAccounts, events, webhooks.endpoints/deliveries, apiKeys, analytics, auditLogs.

Generated OpenAPI types are wrapped by a small handwritten client. Inputs/outputs are exact types; unknown additive response fields are tolerated. Async iterators and page objects support pagination. YinneError exposes type/code/message/param/requestId/status/retryable/details. Retry GET/HEAD and rate-limit/unavailable failures with jitter; never retry unsafe writes unless an idempotency key exists. SDK can auto-generate keys for supported financial commands and expose withIdempotencyKey for deterministic workflows.

Webhook helper takes raw bytes, signature header, secret(s), tolerance, and clock; returns typed event or SignatureVerificationError. It does not parse before verify.

Naming uses nouns/resources and action methods only for commands: create, retrieve, list, update, archive, confirm, cancel, fulfil, refund, replay. SDK semver follows behavior; generated schema compatibility is CI-tested against server.

## Documentation inventory

- Overview/architecture and capability truth table
- 10-minute local quickstart and golden-path tutorial
- Authentication, environments, pagination, idempotency, errors, rate limits
- Resource guides with state machines
- API reference generated from OpenAPI
- SDK reference/examples
- Webhook verification, retry, replay, local listener
- Provider adapter authoring/conformance
- Self-host install, configuration, upgrade/migrations, backup/restore, observability
- Security/compliance boundary and private reporting
- Contribution guide, changelog, roadmap, release support matrix

## Reference application architecture/page inventory

- Dashboard pages are fully enumerated in Sales OS spec.
- Storefront: home, catalogue, product, cart, checkout handoff, success; later search/account.
- Hosted checkout: session summary, customer/delivery capture, provider handoff, processing, success, recoverable failure, expired/cancelled.
- Marketplace (later): home/search/category, listing, merchant profile, marketplace checkout handoff, moderation admin.
- Docs: landing, quickstart, concepts, guides, API/SDK reference, adapters, self-hosting, security, changelog.

Apps consume contracts/SDK; Dashboard may use same-origin BFF only for session/CSRF. No app imports database or provider implementation.

## Developer acceptance

Fresh setup in under 15 minutes; OpenAPI lint/diff and SDK compile/examples pass; error includes request ID; webhook CLI/example proves raw-body verification; migration from previous release and rollback/restore procedure pass; mock scenarios are deterministic under parallel tests.
