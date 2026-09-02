# Create and send an invoice

Create a draft in **Invoices**, choose its canonical Customer, Merchant, and optional Location, then
add line-item snapshots in integer minor units. Yinne derives the total on the server. Issue the draft
to allocate a concurrency-safe number and receive a one-time public URL; copy it immediately because
only a digest is stored.

Draft and open Invoices can be voided. Paid and void are terminal, while overdue is derived from an
open Invoice's due date. See [the complete collection guide](./create-and-collect-an-invoice.md).
