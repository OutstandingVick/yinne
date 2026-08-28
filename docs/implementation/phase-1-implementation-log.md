# Phase 1 implementation log

Date completed: 2026-08-28

## Implemented

- pnpm/Turborepo TypeScript modular monolith with root format, lint, typecheck, unit, integration, E2E, build, database, seed, and worker commands.
- Next.js dashboard and same-origin `/v1` HTTP application, plus a separately runnable Graphile Worker process.
- PostgreSQL 16/Drizzle schema and reviewed SQL migrations for users, organizations, memberships, roles, permissions, scoped assignments, merchants, locations, API keys, audit records, events, outbox messages, idempotency records, and seed versions.
- Restricted `yinne_app` runtime role, transaction-local tenant/mode context, composite tenant foreign keys, forced RLS, and security-definer identity lookup functions.
- Auth.js credentials bootstrap for local development, Argon2id password hashes, eight-hour JWT sessions, protected routes, and server-validated organization switching.
- Central scoped RBAC for Owner, Admin, Finance, Manager, Staff, Analyst, and Developer.
- `/v1` health, identity, organization, member/role, API-key, event, and audit endpoints with request IDs, validation, snake-case success bodies, normalized errors, cursor pagination, origin checks, and rate-limit enforcement.
- 256-bit test/live API keys with keyed digests, constant-time verification, once-only display, scopes, revocation, expiry support, last-used timestamps, and no plaintext persistence.
- Atomic domain mutation, audit, event, outbox, and Graphile job enqueue. A dedicated `yinne_worker` connection consumes the typed `outbox_dispatch` job and updates domain state through the tenant-scoped application connection.
- Initial design-system components and an honest merchant shell for Home, Organization, Team, API Keys, Events, Audit Logs, and Profile. Future product navigation is marked `Later` and opens an explicit unavailable page.
- Idempotent, non-production Acme Coffee seed with one organization, one merchant, four locations, and seven role-representative users; no financial rows.
- Docker Compose PostgreSQL, Apache-2.0 repository files, contributor/security guidance, and PostgreSQL-backed GitHub Actions CI.

## Changes or clarifications from the plan

- The plan described the queue as part of the application database connection. Security testing demonstrated that Graphile Worker's private tables intentionally reject that role. The final design therefore uses a dedicated `yinne_worker` connection with access to the Graphile schema only. Application enqueue goes through a tenant-validating security-definer function, and task domain work still uses the RLS-constrained application connection. This is a privilege hardening, not an architecture change, so no ADR was required.
- The `/v1` success serializer was centralized at the HTTP boundary after review found that direct Drizzle results would otherwise expose camelCase fields contrary to the approved API convention.
- A nonce-bearing CSP middleware was added. Development alone permits `unsafe-eval`; production does not. Inline styles remain allowed because Phase 1 components use React style attributes.
- Next.js was updated within the selected major line from 15.5.2 to 15.5.24 after install-time security/deprecation feedback. No framework or architecture decision changed.

## Tests added

- Unit coverage for UUIDv7 IDs, operating credentials, Argon2id/API-key behavior, permission scopes, environment validation, API errors, snake-case response serialization, event envelopes, and worker payload validation.
- PostgreSQL integration coverage for forced RLS/cross-tenant denial and API-key authentication, revocation, plaintext absence, audit recording, unauthorized-role denial, and test/live mismatch.
- Playwright Chromium lifecycle: sign in, resolve/switch organization, view Test Mode, save organization settings, create a once-visible test key, and revoke it.
- Manual in-app browser verification of sign-in, protected shell, active-organization selector, Test Mode banner, planned-module disclosure, and absence of console errors.
- Live worker proof: two queued outbox jobs were consumed successfully and moved to `processed`, leaving zero queued jobs.

## Known limitations

- Rate limiting is intentionally in-process and suitable for the documented single-instance Phase 1 deployment. A shared limiter is required before horizontally scaling the HTTP service.
- Local credentials are a development bootstrap. Production identity-provider/OIDC enrollment and account-recovery workflows are deferred.
- Public webhook endpoints, signatures, retries, delivery history, and replay are not implemented. The durable event/outbox/worker path they will use is implemented.
- API pagination uses timestamp cursors; high-volume resources should move to a composite timestamp-plus-ID cursor when those resources exist.
- The initial UI kit includes only components used by Phase 1; advanced overlays and financial components remain deferred.

## Architecture review

The completed repository was compared against `03-system-architecture.md`, `04-domain-model.md`, `05-database-design.md`, `10-rbac-permissions.md`, `11-security-model.md`, and `21-developer-experience.md`.

- System architecture: preserved the TypeScript modular monolith, PostgreSQL authority, Drizzle migrations, Graphile Worker, REST `/v1`, and inward package boundaries.
- Domain/database: implemented only platform entities plus real merchant/location targets needed by scoped membership; no future financial aggregate was pulled forward.
- RBAC: the seven predefined roles, permission vocabulary, and organization/merchant/location scope matching are centralized and match the approved matrix.
- Security: server-derived tenancy, forced RLS, separate privileged migrations, encrypted/hashed credentials, normalized errors, audit/event separation, test/live mode, secure cookies, and redacted logging are implemented.
- Developer experience: the documented one-command root workflows, PostgreSQL-only local infrastructure, deterministic seed, CI gates, and open-source files are present.

No accidental architectural drift or ADR-worthy change remained after review.

## Deferred items

Checkout, payments, attempts, payment links, refunds, payouts, provider integrations, catalogue/inventory behavior, orders, storefront, marketplace, subscriptions, invoices, capital intelligence, advanced analytics, public webhooks, live financial execution, and financial demo data.

No ADR was created because implementation preserved the approved architecture.
