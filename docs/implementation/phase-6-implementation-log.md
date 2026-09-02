# Phase 6 implementation log

Phase 6 extended the existing canonical Location table, represented Employees through membership and
scoped role assignments, and introduced Invoice aggregates plus immutable line items and counters.

The service layer now supports Location lifecycle management, Employee location assignment, Invoice
draft/create/update/issue/void/list/detail, public capability lookup, hosted collection, and atomic
Payment-to-Invoice reconciliation. REST routes, SDK methods, OpenAPI paths, dashboard pages, public
payment UX, deterministic fixtures, and automated tests expose those capabilities.

Key decisions are recorded in the Phase 6 plan. In particular, collection reuses Checkout, Orders,
and Payments; overdue remains derived; and raw public tokens are never stored.
