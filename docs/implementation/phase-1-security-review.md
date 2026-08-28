# Phase 1 security review

Review date: 2026-08-28

## Scope and method

The review traced session and API-key authentication into tenant resolution, RBAC, Drizzle queries, audit/event writes, outbox enqueue, and worker execution. It inspected migrations and grants, exercised the restricted database roles, ran cross-tenant and unauthorized-role tests, inspected persisted API-key/audit data, tested invalid/revoked/mode-mismatched keys, and checked the rendered application and browser console.

## Findings fixed

1. **Graphile queue privilege separation — high.** The initial worker used `yinne_app`; Graphile's private-table RLS rejected it. The final implementation provisions a dedicated non-superuser `yinne_worker` role, grants it only Graphile schema access, and uses a fixed-purpose security-definer enqueue function that verifies organization, environment, outbox ownership, event mode, and dispatch state. The task's domain update remains on the tenant-scoped application connection. Re-test: jobs complete successfully with zero residual queue rows.
2. **API response convention drift — medium.** Raw Drizzle objects would serialize camelCase fields. A recursively tested boundary serializer now produces the approved snake_case responses while preserving Date values.
3. **Production script policy — medium.** The initial static CSP allowed development script exceptions everywhere. Middleware now generates a per-request nonce and `strict-dynamic`; `unsafe-eval` is development-only. Frame, object, base URI, form action, MIME, referrer, permissions, opener, and production HSTS controls are set.
4. **Authentication abuse control — medium.** API routes were rate-limited but the Auth.js POST route was not. It now has a bounded five-minute authentication bucket and returns the canonical 429 error shape.
5. **Organization switching — medium.** Active tenant selection now validates the requested organization against server-side membership before writing an HttpOnly, SameSite cookie. A forged cookie safely falls back to a real membership.
6. **Pagination validation — low.** Malformed event/audit cursors could reach the database as invalid dates, and descending pagination used the wrong comparator. Invalid cursors now return a normalized 400 and the query uses the correct descending boundary.
7. **Unnormalized scope failure — low.** A missing non-organization scope ID raised a generic error. It now returns a canonical parameter-specific 400.

## Control assessment

| Area                   | Result | Evidence                                                                                                                                                          |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL injection          | Pass   | Drizzle/query parameters are used; the worker migration validates the fixed role name and escapes its migration-only password.                                    |
| Tenant isolation       | Pass   | Direct organization keys, composite FKs, forced RLS, non-owner app role, transaction-local settings, and cross-tenant integration test.                           |
| Authorization          | Pass   | Central `can`/`requirePermission`; no route-level role-name shortcuts; restricted-role integration test.                                                          |
| Session handling       | Pass   | Server-side Auth.js validation, HttpOnly/SameSite cookie, production Secure prefix, eight-hour expiry, protected layout.                                          |
| Organization switching | Pass   | Server membership lookup before cookie write; server derives all request context.                                                                                 |
| API keys               | Pass   | 256-bit random secret, environment prefix, HMAC-SHA256 digest with pepper, constant-time comparison, once-only display, revocation and mode checks.               |
| CSRF/CORS              | Pass   | Auth.js protections for auth/server actions; unsafe session mutations require an allowlisted Origin; bearer calls remain explicit credentials.                    |
| XSS/headers            | Pass   | React escaping, nonce CSP, no user HTML rendering, anti-frame/MIME/referrer/permissions/opener headers and production HSTS.                                       |
| Validation/errors      | Pass   | Zod for environment/body/query/path data; typed API errors hide stacks and attach request IDs.                                                                    |
| Secret/log handling    | Pass   | Environment secrets are server-only; Pino redacts authorization, password, digest, hash, and secret paths; database/audit assertions prove API plaintext absence. |
| Test/live isolation    | Pass   | Mode is present in tenant context, keys, events and lookup; mismatches fail; seed refuses live/production; dashboard persistently shows Test Mode.                |
| Queue boundary         | Pass   | Dedicated queue role, tenant-validating enqueue function, typed task payload, retry-capable Graphile Worker and graceful shutdown.                                |

## Residual risks and operational requirements

- Replace all example database passwords, Auth secret, API-key pepper, and seed password outside local development. Run migrations through a protected administrative identity and do not expose it to the application.
- The in-memory limiter is not a distributed denial-of-service control. Put an edge/gateway limit in front of a multi-instance deployment and replace the limiter port before horizontal scale.
- Keep dependency scanning and framework patching active. Next.js is pinned to the patched 15.5.24 line used for this verification.
- `yinne_worker` has PostgreSQL `BYPASSRLS` because Graphile's private tables deliberately have RLS without public policies. It has no grants on Yinne domain tables and uses `yinne_app` for domain updates; preserve that separation.
- Inline CSS is allowed by CSP for current React component styling. Remove `style-src 'unsafe-inline'` when the UI no longer uses style attributes.

No unresolved Phase 1 security blocker remains.
