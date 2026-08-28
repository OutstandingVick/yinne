# Open-source strategy

## License

| License    | Adoption/flexibility                                          | Cloud exploitation         | Patents                              | Contribution fit                     |
| ---------- | ------------------------------------------------------------- | -------------------------- | ------------------------------------ | ------------------------------------ |
| MIT        | Maximum simplicity/adoption                                   | Little protection          | No explicit patent grant             | Familiar, minimal                    |
| Apache-2.0 | High company adoption/permissive commercial use               | Little copyleft protection | Explicit patent grant/termination    | Clearer for infrastructure           |
| AGPLv3     | Some enterprise friction; source obligations over network use | Stronger deterrent         | Patent clauses, stronger reciprocity | May reduce provider/company adoption |

Recommend Apache License 2.0. Provider-neutral fintech infrastructure benefits from enterprise adoption and explicit patent protection. AGPL could protect against closed hosted forks but may deter banks/PSPs and complicate integrations; MIT lacks the explicit patent grant. Trademark policy protects the Yinne name without implying certified deployments.

## Governance and contribution

- CONTRIBUTING: setup, architecture boundaries, DCO sign-off, conventional changes, tests/docs, review expectations, compatibility policy.
- CODE_OF_CONDUCT: Contributor Covenant with enforcement contacts.
- SECURITY.md: private reporting address/form, supported versions, 72-hour acknowledgement target, coordinated disclosure, no public financial exploit details.
- Issue forms: bug with reproducible sanitized data, documentation, provider request, RFC/feature request, security redirect.
- Features require problem/evidence, scope/reality label, domain/API/event/security implications, migration and acceptance criteria. Large/reversible decisions use ADR/RFC before code.
- Maintainers own modules/adapters through CODEOWNERS; two reviews for financial/security changes. Releases are signed with changelog, migration notes, SBOM, and compatibility matrix.
- No CLA initially; DCO preserves contributor clarity. Revisit CLA only if foundation/commercial relicensing needs emerge.

## Provider standard

Each adapter is separately packaged, capability-declared, conformance-tested, documented, sandbox-tested, secret-redacted, version-policy-defined, and has active maintainers. Experimental adapters are labeled; no logo implies endorsement. Provider-specific behavior cannot alter core domain enums without RFC.

## Module standard

A module declares dependencies, owned schema/application ports, permissions, events/public schemas, API/OpenAPI, feature flag behavior, migrations, seed fixtures, observability, threat model, and unload/disable semantics. Cross-module table access and circular imports fail CI.

## Project operations

Publish roadmap and decision records; triage weekly when capacity permits; label good-first-issue only when truly bounded; automate stale handling without closing security/correctness issues. Define LTS/security support per release rather than promising indefinite support.
