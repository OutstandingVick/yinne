# Phase 4 security review

**Verdict:** PASS — no critical Phase 4 blocker found.

- Public URLs use 256-bit random capabilities rather than database/tenant identifiers. Database resolver functions are `SECURITY DEFINER`, fixed-search-path, read-only, expose only organization/environment/resource IDs, and are executable only by `yinne_app`.
- After capability resolution every detail/mutation runs under the existing forced-RLS tenant and environment context. Foreign authenticated resources remain 404.
- Hosted schemas accept only customer contact details, a bounded flexible minor-unit amount, and test-only Mock scenario. They reject card/bank credentials, floats, arbitrary currency, provider references, state, or redirects.
- Redirects are authenticated-create-only and HTTPS-only, with localhost HTTP allowed for development. Hosted confirmation never accepts or reflects a redirect.
- Tokens and customer PII are absent from events, audit metadata, provider metadata, and response logging. Only token digests/prefixes are stored.
- Public writes are JSON same-origin UI requests, rate limited, capability scoped, and idempotent. Global CSP, frame denial, content-type protection, strict referrer policy, and no-store responses cover hosted pages/APIs.
- RBAC separates Checkout operations from Payment Link management; Staff cannot create arbitrary links. RLS and composite foreign keys enforce tenant ownership below RBAC.

Residual accepted V1 risk: bearer capability URLs may be forwarded by recipients; link deactivation, expiration, use limits, no-referrer token storage, and high entropy are the intended controls. Production custom domains and advanced fraud controls remain out of scope.
