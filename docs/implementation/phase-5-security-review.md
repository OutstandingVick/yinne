# Phase 5 security review

**Verdict:** PASS — no critical/high Phase 5 finding remains.

- New tables have organization ownership, composite foreign keys, least-privilege grants, and forced RLS; Store additionally binds environment.
- The fixed-search-path slug resolver returns only tenant/environment/resource coordinates and only for active Stores. Detail reads then run under the application role and tenant transaction.
- Public projections are explicit allow-lists: no organization, Merchant, Location, SKU, metadata, exact stock, audit, customer, token digest, or provider fields.
- Inactive/foreign/unpublished resources return the same 404. Public writes are rate-limited, schema/body constrained, same-origin protected by the existing API boundary, and idempotent.
- Slugs reject reserved routes. Theme tokens are constrained; display text is escaped by React; image/logo URLs require HTTPS. Arbitrary HTML/CSS/JavaScript is absent.
- Cart input is untrusted and fully re-resolved against publication, currency, Variant state, Location stock, and Checkout authority.
- Test/live slug resolution and tenant transactions remain isolated. Events omit PII, theme bodies, and capabilities.

Accepted V1 limitations: public traffic uses application-level in-process limiting, hosted capability URLs are bearer secrets, and production-grade asset proxying/scanning is operator work. Custom domains and uploads are out of scope.
