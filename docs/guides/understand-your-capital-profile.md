# Understand your Capital Profile

Yinne Capital Intelligence summarizes business activity that Yinne can observe. The 0–100 score and descriptive stability band help explain patterns in payments, customers, refunds, and operating history. They are not a credit decision, loan approval, financing offer, or prediction that a business will repay debt.

## How it works

The `rules-1` model examines one currency across the trailing 180 complete days. It evaluates revenue consistency, equal-period growth, cash-flow stability, repeat identified-customer revenue, refunds, and observed operating history. The dashboard shows each aggregate input, normalized score, weight, contribution, and deterministic explanation.

## Data sufficiency

Yinne requires at least 90 observed days and 30 paid orders. A new merchant receives **Insufficient data**, not a low score. Customer quality is omitted and remaining dimensions are reweighted when customer identity coverage is inadequate. Not using subscriptions, invoices, or multiple locations does not lower the score.

## What changes a profile

More consistent active weeks, sustained positive collected-volume growth, repeat identified demand, lower successful-refund volume, and longer observed history can improve relevant signals. Volatility, extended inactive periods, declining comparable volume, or elevated refunds can reduce them. A new profile lists the largest deterministic contribution changes from the previous comparable snapshot.

## Limitations

Yinne cannot observe external revenue, expenses, liabilities, bank balances, settlement timing, or activity processed elsewhere. Scores are currency-specific and contain no FX conversion. If canonical data is incomplete or incorrect, correct the source records through supported workflows and recalculate; historical snapshots remain immutable.
