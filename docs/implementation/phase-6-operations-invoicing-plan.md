# Phase 6 Operations + Invoicing implementation plan

**Date:** 2026-09-02  
**Status:** Approved implementation baseline

## Architecture decisions

Operations extends the existing canonical `Location`; Products remain organization-owned, Inventory remains Variant/Location-specific, Orders retain an immutable fulfilment Location after creation, and Storefront keeps one configurable active default Location. “Employee” is not a new identity table: canonical planning explicitly defines it as `OrganizationMember` plus `staff_profile` and scoped `RoleAssignment`. Employee/Location assignment is therefore represented by location-scoped role assignments, preserving the centralized additive RBAC model.

Invoice is a distinct environment-bound receivable, not an Order, Checkout Session, Payment, Transaction, or Payment Link. It snapshots merchant-defined line items and a Customer obligation. Collection uses an unguessable Invoice capability to create/reuse canonical Checkout; Checkout creates a non-inventory collection Order; Payments Core remains the only execution and financial-finalization boundary. Invoice reconciliation is attached to Payments finalization and is replay-safe.

## Locations and operational scope

Location gains a stable organization/Merchant-scoped code, controlled type (`branch`, `store`, `restaurant`, `office`, `warehouse`, `pop_up`, `agent`), controlled status (`active`, `inactive`, `archived`), bounded address/contact metadata, and version. Create/list/retrieve/update plus explicit activate/deactivate/archive operations use `locations:read/write`, audits, events, cursor pagination, and organization RLS.

New activity requires an active Location. Archive is blocked while it is a Store default or has open operational work; history remains. Location identity on an Order is immutable. Inventory adjustment and Order services continue to authorize with the existing location context, preventing request-body substitution for location-scoped actors.

Employee APIs project safe member profile, status, role/scope summaries, and assigned Locations from existing tables. Assignment adds/removes a predefined role at one Location through the established RoleAssignment model; organization-wide roles are not silently narrowed or duplicated. Owner/Admin manage assignment; location-scoped Managers see only resources within their effective scope. Authentication secrets/session internals never enter Employee projections.

Dashboard Operations provides real Location list/detail, filtered Inventory/Orders, assigned employee counts, employee list/detail/access, and basic organization-visible per-Location counts. This is operational filtering, not revenue analytics.

## Invoice model and money rules

`Invoice` owns organization/environment, Merchant, optional Location, Customer, opaque ID, organization/environment-scoped human number, status (`draft`, `open`, `paid`, `void`), currency, server-derived bigint subtotal/total, issue/due/paid/void timestamps, capability digest/prefix, optional Checkout/Order/Payment references, metadata, version, and timestamps. `overdue` is a derived display state when `status=open && due_at<now`; it is not persisted or emitted.

`InvoiceItem` is append-replaceable only while draft and snapshots description, bounded integer quantity, positive bigint unit amount, currency, and derived line total, with optional canonical Product/Variant references. Every line uses Invoice currency. Checked bigint arithmetic prevents overflow. Client totals are never accepted.

Numbers use a row-locked organization/environment/year counter and render `INV-YYYY-NNNNNN`; row count is never used. Draft creation is idempotent and may update Customer, Location, due date, metadata, and the complete item set. Issue locks the Invoice, validates active Merchant/Location and Customer ownership, nonempty positive total and future-or-present due date, assigns number/capability once, freezes financial fields, sets `issued_at`, and emits `invoice.issued`. Issued/paid/void financial snapshots and items are immutable. Only draft may be deleted in a future phase; no deletion is exposed now.

Open Invoice may be voided only before a successful payment. Paid Invoice cannot be voided or edited; reversal remains Refund/Credit Note territory. Due date does not expire payment rights. Each hosted Checkout Session has its normal short expiration and may be recreated while Invoice remains open.

## Public collection and reconciliation

`/invoice/:token` and public APIs resolve only SHA-256 capability digests through a fixed-search-path security-definer resolver, then enter forced tenant/environment RLS. The public projection contains Merchant display name, Invoice number/status/dates, line descriptions/quantities/amounts, currency/total, and minimally masked Customer name; it excludes tenant IDs, metadata, private contact data, provider evidence, audits, and digests.

Pay action locks the open Invoice and creates/replays one canonical Checkout Session using a Commerce collection line for exactly the Invoice total. It passes `channel=invoice` and `invoice_id` metadata; no partial amount is accepted. Checkout expiration permits a new session, while active processing/completed sessions are reused. Payment success locks and reconciles the matching Invoice in the same financial finalization transaction, sets paid references/time exactly once, and emits `invoice.paid`. Failure leaves it open; pending leaves it open until verified provider finalization. Duplicate client/provider delivery creates no duplicate Invoice, Order, Payment, Transaction, or paid transition.

## API, SDK, events, and permissions

Authenticated APIs cover Location CRUD/lifecycle; safe Employee list/retrieve and Location assignment; Invoice create/list/retrieve/update, issue, and void. Public APIs cover Invoice view and Checkout initiation. Financially meaningful creates/issues/payment initiation require idempotency.

SDK groups are `locations`, `employees`, and `invoices`; OpenAPI 3.1 documents all implemented schemas, filters, idempotency, public security overrides, and minor-unit strings. New permissions are `employees:read/write` and `invoices:read/write/issue/void`, assigned conservatively: Finance manages/issues/voids Invoices; Manager creates/issues but does not void; Staff reads scoped Invoices; Analyst reads; Developer reads in test tooling contexts.

Events are `location.created|updated|activated|deactivated|archived`, `employee.location_assigned|location_unassigned`, and `invoice.created|updated|issued|paid|voided`. Stable public webhook projections reuse atomic event/outbox/delivery recording. Event/audit payloads omit capability material and Customer PII.

## Security, tests, and acceptance

All new tenant rows use composite ownership, indexes, least-privilege grants, forced RLS, and test/live predicates where applicable. Inputs are strict/bounded; public tokens are 256-bit; URLs/redirects follow Phase 4 rules; descriptions render as text; foreign resources collapse to 404. Authorization is checked at application level with organization/Merchant/Location context in addition to RLS.

Unit tests cover Location states/types, scoped assignments, Invoice arithmetic/state/derived overdue/number format/void rules. PostgreSQL tests cover RLS, cross-tenant and cross-location substitution, active-Location rules, number concurrency, draft freeze, item immutability, issue/idempotency, capability access, Checkout creation, success/failure/pending reconciliation, and event/outbox atomicity. API/browser tests cover owner operations, scoped manager denial, Location Inventory, Invoice success, failure retry, pending webhook, invalid/draft/void/paid public states, and Phase 1–5 regression.

Acceptance requires real multi-location management without catalogue duplication and one Invoice golden path yielding exactly one canonical Checkout, Customer-linked collection Order, Payment, charge Transaction, paid Invoice, events/outbox/webhook rows, with unchanged counts on replay. Formatting, lint, typecheck, OpenAPI, migrations from Phase 5/clean DB, repeatable seed, DB checks, all tests/builds, and Worker startup/job/graceful shutdown must pass.

## Explicit exclusions

Payroll, employee HR records, custom roles, location hierarchy/transfers, terminals, advanced analytics, accounting/double entry, taxes/VAT, ERP, purchase orders/suppliers, shipping logistics, partial Invoice payment, credit notes, dunning, subscriptions, marketplace, capital intelligence, real PSPs, and automated overdue processing remain out of scope.
