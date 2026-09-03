# Recurring revenue architecture

Yinne owns canonical Subscription state, billing periods, renewal identity, retry policy, and
recurring orchestration. Providers execute financial capabilities; provider-native subscription
objects, mandates, or tokens must never become canonical business truth.

Every billed period composes through `Subscription → Invoice → Checkout → Payments Core → Provider`.
The Invoice is the receivable, Payment/Attempt records execution, Transaction records successful
financial evidence, and the Subscription advances only from that canonical evidence. Future opaque
mandate references may enable unattended live execution, but raw card data and provider-owned billing
schedules do not belong in this module.
