# Contributing a payment provider

Read `docs/implementation/phase-3-provider-contract.md` and the canonical provider/security/webhook specifications first. Implement the small `ProviderAdapter` capability surface, keep provider-only data inside the adapter, and return normalized results/errors. Do not add provider names or response fields to canonical Payment, PaymentAttempt, Transaction, Refund, or Order logic.

Credentials must use envelope encryption and just-in-time decryption; never commit fixtures containing secrets. Environment, currency, capability, and account status must be checked before effects. Derive stable provider idempotency from the Yinne attempt/refund ID. A timeout is `unknown`, not failed; do not automatically fail over after submission.

Webhook ingress must verify raw bytes before parsing, enforce timestamp/replay protection, normalize a stable external ID/reference, and pass durable deduplication. Scrub fixtures and logs. Add the common contract tests plus provider-specific tests for success, decline, pending, timeout/reconciliation, refunds, duplicated/out-of-order events, malformed/forged signatures, missing capabilities, environment mismatch, and redaction. Document sandbox setup, supported currencies/regions, API version, provider retry guarantees, webhook configuration, maintainers, and operational runbooks.

Real-money adapters require an independent security/financial-correctness review and must not be represented as complete until their conformance suite and live-provider operational review pass.
