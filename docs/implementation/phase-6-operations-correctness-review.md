# Phase 6 operations correctness review

The implementation retains one canonical Location model. Inventory stays keyed to Location, Orders
retain their authoritative Location snapshot, Storefront uses its validated default Location, and
Invoices reference the same Location without copying Commerce entities.

Employee identity remains Organization Membership plus staff profile and scoped Role Assignment.
Assignment requires an active member, valid role, and active same-tenant Location. Lifecycle guards
prevent archived Locations from reactivation or new work and block archival when an unpaid Order or
active Store configuration depends on the Location.

Deterministic fixtures cover four operational Location types and twelve members distributed across
organization and Location scopes. Dashboard and browser checks use real service queries. Result:
PASS; no canonical-ownership or multi-location correctness blocker remains.
