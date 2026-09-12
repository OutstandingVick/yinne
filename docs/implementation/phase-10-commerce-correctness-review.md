# Phase 10 Commerce Correctness Review

MarketplaceListing references canonical Product; it owns only discovery copy, category, lifecycle, rank, eligibility, and moderation evidence. Variant amount/currency, inventory, customer, Order, CheckoutSession, Payment, Refund, and Transaction remain canonical in their existing domains.

Marketplace purchase invokes the Storefront checkout adapter with exactly one merchant and records `channel: marketplace` plus the listing ID in checkout metadata. The existing Checkout confirmation path creates the canonical Order, decrements inventory under its established concurrency controls, creates the canonical Payment, and emits existing purchase events. Marketplace adds no duplicate order, payment, transaction, inventory, or purchase event.

Product changes propagate immediately because public projection joins canonical products/variants. Listing overrides cannot affect payable amount. A listing becoming suspended prevents new handoffs; an already-created checkout follows canonical expiry and validation policy. No Marketplace commission is calculated because execution, reconciliation, legal, and accounting design is not yet approved.
