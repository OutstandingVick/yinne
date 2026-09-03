# Phase 7 financial correctness review

Prices and snapshots use checked BigInt minor units and ISO currency. A billed period creates one
canonical Invoice with immutable line/period terms, then executes only through Checkout and Payments
Core. Successful Payment/Transaction evidence is required before renewal success and period advance.
Failure leaves the receivable open; pending is not treated as success.

Existing subscriptions never inherit later Price changes. Retry reuses the same period Invoice.
Result: PASS for deterministic Mock test mode; real unattended charging remains unavailable.
