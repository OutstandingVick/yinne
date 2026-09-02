# Phase 6 security review

## Scope

Reviewed the new Location, Employee Assignment, Invoice, public capability, and payment-reconciliation
surfaces against Yinne's tenant boundary, RBAC, credential, audit, and database policies.

## Controls

- Every private service begins inside `withTenantTransaction` and filters by organization.
- RBAC distinguishes location and employee read/write from invoice read/write/issue/void.
- Location-scoped principals receive only assignments matching their authorized location.
- Invoice public URLs contain a 256-bit random bearer secret; persistence stores only SHA-256 digest
  and a short non-secret diagnostic prefix.
- Public lookup returns the same not-found response for absent, draft, and void records.
- Public responses omit internal organization, payment-provider, audit, and token-digest fields.
- Invoice totals and currency are locked before Checkout and checked again during payment finalization.
- Database RLS and grants cover every new tenant table; the capability resolver is security-definer,
  fixed-search-path, read-only in effect, and executable only by the runtime role.
- Lifecycle changes emit an audit record and outbox event within the domain transaction.

## Threat analysis

Cross-tenant identifier substitution is blocked at authorization, query, RLS, and composite-FK
boundaries. Token guessing is impractical at 256 bits, while digest-only storage limits database-leak
impact. A leaked public URL remains a bearer capability; operators must revoke it by voiding the
Invoice. Financial races are bounded by row locks and terminal transitions, and successful Payment
reconciliation checks the exact Invoice amount and currency before marking it paid.

## Residual risks

Phase 6 does not add automated capability rotation or expiry. Rate limiting remains an edge/runtime
deployment concern. Provider chargebacks and refunds are intentionally outside this phase and must
not mutate an Invoice back from paid.

## Result

No release-blocking security issue was found. Operational guidance explicitly treats public Invoice
URLs as secrets and avoids recording them in telemetry.
