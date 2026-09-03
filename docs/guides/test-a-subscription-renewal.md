# Test a subscription renewal

The Acme seed includes due success, failure, and pending scenarios. The Worker task accepts an
explicit `dueAt` test instant and a bounded tenant/environment payload, so tests do not wait for wall
clock time. Run the task twice with the same Subscription period to verify that its unique renewal key
creates one Invoice and advances at most once.

Calendar calculations use UTC instants. Monthly dates clamp to the last valid destination day and
retain the original anchor for later months; leap-day annual dates clamp to February 28 when needed.
Changing a display timezone or crossing DST does not move the financial UTC instant.

Mock outcomes are `succeed`, `fail`, and `pending`. They exercise Payments Core through canonical
Checkout and never call a provider directly from the Subscription engine.
