# Capital model governance

## Versioning

Model identifiers are immutable contracts. Any change to signals, formulas, thresholds, weights, sufficiency, rounding, bands, or material explanation behavior creates a new version. Historical snapshots are never rewritten to the new interpretation.

## Change process

Every proposal must document purpose, canonical Analytics dependency, overlap analysis, applicability, missing-data behavior, threshold rationale, expected distribution, gaming risk, protected/geographic proxy analysis, and rollback/deprecation plan. Approval requires product, financial correctness, security, fairness, and engineering review.

## Validation

A new version needs manually calculable fixtures, boundary tests, business-model-neutrality cases, tenant/environment/RBAC tests, historical replay comparison, and backtesting on representative consented aggregate data. Calibration claims require independent evidence; heuristic models must remain labelled heuristic.

## Adding or removing signals

Signals live in the public catalogue before code. Prefer broader non-overlapping dimensions and canonical Analytics features. Missing optional business behavior is not negative evidence. Removing a signal also requires a new version and documented reweighting.

## Deployment and monitoring

Deploy new versions alongside old snapshots, calculate on a controlled cohort, compare score/band movement, inspect failure and missingness rates, and provide dispute/correction paths. Monitor input drift and outcome language. Disable a model if it leaks data, uses prohibited attributes, creates unexplained changes, or is presented as underwriting.

## Prohibited use

Yinne models must not use protected personal characteristics, infer geography-based risk, ingest unapproved external personal data, make automated adverse decisions, or represent a financing offer. A regulated partner must own and validate any future underwriting model.
