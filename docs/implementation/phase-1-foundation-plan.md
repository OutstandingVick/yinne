# Phase 1 — platform foundation plan

Status: approved planning translated into an implementation gate. This document was created before production code.

## Inherited decisions

- TypeScript modular monolith; HTTP and worker modes share domain/application packages.
- pnpm workspaces and Turborepo; dependencies point inward and cross-module access uses application ports.
- Next.js reference application and REST `/v1`; OpenAPI-compatible Zod contracts.
- PostgreSQL 16 is authoritative; Drizzle owns typed schema and reviewed SQL migrations.
- Shared-schema multi-tenancy with a direct `organization_id`, composite ownership constraints, mandatory `TenantContext`, and PostgreSQL RLS as defense in depth.
- UUIDv7 database IDs. API resource prefixes are a presentation concern, not stored IDs.
- Auth.js with a local development credentials bootstrap and an OIDC-ready boundary. Passwords, when enabled, use Argon2id.
- Predefined Owner, Admin, Finance, Manager, Staff, Analyst, and Developer roles. Role assignments can be organization-, merchant-, or location-scoped. No custom-role API in V1.
- API keys are 256-bit random, test/live-bound, scope-limited, shown once, stored as prefix plus keyed hash, revocable, and never logged.
- PostgreSQL transactional events/outbox and Graphile Worker. No Redis, Kafka, microservices, or Kubernetes.
- Audit records and domain events are distinct append-only records.
- Apache-2.0; deterministic Acme Coffee development data; explicit TEST MODE presentation.

## Minor ambiguity resolutions

1. Phase 1 uses `apps/dashboard` as the Next.js HTTP deployment for both dashboard pages and `/v1` route handlers. This follows the documented “one application image” and same-origin BFF allowance without inventing a second incomplete API app. Route/application boundaries remain package-based, so a later deployment split is mechanical.
2. The Phase 1 migration includes platform entities plus `merchants` and `locations`, because membership scope and the approved tenant hierarchy require real foreign-key targets. It excludes customer, catalogue, inventory, order, checkout, payment, refund, provider-account, and delivery tables until their modules are implemented.
3. The application connects as a non-owner, non-superuser `yinne_app` role so forced RLS is meaningful. Migrations use a separate privileged URL. Organization bootstrap sets the proposed organization UUID as transaction tenant context before inserting it and its Owner membership.
4. Phase 1 rate limiting is an in-process bounded limiter behind a port. It is correct for a single instance and clearly documented; distributed enforcement is deferred until deployment scale requires shared infrastructure.

These are implementation details, not changes to product architecture; no ADR is required unless a spike invalidates them.

## Exact scope

- Repository/workspace tooling, shared TypeScript/lint/format/build/test commands and dependency-boundary checks.
- Config validation and redacted structured logging.
- UUIDv7/request ID primitives, API errors, pagination, environment mode, and idempotency-record storage primitive.
- Users; organizations; members; predefined roles/permissions; role assignments; minimal merchants/locations.
- Tenant transaction/repository pattern and forced RLS policies.
- Auth.js credentials development login, secure JWT session, protected dashboard, and server-validated active organization.
- RBAC policy engine and meaningful organization/location permission tests.
- Foundational `/v1` endpoints: health, me, organization read/update, members read/invite/role update, roles list, API-key list/create/revoke, events read, audit read.
- API-key authentication, scopes, revocation, last-used update, and test/live separation.
- Transactional audit/event/outbox writes for organization, membership, and API-key actions.
- Graphile Worker startup/task registry and outbox-dispatch foundation. Public webhook delivery remains unavailable.
- Dashboard shell and working Home, Organization, Team, API Keys, Events, Audit, and Profile pages. All other module navigation is visibly “Coming later.”
- Phase 1 Acme Coffee organization, merchant, four locations, and seven role-representative users. No commerce/financial demo rows.
- Docker PostgreSQL, migrations/seed, CI, open-source files, tests, and run documentation.

