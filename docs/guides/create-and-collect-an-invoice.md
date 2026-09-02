# Create and collect an invoice

Invoices are receivables, separate from Orders and Payment Links. An Invoice becomes a collection
Order only when its customer enters Checkout, preserving one payment pipeline and one financial
source of truth.

## Create a draft

Open **Invoices**, choose **Create invoice**, then select the Merchant, Customer, and Location. Add
one or more line items in integer minor units and an optional due date or memo. Currency is immutable
after creation, and Yinne snapshots each description, quantity, and price for auditability.

API clients call `POST /v1/invoices` with a unique `Idempotency-Key`. A retry with the same key and
payload replays the original result; reusing the key with different input is rejected.

## Issue and share

Review the draft and choose **Issue invoice**. Issuance locks the economic fields, allocates the next
organization-and-environment invoice number, and returns a one-time public URL. Copy that URL at
issuance time: only its SHA-256 digest and a short diagnostic prefix are stored.

The public URL is a bearer capability. Share it only with the intended customer and do not place it
in logs, analytics events, support tickets, or screenshots. Unknown, draft, and void capabilities all
return a generic not-found response.

## Collect payment

The customer opens the capability URL and chooses **Pay invoice**. Yinne creates a hosted Checkout
Session, collection Order, and Payment using the Invoice's locked total, currency, Merchant,
Customer, and Location. Payment finalization atomically records the successful Payment and moves the
Invoice from open to paid. A paid or void Invoice cannot start another collection.

`overdue` is a display state derived when an open Invoice passes its due date; it is not a separate
stored lifecycle status. Phase 6 supports full payment only—partial payments, credits, reminders,
tax engines, recurring invoices, and PDF generation are intentionally deferred.

## Void safely

Draft and open Invoices may be voided. Paid and already-void Invoices are terminal. Voiding disables
public payment immediately while retaining the record, line-item snapshot, audit trail, and events.

## Reconcile and support

Use the Invoice detail to correlate `invoice_id`, `checkout_session_id`, `order_id`, and `payment_id`.
Search logs by request or aggregate identifiers rather than by public token. If Checkout reports a
successful Payment but the Invoice is not paid, treat collection as incomplete and investigate the
transaction before retrying anything manually.
