# Governance Phase Guardrails

These rules apply to every stage whose `phase: governance` declaration
imports them as the matching phase rule.

## Auditability

- Every decision, approval, and change must be traceable to a specific actor and timestamp
- Evidence must be verifiable by an independent auditor without requiring developer assistance
- Audit trails are append-only — never delete, overwrite, or backdate entries
- Use structured formats that can be queried programmatically (not free-form prose)

## Compliance Rigor

- Control mappings must cite the specific control ID and version (e.g., SOC2 CC6.1, not just "access control")
- Evidence gaps must be flagged immediately, not discovered during the audit
- Compliance evidence must be current — stale evidence (older than the control period) is invalid
- When frameworks overlap (e.g., SOC2 + HIPAA), map shared controls to avoid duplicate evidence collection

## Secrets and Credentials

- Secrets must never appear in plaintext in logs, artifacts, error messages, or source code
- Rotation policies must be enforced, not advisory — overdue secrets are a finding, not a reminder
- Emergency rotation procedures must exist for compromised credentials
- Separation of duties: the person who creates a secret should not be the only one who can rotate it

## Metrics Integrity

- DORA metrics must be calculated from source data (git, CI, incidents), not self-reported
- Measurement methodology must be documented so metrics are reproducible
- Trends matter more than absolute values — track direction over time

## Corrections
