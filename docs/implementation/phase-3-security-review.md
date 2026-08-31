# Phase 3 security review

**Review date:** 2026-08-28

## Verdict

No unresolved critical or high-severity Phase 3 finding remains.

## Controls tested/reviewed

- Tenant/resource substitution: composite organization foreign keys, repository predicates, permissions, and forced RLS cover payments, attempts, refunds, transactions, accounts, provider events, and deliveries. Foreign IDs resolve as 404/conflict without cross-tenant data.
- Environment: financial rows/accounts/events/deliveries include environment; RLS and selection bind it; a database check rejects Mock live accounts.
- Amount/currency manipulation: order-linked amount/customer/currency are server-derived. Input has no amount/currency. Money is bigint/minor-unit strings.
- Provider substitution/capability: explicit/default selection requires same tenant/environment, enabled state, capability, and currency. No post-submission automatic failover.
- Inbound forgery/replay: raw-body HMAC-SHA256, timestamp window, strict signature syntax, constant-time comparison, durable external-ID/digest deduplication, and mismatch quarantine/conflict.
- Refund abuse: permission `payments:refund`; payment row lock; positive amount; locked remaining balance; succeeded payment only; immutable unique evidence.
- Idempotency bypass: organization/principal/environment/operation/key scope, SHA-256 body digest, transaction advisory lock, same-response replay, changed-body conflict.
- Metadata/log leakage: bounded metadata, restricted normalized provider data, no raw card fields, provider raw bodies/credentials absent, safe failure messages, webhook endpoint secret column stores ciphertext only.
- Financial evidence: application role has no update/delete privilege on Transactions; database trigger also rejects mutation. ProviderEvent deletion is rejected.

## Failure and abuse injection

Deterministic decline, pending, timeout/unknown, pending-success webhook, duplicate event, invalid signature, expired timestamp, idempotent retry/conflict, full/partial/over refund, and immutable transaction mutation are covered. Database transactions roll back financial, order, inventory, event, outbox, and delivery changes together.

## Accepted limitations

Outbound endpoint administration/delivery transport hardening (DNS pinning, redirect policy, retry scheduler UI) remains limited to the Phase 3 persistence/queue boundary; no external destination is contacted in Phase 3 tests. Before enabling arbitrary production URLs, complete the planned SSRF and encrypted-secret rotation operational review. Mock signing secret is deliberately local/test-only and production rejects Mock live use.
