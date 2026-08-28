# Security and compliance model

Internet clients, dashboard sessions, buyer surfaces, provider ingress, outbound endpoints, workers, database, and secret manager are separate trust zones. STRIDE and abuse-case threat modeling gate implementation.

| Area             | Required controls                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth/session     | Auth.js/OIDC; Argon2id for optional local passwords; HttpOnly Secure SameSite=Lax cookies, rotation, idle/absolute expiry, recent-auth for secrets/ownership; MFA-ready. |
| API keys         | 256-bit random, once-visible, prefix lookup plus Argon2id or peppered HMAC hash; scopes, environment, expiry/revoke; never logged.                                       |
| Tenant/RBAC      | Policies + TenantContext repositories + RLS + composite tenant FKs; foreign resource 404; adversarial tests.                                                             |
| Provider secrets | Envelope encryption, per-record key, version/rotation, just-in-time worker decrypt, audited/redacted access.                                                             |
| Webhooks         | Raw-body HMAC/timestamp/dedupe inbound; signed/retryable outbound; SSRF controls.                                                                                        |
| Input/data       | Zod, allowlists, size/depth limits, parameterized SQL, DB constraints. No PAN/CVV.                                                                                       |
| Browser          | CSRF token/origin checks, strict CORS, CSP nonces, escaping/sanitization, HSTS, frame-ancestors, nosniff, Referrer-Policy.                                               |
| Abuse            | IP and principal/org rate limits, enumeration resistance, bounded inputs, idempotency.                                                                                   |
| Audit            | Append-only actor/action/outcome/request/target, redacted diffs, protected export/retention.                                                                             |
| Supply chain     | Lockfile, update bot, CodeQL, secret scan, SBOM, signed provenance/releases, non-root images, patch policy.                                                              |
| Operations       | TLS, encrypted/tested backups, least DB roles, separated environments, incident/key-rotation runbooks.                                                                   |

Logs/traces exclude credentials, auth headers, webhook bodies, tokens, and unnecessary PII.

## Financial safety

Amounts are bigint minor units using versioned ISO exponent metadata. Validate zero-decimal and three-decimal currencies and provider constraints. Never float. Declare rounding; use half-even only for unavoidable division and deterministic largest-remainder allocations.

Concurrent confirmations/refunds lock/version aggregates. Provider timeout stays unknown. Yinne tracks requests, attempts, provider-reported status, refunds, and immutable operational evidence. Provider owns authorization, movement, fees, settlement, disputes, and balances. Derived sums are not called ledger balances.

## Boundary disclaimer

> Yinne is software infrastructure. It does not itself hold funds, process or store raw card data, provide bank accounts, make loans, offer investment advice, or guarantee compliance with law or network rules. Regulated execution comes from independently configured providers. Operators remain responsible for legal, privacy, security, tax, sanctions, consumer-protection, and provider-contract obligations in their jurisdictions. Seek qualified advice.

This is a boundary, not legal advice or a PCI compliance claim.

## Test/live

Environment participates in every credential, row policy, financial unique key, idempotency scope, provider account, webhook secret, banner, and analytics query. Production rejects mock-live and dev secrets. Seed data is test-only.

Release requires no critical/high threat finding, passing tenant/authorization/secret/replay/SSRF tests, restored backup drill, and practiced key rotation.
