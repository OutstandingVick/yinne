# Phase 6 verification

## Verified gates

| Gate                                           | Result                                        |
| ---------------------------------------------- | --------------------------------------------- |
| TypeScript workspace typecheck                 | Passed: 18/18 packages                        |
| ESLint                                         | Passed                                        |
| Prettier check                                 | Passed after formatting Phase 6 sources       |
| Unit tests                                     | Passed: 45/45 tests across 17 files           |
| Integration tests                              | Passed: 9/9 tests across 4 files              |
| OpenAPI validation                             | Passed: OpenAPI 3.1, 68 operations            |
| Production build                               | Passed: 18/18 packages and 57 dashboard pages |
| Clean database migrate, seed, and policy check | Passed: forced RLS on 31 tables               |
| Phase 6 Playwright scenarios                   | Passed: 5/5                                   |

## Scenario coverage

Browser coverage verifies owner visibility of canonical Locations and employee scopes, all seeded
Invoice display states, denial of unknown public capabilities, successful Invoice collection through
hosted Checkout, and prevention of collection after payment.

The database verification creates an isolated database, applies every migration from zero, seeds the
complete deterministic dataset, checks runtime roles and append-only grants, then removes the
temporary database. This caught and removed duplicate legacy Location check-constraint declarations
from the generated Phase 6 migration.

## Notes

The production build reports Turbo output-cache warnings for typecheck-only packages; these are
existing build configuration warnings, not compilation failures. Playwright emits Node color-setting
warnings that do not affect test behavior.
