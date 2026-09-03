# Phase 8 Analytics Correctness Review

Result: pass, subject to final automated verification.

Metrics have a single versioned catalogue. GMV uses charge Transactions; net collected subtracts refund Transactions; commerce metrics use paid Orders without adding financial sources together. Payment and attempt rates are distinct and exclude pending from terminal denominators. Customer repetition counts paid Orders, product history uses OrderItem snapshots, renewals use billing-period records, and invoice aging uses canonical Invoice state/due time. Churn is deferred because arbitrary historical opening populations are not rigorously reconstructible.

Half-open bounds, server timezone input, explicit zero denominators, currency partitions, live freshness, and known answers prevent common reporting ambiguity. Live derivation makes event replay and late facts safe.
