# Capital intelligence — PLANNED V1.3 pilot

Yinne does not lend or decide eligibility. Recommended V1.3 output is a “financial health profile,” not an estimated financing amount. Financing bands should not appear until a jurisdiction-specific lending partner owns the offer/model, validation proves calibration, and legal review approves language.

## Transparent score (0–100)

Use trailing 180 complete local days, successful payments minus succeeded refunds, partitioned by currency. Require 90 days and 30 paid orders for a scored result; otherwise return insufficient_data plus missing requirements.

| Component           | Weight | Rule                                                                                              |
| ------------------- | -----: | ------------------------------------------------------------------------------------------------- |
| Revenue consistency |     25 | 1 minus coefficient of variation of weekly net revenue, winsorized and mapped to documented bands |
| Positive growth     |     20 | slope/CAGR-like weekly trend, capped; decline scores lower, no penalty hidden                     |
| Cash-flow stability |     20 | share of active weeks and maximum drawdown bands                                                  |
| Customer quality    |     15 | repeat-customer revenue share, with anonymous share disclosed                                     |
| Refund risk         |     10 | succeeded refund amount / successful charge amount                                                |
| Operating history   |     10 | observed active months capped at 24                                                               |

Each subscore publishes raw input, band thresholds, weight, contribution, missing-data treatment, window, currency, and calculation version. Missing optional customer identity reweights customer quality to zero and normalizes remaining weights only if at least 70 total base weight is observable; otherwise insufficient_data. Do not treat missing data as good.

Risk bands are descriptive only: 0–39 limited/volatile, 40–59 developing, 60–79 stable, 80–100 highly stable. Avoid “low credit risk.” Recalculate nightly and on-demand at most once/hour after material events; retain versioned profiles and explanations.

```json
{
  "status": "scored",
  "score": 72,
  "band": "stable",
  "currency": "NGN",
  "window": { "from": "2026-02-28", "to": "2026-08-26" },
  "model_version": "rules-1",
  "components": [
    {
      "key": "revenue_consistency",
      "raw": { "weekly_cv": 0.28 },
      "score": 19,
      "weight": 25,
      "explanation": "Weekly revenue varied moderately."
    }
  ],
  "limitations": [
    "Provider settlement, liabilities, cash expenses, and external sales are not included."
  ]
}
```

Risks include misleading credit implication, discriminatory proxies, incomplete provider data, seasonality, gaming, and multi-currency distortion. Mitigate with consent/access controls, no protected attributes, per-currency scores, versioning/backtests, dispute/correction workflow, prominent limitation, no automated adverse action, and disable by default.
