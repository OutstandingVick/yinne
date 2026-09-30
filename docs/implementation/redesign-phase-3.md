# Redesign Phase 3: Commerce and Payments Modules

## Delivered

The dashboard-only visual redesign covers Storefront (overview, catalogue, settings), Inventory, Marketplace management, Payment Links (list and creation), Checkout Sessions (list and detail), Refunds, Invoices (list, detail, creation), Subscriptions (list, detail, creation), and Subscription Plans (list, detail, creation). Existing copy, fields, actions, filters, data sources, statuses, and destinations are preserved.

## Files and shared patterns

- `apps/dashboard/src/app/(dashboard)/module-screens.css` and the layout import add one scoped set of module spacing, responsive form grids, detail summaries, compact table polish, long-URL wrapping, and stock-quantity emphasis. The same Phase 1 brand tokens and Phase 2 shell remain in use.
- The in-scope page files under `storefront`, `commerce/inventory`, `marketplace/manage`, `payment-links`, `checkout/sessions`, `refunds`, `invoices`, `subscriptions`, and `subscription-plans` now reuse `CoreScreen`, `SectionCard`, `DetailGrid`, `DetailItem`, `ActionGroup`, `FinancialAmount`, `StatusBadge`, `FilterForm`, and compact `Table` where relevant. No new component API or business rule was introduced.
- `tests/e2e/module-screens-redesign.spec.ts` covers 15 entry screens at 1440, 900, 390, and 320 CSS pixels, plus representative Checkout, Invoice, Plan, and Subscription detail pages at 320px. `eslint.config.mjs` excludes generated Playwright results from lint discovery.

## Verification

- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` passed. The build and typecheck covered 22 packages.
- `pnpm test`: 84 tests passed across 26 files.
- The Phase 3 responsive/navigation browser test passed, including the Inventory filter and Payment Link creation navigation. Existing invoice fixture, subscription list/detail, and operations browser checks passed.
- One existing hosted-invoice payment browser test could not exercise its payment button because its fixed seeded invoice had already reached `paid` state. Its public invoice page and payment logic were not changed in this phase; no fixture reset or payment mutation was performed to force a pass.
- `git diff --check` passed. Reviewed changes are presentation markup, scoped CSS, tests, formatting, and lint exclusion; no server actions, API calls, permission checks, schema, financial calculations, routes, or workflows changed.

## Deferred

The current data returned to these screens does not expose every requested scan field. Payment Link capability URLs are displayed once at creation, not reconstructed in the list. Customer, plan, original-payment, and timeline details absent from the current list responses were not invented or fetched through new APIs. A low-stock threshold does not exist in the current Inventory data, so zero stock is emphasized without introducing an arbitrary low-stock rule. Unrelated Operations and Intelligence screens remain for the next redesign phase.

This phase consists of 25 signed-off commits after `d44f26d` and is pushed to `origin/main`.

REDESIGN PHASE 3 COMPLETE — READY FOR OPERATIONS & INTELLIGENCE
