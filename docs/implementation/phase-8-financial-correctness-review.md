# Phase 8 Financial Correctness Review

Result: pass, subject to final automated verification.

Money is BigInt minor units at rest and decimal strings over APIs. Reports never sum currencies or use binary floating point for money. GMV, refunds, net collected, paid-order volume, outstanding invoices, and MRR are separately named. Net collected is explicitly not accounting revenue. Successful refunds subtract only at their occurrence time. MRR normalization rounds half-up per active subscription; ARR is exactly MRR × 12. Pending/failed financial attempts do not become collected volume.
