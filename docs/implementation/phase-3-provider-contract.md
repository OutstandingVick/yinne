# Phase 3 provider contract

Providers implement `ProviderAdapter` in `modules/payments/src/provider.ts`; Payments Core never branches on provider response shapes.

## Required capabilities

`payment.create`, `payment.retrieve`, `payment.refund`, and `webhook.verify` are discoverable strings. Selection rejects disabled, wrong-environment, unsupported-currency, or missing-capability accounts before effects. A submitted attempt is never automatically failed over to another provider.

## Operations

- `executePayment`: receives attempt ID, bigint amount, ISO currency, attempt-derived idempotency key, and provider-scoped confirmation input. Returns `pending`, `succeeded`, `failed`, or `unknown`, stable reference, safe metadata, and optional normalized error.
- `retrievePayment`: reconciles pending/unknown evidence without guessing.
- `refundPayment`: receives refund/payment references, bigint amount/currency, refund-derived idempotency key, and provider-scoped input.
- `verifyWebhook`: verifies raw bytes, signature, timestamp/replay window, then returns a stable external event ID, normalized kind/reference/time, and safe data.

Errors are restricted to `declined`, `invalid_request`, `unsupported`, `unavailable`, `timeout`, `conflict`, and `unknown`, with retryability and a safe message. Adapters must not return credentials, authorization headers, raw card data, or unsafe raw error bodies.

## Deterministic Mock Provider

Mock is test-only and declares all four Phase 3 capabilities. References derive from attempt/refund UUIDs. Payment scenarios are `success`, `failure:declined`, `pending:then_success`, `pending:then_failure`, and `timeout:then_success`; refund scenarios are `refund_success` and `refund_failure`. There is no randomness or global “next result.”

Mock inbound events use `v1=HMAC-SHA256(secret, timestamp + "." + raw_body)`, constant-time comparison, a five-minute window, stable event IDs, and durable account/environment-scoped deduplication. Same ID/same digest is acknowledged; same ID/different digest conflicts.

## Contributor conformance checklist

Every future adapter must pass the reusable provider tests for deterministic idempotency, amount/currency preservation, all normalized outcomes, capabilities, duplicate/out-of-order webhooks, invalid signatures, timeout/unknown reconciliation, refund behavior, environment isolation, and secret/error redaction. Document supported currencies/regions, sandbox behavior, API version policy, webhook setup, credential fields, retry guarantees, and maintainer ownership. Real adapters require a separate security review and may not weaken canonical Payment, Attempt, Transaction, Refund, or Order semantics.
