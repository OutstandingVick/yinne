# Phase 9 security review

Result: pass, subject to final full regression.

Profiles have direct organization/environment ownership, forced RLS, bounded reads, immutable-history grants and triggers, and replay uniqueness. Capital requires organization-scoped permissions; location assignments do not match. Manual requests cannot supply scores or evidence, are Zod-strict, rate limited, audited, and passed through a tenant-validating security-definer queue function. Workers construct a system principal for the payload tenant/environment. APIs expose aggregates without customer PII, transaction rows, or secrets. Cross-environment history is tested.
