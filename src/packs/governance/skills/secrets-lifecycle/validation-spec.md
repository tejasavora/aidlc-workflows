# Secrets & Certificate Lifecycle — Validation Spec

## Activation Check

- If no secrets manager or certificate provider is detected in toolchain.yaml or infra design: skill was correctly skipped (not a failure)
- If secrets or certificates are present: skill MUST have run

## Pass Criteria

- Human clarification collected (secrets list, rotation policy, cert domains)
- Secrets inventory built from both human input and live secrets manager
- Certificate inventory built with expiry dates for all configured domains
- All overdue secrets flagged (days since rotation > rotation policy)
- All certificates within `expiry_warning_days` flagged as WARNING or CRITICAL
- Auto-rotation triggered for secrets with rotation Lambda configured
- Certificate renewal triggered for expiring certs where auto-renewal is configured
- Failed renewals immediately escalated to human (not silently skipped)
- Human reviewed and acknowledged all items requiring manual action
- Report exists at expected path

## Fail Criteria

- Secrets inventory missing known secrets (not all secrets from infra design were included)
- Certificate expiry not checked (expiry dates absent from report)
- Overdue secrets not flagged or rotation not attempted
- Certificate renewal attempted by silently overwriting a production cert without verification
- Rotating a shared secret without flagging blast radius to human
- Failed renewal or failed rotation silently marked as OK
- Human review skipped

## Validation Steps

1. Verify report exists: `aidlc-docs/<intent>/governance/secrets-lifecycle-report-<date>.md`
2. Confirm secrets table includes all secrets referenced in infrastructure design documents
3. For each secret: verify last-rotated date, days since rotation, policy, and status are present
4. Verify certificate table includes all domains from `governance.secrets.certificates.domains`
5. For each cert: verify expiry date and days-until-expiry are calculated
6. For any auto-rotation triggered: confirm post-rotation health check was performed
7. For any renewal triggered: verify new certificate status was checked (ISSUED or PENDING)
8. Confirm human-acknowledgment section covers all OVERDUE and WARNING/CRITICAL items
