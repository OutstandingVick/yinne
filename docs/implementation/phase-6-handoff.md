# Phase 6 Operations + Invoicing handoff

## 1. What was implemented

Canonical multi-location operations and Invoice collection now compose with existing Commerce,
Checkout, Payments, Transactions, events, webhooks, and Worker infrastructure.

## 2. Location architecture

The existing tenant-owned Location is the single operational node for merchants, inventory, orders,
stores, employee scope, and invoices; Phase 6 adds code, address, version, and constrained type/status.

## 3. Location lifecycle

Active may become inactive or archived, inactive may reactivate or archive, and archived is terminal.
Archival is blocked by an active Store or unpaid Order.

## 4. Employee model

Employee identity is an Organization Member with a staff profile and existing User; no duplicate
employee/account table was introduced.

## 5. Location assignment model

Existing Role Assignments connect active members and roles to active Location scopes. Assignment is
idempotent; removal, assignment, and resulting access are audited.

## 6. Location-scoped RBAC

New `locations:*`, `employees:*`, and `invoices:*` permissions use organization, merchant, and
location scope checks plus forced database RLS.

## 7. Inventory/location integration

Inventory remains canonical by Product Variant and Location. Phase 6 reads this relationship and does
not copy stock into Location or Invoice records.

## 8. Order/location integration

Orders retain their canonical Location. Location archival checks unpaid Orders, and Invoice collection
creates its Order with the Invoice's locked Location.

## 9. Storefront/location integration

Storefront continues using its active default Location for stock and fulfillment. Location archival
protects that configuration.

## 10. Operations dashboard

Locations and Employees pages expose real multi-location data, types, lifecycle states, timezones,
profiles, roles, and scopes.

## 11. Invoice model

Invoice is a tenant/environment receivable linked to Merchant, Customer, optional Location, and later
Checkout Session, Order, and Payment. Amounts are integer minor units.

## 12. InvoiceItem model

Invoice Items snapshot description, quantity, unit amount, total, currency, and optional canonical
Product/Variant references.

## 13. Invoice numbering

An atomically locked counter allocates `INV-YYYY-NNNNNN` numbers per organization, environment, and
year only when a draft is issued.

## 14. Invoice state machine

Canonical states are draft, open, paid, and void. Paid and void are terminal; overdue is derived from
open plus due date.

## 15. Draft/issue/void behavior

Draft economic data is editable. Issue locks it, assigns a number and public capability; draft/open
may be voided while paid/void reject further transitions.

## 16. Public Invoice architecture

A 256-bit bearer capability resolves through a fixed-search-path database function. Only a SHA-256
digest and diagnostic prefix persist, and the public projection is allow-listed.

## 17. Checkout integration

Public collection invokes the existing Checkout service and creates a collection Order from locked
Invoice facts. No second provider or payment execution path exists.

## 18. Payment reconciliation

Payments Core checks Invoice amount/currency and atomically attaches successful Payment, Order, and
timestamps exactly once; failures remain open and pending remains unresolved.

## 19. API operations

REST operations cover Location CRUD/lifecycle, Employee list/detail/assignment, Invoice
create/list/detail/update/issue/void, and secure public view/pay.

## 20. SDK changes

The TypeScript SDK exposes the private Operations/Invoice operations and public Invoice retrieval and
collection, including idempotency headers.

## 21. OpenAPI changes

The validated OpenAPI 3.1 contract documents 68 operations, new schemas, permissions, error behavior,
and public-security overrides.

## 22. Events/webhooks

Location, Employee assignment, and Invoice lifecycle events use the existing transactional outbox and
webhook delivery pipeline.

## 23. Audit logs

Every effective lifecycle or assignment mutation records actor, request, aggregate, version, action,
and safe metadata in the existing append-only audit system.

## 24. Seed changes

Repeatable Acme Coffee fixtures contain four Locations, twelve members with scopes, and draft, open,
derived-overdue, void, and paid Invoices with deterministic capabilities.

## 25. E2E golden paths

Five Phase 6 Chromium paths verify operations visibility, all Invoice states, unknown-token denial,
successful hosted collection, and duplicate-payment prevention after paid.

## 26. Security findings

PASS: tenant isolation, RLS/grants, scoped RBAC, digest-only capabilities, non-disclosing public
errors/projections, lifecycle locks, and amount/currency reconciliation have no release blocker.

## 27. Financial-correctness findings

PASS: server-derived integer totals, immutable snapshots, concurrency-safe numbers, terminal states,
canonical Payment/Transaction evidence, and atomic reconciliation preserve one source of truth.

## 28. Operations-correctness findings

PASS: Location ownership is canonical across Inventory, Orders, Storefront, employees, and Invoices;
lifecycle and assignment rules prevent inconsistent new work.

## 29. UX/accessibility findings

PASS: semantic headings/tables, labelled native controls, status text, clear minor-unit formatting,
busy/error feedback, and non-color-only public completion states cover the scoped paths.

## 30. Known limitations

Mock is the only provider; public rate limiting is deployment-local; capabilities do not auto-expire;
full payment only; public raw URLs are recoverable only when first issued.

## 31. Deferred items

Subscriptions, recurring revenue, partial payment, credits, tax/VAT, accounting, dunning, PDFs, ERP,
payroll, suppliers, transfers, shipping, terminals, real PSPs, and advanced analytics remain deferred.

## 32. ADRs

The Phase 6 plan records the decisions to reuse Location and membership/RBAC, model Invoice separately
from Order, derive overdue, store capability digests, and collect only through Checkout/Payments.

## 33. Exact run commands

Run `pnpm install`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:check`, `pnpm format:check`,
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`,
`pnpm openapi:validate`, `pnpm build`, and `pnpm --filter @yinne/worker start`.

## 34. Recommended next phase

Proceed to Subscriptions & Recurring Revenue by composing Invoice, Checkout, Payments Core, provider
verification, Transactions, events, and Worker scheduling without introducing a parallel payment rail.

PHASE 6 COMPLETE — READY FOR SUBSCRIPTIONS & RECURRING REVENUE