## Package/app structure

```text
apps/
  dashboard/       Next.js dashboard and /v1 HTTP routes
  worker/          Graphile Worker process
packages/
  core/            IDs, environment mode, shared types
  config/          validated environment configuration
  database/        Drizzle schema/client/migrations/tenant transaction
  auth/            password, API-key, principal and session-independent auth logic
  contracts/       Zod request/response and API error/pagination contracts
  events/          typed envelopes, transactional publisher/outbox port
  ui/              accessible Phase 1 components and semantic tokens
modules/
  organizations/   organization/member/RBAC application services and repositories
tooling/           shared TypeScript/ESLint configuration and boundary rules
docker/            PostgreSQL initialization
```

## Database entities

`users`, `organizations`, `organization_members`, `roles`, `permissions`, `role_permissions`, `role_assignments`, `merchants`, `locations`, `api_keys`, `audit_logs`, `events`, `outbox_messages`, and `idempotency_records`.

All tenant child tables have non-null organization ownership and composite ownership constraints where a child references another tenant row. Mutable records have `created_at`/`updated_at`; audit/events/outbox are append-oriented. Organizations close rather than delete; members and keys revoke/deactivate; seeded roles/permissions are immutable through Phase 1 APIs.

## Security requirements

- Server-derived organization/environment; no client-trusted tenant context.
- Non-superuser application DB role, forced RLS, transaction-local tenant setting, and tenant integration tests.
- Argon2id local passwords; Auth.js secure HttpOnly cookies and server-side session validation.
- HMAC-SHA256 API-key digest with a required server pepper, constant-time comparison, prefix lookup, 256-bit secret, no plaintext persistence.
- Central permission checks; no role-name branches in route handlers.
- Zod validation for environment, headers, query, body, IDs, and pagination.
- Request IDs and normalized errors without stack/secret leakage; log redaction.
- Same-origin mutation checks/CSRF protection for session requests, strict CORS allowlist, secure headers, bounded request/rate limits.
- Test/live credentials and resources are separate and visibly labeled.

## Test strategy

- Unit: UUIDv7/prefixed presentation, validators, API errors, pagination, permission resolution, password and API-key hashing/verification, event envelope.
- PostgreSQL integration: migrations, RLS cross-tenant denial, scoped RBAC, transactional audit/event/outbox, API-key lifecycle and absence of plaintext.
- HTTP integration: request IDs/error shape, session/API-key authentication, tenant resolution, authorization and revocation.
- Playwright smoke: local sign-in → dashboard → organization/team → create and revoke test key.
- Build gates: format check, ESLint/boundaries, TypeScript, unit/integration tests, Next production build, worker build.

## Acceptance criteria

- Clean documented setup installs, starts PostgreSQL, migrates, seeds, and runs dashboard/worker.
- Authenticated user resolves only valid memberships and can switch only to organizations they belong to.
- Organization A cannot retrieve/mutate Organization B through API, repository, list/count, or direct app-role SQL.
- Predefined permission boundaries and scope inheritance pass tests.
- API key secret appears exactly once, plaintext is absent from database/log/audit/event, valid scope authenticates, revoked/wrong-environment key fails.
- Administrative mutations atomically write domain state, audit record, event, and outbox record.
- Worker starts/stops gracefully and consumes only registered jobs.
- Dashboard tells the truth: foundation pages work; financial/commerce pages contain no fake data and are marked unavailable.
- Root lint, typecheck, tests, and build pass; CI repeats them with PostgreSQL.

## Explicit exclusions

No checkout, payments, attempts, links, refunds, payouts, providers, storefront, marketplace, subscriptions, invoices, capital, advanced analytics, inventory workflows, multi-location analytics, webhook delivery product, provider-secret UI, or financial seed data. Structural event/outbox/idempotency primitives do not claim those products are implemented.
