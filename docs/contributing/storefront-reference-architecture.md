# Storefront reference application architecture

The Storefront is deliberately replaceable. It demonstrates how an operator can compose Yinne's public commerce APIs without moving domain or payment authority into presentation code.

## Dependency direction

```text
Public pages + browser cart
        ↓
Storefront public application service
        ↓
Catalogue publication projection ──→ canonical Products / Variants / Inventory
        ↓
canonical Checkout Session
        ↓
canonical Customer + Order
        ↓
Payments Core → provider adapter → Transaction / Inventory / events
```

`modules/storefront` may depend on Checkout, Contracts, and Database repositories. Checkout may not depend on Storefront. Payments and Commerce must never import Storefront. UI code may call Storefront services during server rendering or public HTTP operations from the browser.

## Ownership boundaries

- `Store` owns public routing, lifecycle, default Location, safe contact fields, and constrained presentation tokens.
- `StoreListing` owns only discovery state and ordering for a canonical Product.
- Product and Variant own names, prices, currency, and active state.
- Inventory owns stock truth at the Store's Location.
- The client cart owns convenience state: Variant ID and quantity only.
- Checkout owns immutable quote, capability URL, guest capture, expiry, and retry state.
- Commerce owns Customer and Order records.
- Payments owns provider execution and all financial terminal effects.

Adding copied price, stock, Order, Payment, or provider fields to Storefront is an architecture violation.

## Public projection rules

Start every projection with an allow-list. Do not serialize database rows. Public Store data excludes organization, Merchant, and Location IDs; Product data excludes metadata and SKU; availability is a coarse state rather than a count. Inactive Stores and unpublished/foreign Products collapse to the same 404 response.

The slug resolver is a narrow `SECURITY DEFINER` function that returns tenant/environment/resource coordinates only for active Stores. All subsequent reads execute in a tenant transaction under forced RLS. Any new public resolver must retain that two-step pattern and a fixed `search_path`.

## Adding a presentation

A separate frontend needs only:

1. `GET /v1/public/stores/:slug` for safe identity/theme data;
2. catalogue and Product detail reads;
3. a local cart containing Variant IDs/quantities;
4. `POST .../checkout` with a stable idempotency key;
5. redirect to the returned hosted Checkout URL.

Do not collect payment credentials or call provider endpoints. Preserve the cart if initiation fails, explain stale-stock conflicts, and clear it only once the Checkout URL is accepted.

## Change checklist

Changes must update Zod contracts, OpenAPI, SDK, permissions, stable events, seed/demo, public projection tests, RLS/database checks, accessibility states, security review, and financial/commerce correctness evidence. Verify test/live isolation and retry the full purchase path with duplicate client and provider delivery before release.
