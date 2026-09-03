# Phase 7 recurring revenue correctness review

The renewal identity is organization, environment, Subscription, and period start, enforced uniquely
on renewal and Invoice records. Subscription rows are locked before lifecycle or renewal decisions,
and succeeded renewal records are replay terminals. Periods advance once from their prior end.

Monthly calculations clamp invalid month-end days while retaining the original anchor; annual leap
dates clamp deterministically; UTC instants are not shifted by DST. Pause stops scheduling, resume
starts a full period, immediate cancellation terminates, and period-end cancellation suppresses the
next bill. Result: PASS after full verification.
