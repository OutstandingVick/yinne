# Acme Coffee Analytics Known Answers

This manifest describes the deterministic results on a freshly migrated and seeded database for `[2026-08-01T00:00:00Z, 2026-09-01T00:00:00Z)` in `Africa/Lagos`, before any interactive demo mutations.

| Metric                        | Expected result                                                   |
| ----------------------------- | ----------------------------------------------------------------- |
| GMV                           | NGN `1950000`; USD `2500`                                         |
| Successful refunds            | NGN `650000`; USD `0`                                             |
| Net collected                 | NGN `1300000`; USD `2500`                                         |
| Paid order count              | `4`                                                               |
| Paid order volume             | NGN `1950000`; USD `2500`                                         |
| AOV                           | NGN `650000`; USD `2500`                                          |
| Refund volume rate            | NGN `0.333333`; USD `0.000000`                                    |
| Payment outcomes              | succeeded `4`, failed `1`, pending `1`                            |
| Payment success/failure rates | `0.800000` / `0.200000` over five terminal payments               |
| Refunded payment rate         | `0.500000` (`2 / 4`)                                              |
| Identified buyers             | `3`                                                               |
| Repeat buyers                 | `1` (the first customer has NGN and USD paid orders)              |
| Repeat purchase rate          | `0.333333`                                                        |
| Identity coverage             | `1.000000`                                                        |
| Invoice counts                | draft `1`, open `2`, paid `1`, void `1`, overdue `1`              |
| Outstanding invoice value     | NGN `2030000`                                                     |
| Overdue invoice value         | NGN `780000`                                                      |
| Invoice count collection rate | `0.333333`                                                        |
| Invoice value collection rate | NGN `0.242537`                                                    |
| Subscription states           | active `4`, trialing `1`, past_due `1`, paused `1`, cancelled `1` |
| MRR / ARR                     | NGN `7500000` / `90000000`                                        |

The USD fixture exists specifically to prove that the API returns currency partitions and never produces a meaningless mixed-currency total. Its `2026-08-19T00:30:00Z` success also provides an instant near a Lagos local-day boundary for timezone tests.

The seed is safely repeatable for named fixture records. Interactive API/E2E activity may add canonical records, so exact known-answer verification runs against the repository's clean temporary database workflow.
