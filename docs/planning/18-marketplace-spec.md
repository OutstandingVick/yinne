# Marketplace specification — PLANNED V1.3

Marketplace is an optional discovery channel over canonical Products. MarketplaceListing links product + merchant with category, marketplace title/description overrides, moderation state, eligibility evidence, availability, and ranking fields. It never copies prices/variants as source of truth.

Merchant eligibility initially requires active organization/merchant, verified contact, active compatible provider account, published in-stock product, accepted marketplace terms, and no suspension. Listing states: draft, submitted, approved, rejected, suspended, archived. Moderation actions are audited with reason codes and appeal seam.

V1.3 minimum: public browse/search/category, merchant profile, listing detail, canonical checkout reuse, basic admin moderation, exact/simple text search in PostgreSQL, and manual category taxonomy. Reviews, recommendations, personalization, sponsored ranking, cross-merchant cart, and automated moderation are later.

Checkout is single merchant. Marketplace fee architecture reserves an explicit fee policy snapshot on order/payment, but no fee is charged until provider split/settlement capability and legal/accounting design exist. Never calculate a fee without execution/reconciliation evidence.

Acceptance: product updates propagate; listing overrides cannot alter payable amount; suspended listing cannot start new checkout; moderation/eligibility is explainable; search cannot leak drafts; Marketplace disabled means no routes/jobs/navigation.
