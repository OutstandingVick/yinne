# Contributing

Start with README, the planning index, and current implementation handoff. Sign commits with the Developer Certificate of Origin. Keep changes inside package/module boundaries; cross-module table access is not accepted.

Every change needs risk-proportionate tests, updated contracts/docs, no secrets or personal data, and an explicit reality label for user-visible capabilities. Financial, authorization, tenant, migration, event, or security changes require two maintainer reviews and an ADR when they alter an approved decision.

Run pnpm format:check, pnpm lint, pnpm typecheck, pnpm test:all, and pnpm build before a pull request. Report vulnerabilities privately per SECURITY.md.
