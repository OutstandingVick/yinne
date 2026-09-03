# Handle failed renewals

A failed renewal leaves its canonical Invoice open and moves the Subscription to `past_due`. Retry
attempts reuse that receivable; they never create a second Invoice for the period. The deterministic
policy schedules retries after one and three days and leaves exhausted subscriptions past due for
merchant action.

Use **Retry payment** on Subscription detail after resolving the test condition. Pending is different
from failed: it remains unresolved until the existing Payments webhook/reconciliation flow produces a
terminal result. Never manually mark an Invoice or Subscription paid.

Pause stops future billing. Resume begins a fresh full snapshotted interval. Immediate cancellation is
terminal; period-end cancellation permits service through the boundary and prevents another Invoice.
