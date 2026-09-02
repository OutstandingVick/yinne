# Phase 5 commerce correctness review

**Verdict:** PASS.

StoreListing is a publication reference to canonical Product, not a copied catalogue. Publication requires an active Product, active same-currency Variant, and valid Store; unpublication leaves historical Checkout/Order snapshots intact. Catalogue version increments atomically with publication changes.

Availability is derived at the Store default Location and exposes only coarse state. Checkout revalidates the entire cart and rejects missing, inactive, unpublished, cross-currency, duplicate, or insufficient-stock items. The cart is single-Store, contains only Variant IDs/quantities, persists across failures, and clears after receiving a canonical Checkout URL.

Store lifecycle is controlled; activation requires a published listing, pause is reversible, archive terminal. Merchant dashboard orders retain Storefront channel metadata through Checkout into the canonical Order path.
