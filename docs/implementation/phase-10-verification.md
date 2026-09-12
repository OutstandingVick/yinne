# Phase 10 Verification

Verified on 2026-09-12 against Phase 10 on `main`.

## Results

| Gate                        | Evidence                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| Format and lint             | Passed after two UI lint findings were corrected                                                     |
| Typecheck                   | 22/22 workspace packages passed                                                                      |
| Unit/contracts              | 26 files, 84 tests passed                                                                            |
| PostgreSQL integration      | 6 files, 15 tests passed                                                                             |
| Browser regression          | 25 tests passed, including 3 Marketplace scenarios                                                   |
| OpenAPI                     | Valid OpenAPI 3.1 contract, 105 operations                                                           |
| Existing database migration | Passed                                                                                               |
| Clean database              | Migration, repeatable seed, RLS/grants passed                                                        |
| RLS                         | Forced on all 38 tenant tables                                                                       |
| Production build            | 22/22 packages and 73 Next.js pages passed                                                           |
| Worker                      | Connected, processed existing outbox work, registered canonical tasks, and handled SIGINT gracefully |

## Commands

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm worker:migrate
pnpm db:seed
pnpm db:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm openapi:validate
pnpm verify:clean-db
pnpm build
pnpm db:seed
pnpm test:e2e -- --workers=1
pnpm --filter @yinne/worker start
```

## Marketplace acceptance evidence

- Public browse returns approved eligible products from Acme Coffee and Aso Living.
- Search resolves canonical product copy, variant amount, currency, and availability.
- Listing detail exposes no organization ID or merchant-private metadata.
- Submitted/unpublished listings are inaccessible through public resolution.
- Out-of-stock tracked variants cannot be selected for checkout.
- Marketplace checkout submits only canonical variant ID and quantity, revalidates inventory, and opens the canonical hosted Checkout surface with Marketplace attribution.
- Product ownership has a composite database boundary; profile/listing private reads and writes use organization/environment forced RLS.
- Lifecycle, input-boundary, and price-injection contract tests pass.
- Phase 1–9 browser, integration, unit, OpenAPI, database, and build regression remains green.

No fixable blocker remains.
