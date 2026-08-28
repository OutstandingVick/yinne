# Definition of done

## Feature-level contract

A feature is done only when domain invariant/state transition, tenant ownership, permission, API/OpenAPI, validation/error, idempotency decision, database constraint/migration, audit, event/public webhook decision, observability, unit/integration/e2e/security/accessibility tests, documentation, empty/error/loading states, and reality label are complete.

## Major acceptance criteria

### Organization and authorization

- Organization/merchant/location ownership is explicit; foreign IDs cannot be inferred.
- Every route and background job has tenant context.
- Role/location matrix tests and API-key scope/environment tests pass.
- Owner transfer, role change, key create/revoke, and provider changes audit correctly.

### Product, inventory, order

- Product is reusable across store/link/order; history uses immutable snapshots.
- Concurrent stock change cannot produce silent negative inventory.
- Paid order has definitive succeeded payment evidence; cancellation/fulfil/refund transitions are legal.
- Retry/duplicate events create one movement and one derived state change.

### Checkout and links

- Server reprices and reports stale cart changes.
- Session expiry/confirmation races converge; success URL is not payment proof.
- Link status/expiry/usage is checked atomically and parallel use respects limit.
- Anonymous/known customer and failed/retry path are accessible and secure.

### Payment/refund

- Money/currency validates without float.
- One active attempt; provider response normalized; unknown reconciles.
- Duplicate/out-of-order webhook causes no duplicate transaction/effects.
- Multiple partial refunds cannot exceed succeeded payment.
- Success writes transaction, updates payment/order/session/inventory, appends events/outbox atomically.
- Client idempotency returns original response and conflict on changed body.

### Events/webhooks/audit

- Aggregate version prevents duplicate facts; consumer receipt prevents duplicate effect.
- Provider signature is verified on raw body before parse.
- Public signature helper matches fixtures; rotation overlap works.
- Retry schedule, pause threshold, replay generation, delivery logs, SSRF and redaction tests pass.
- Audit is immutable and not confused with domain/public events.

### API/SDK/DX

- OpenAPI lint and breaking-change check pass; every V1 resource has example.
- SDK types compile, pagination/retry/idempotency/error/webhook helpers pass.
- Clean clone to Acme checkout takes under 15 minutes using documented commands.
- Apps exercise public application boundary and contain no private business rules.

### Analytics

- Hand-calculated fixtures match formulas.
- Currency partition, timezone/DST, partial refunds, late events, anonymous share, freshness, and location scope pass.
- No mixed-currency, stale, or planned metric appears without label.

### Security/operations

- Threat model has no unresolved critical/high issue; dependency/secret/SAST/container scans pass.
- No PAN/CVV path, plaintext provider/API/webhook secret, or sensitive log fixture exists.
- CSRF/CORS/CSP/XSS/SQLi/rate-limit/session tests pass.
- Encrypted backup restores to a clean environment; migration forward and documented rollback/restore succeed.
- Worker lease/restart and provider timeout recovery are tested.
- Accessibility scan plus manual keyboard/screen-reader checkout pass.

## Release gates

Two maintainers review financial/security migrations; CI is green; SBOM/provenance/changelog/migration guide are published; demo assertions pass twice including duplicate injection; docs truth table matches exposed features; release candidate survives 24-hour soak with no lost outbox jobs.

Implementation cannot claim V1 complete while any critical criterion is waived. A time-bounded exception needs owner, reason, risk, compensating control, expiry, and public release note; no exception is allowed for tenant isolation, raw card storage, money representation, payment idempotency, or webhook verification.
