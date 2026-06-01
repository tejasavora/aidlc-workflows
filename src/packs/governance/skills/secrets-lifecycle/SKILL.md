---
name: aidlc-secrets-lifecycle
description: |
  Manages secrets rotation and certificate renewal/expiry monitoring. Asks which secrets
  exist, rotation policy, and cert domains. Inventories all secrets and certificates,
  checks expiry, configures auto-renewal where available, and triggers rotation when
  due. Self-healing: cert about to expire → trigger renewal → verify → update references.
  Tool-agnostic: AWS Secrets Manager, Vault, certbot, ACM auto-renewal, or custom.
metadata:
  phase: common
  stage: secrets-lifecycle
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: governance
  max-attempts: 2
---

# Secrets & Certificate Lifecycle

Maintain a complete inventory of secrets and certificates, enforce rotation policies, and prevent certificate expiry incidents. This skill runs at project setup (initial inventory) and periodically thereafter as a health check.

## Activation Condition

Activates when ANY of the following are detected:
- `toolchain.yaml` → `governance.secrets` section is configured
- Infrastructure design documents reference AWS Secrets Manager, Vault, ACM, or Let's Encrypt
- A `*.pem`, `*.crt`, or certificate ARN appears in infrastructure design artefacts

## Inputs

- Human clarification (see Step 1)
- `aidlc-docs/<intent>/toolchain.yaml` → `governance.secrets`:
  ```yaml
  secrets:
    manager: aws-secrets-manager   # aws-secrets-manager | vault | custom
    rotation_default_days: 90      # default rotation interval if not specified per secret
    certificates:
      provider: acm                # acm | letsencrypt | custom
      domains:
        - api.myapp.example.com
        - myapp.example.com
      expiry_warning_days: 30      # warn when cert expires within this many days
  ```
- Infrastructure design documents (to discover secrets referenced in IaC)
- Cloud secrets manager (AWS Secrets Manager, Vault) — for live inventory and rotation status
- Certificate provider (ACM, Let's Encrypt) — for cert expiry dates and renewal status

## Execution

### Step 1: Human Clarification

Ask:
1. Which secrets does this project use? (database passwords, API keys, OAuth client secrets, signing keys — list known ones)
2. What is the required rotation policy? (e.g., database passwords every 90 days, API keys every 180 days)
3. Which domains need TLS certificates?
4. Are any secrets or certificates shared with other systems? (shared secrets have wider blast radius)

This information seeds the initial inventory. If a secrets manager is already configured, the clarification supplements it rather than replacing it.

### Step 2: Build Secrets Inventory

Combine two sources:

**From human clarification and design documents:**
Scan `aidlc-docs/<intent>/construction/*/infrastructure-design/` for references to secrets, API keys, connection strings, and certificates.

**From live secrets manager:**

*AWS Secrets Manager:*
```bash
aws secretsmanager list-secrets --query 'SecretList[*].{Name:Name,ARN:ARN,RotationEnabled:RotationEnabled,LastRotatedDate:LastRotatedDate}' \
  --output json > secrets-inventory.json
```

*HashiCorp Vault:*
```bash
vault kv list secret/myapp/ > vault-secrets.txt
```

For each secret, record:
- Name / ARN / path
- Secret type (DB credential, API key, JWT signing key, certificate)
- Rotation policy (days)
- Last rotated date (or "never")
- Days since last rotation
- Auto-rotation status (enabled / disabled)
- Shared with other systems (yes/no)

### Step 3: Audit Certificates

For each domain in `governance.secrets.certificates.domains`:

*ACM (AWS Certificate Manager):*
```bash
aws acm list-certificates --query 'CertificateSummaryList[*].{DomainName:DomainName,CertificateArn:CertificateArn,Status:Status}' \
  --output json
aws acm describe-certificate --certificate-arn $CERT_ARN \
  --query 'Certificate.{NotAfter:NotAfter,RenewalSummary:RenewalSummary}' --output json
```

*Let's Encrypt / certbot:*
```bash
certbot certificates --domain api.myapp.example.com
```

For each certificate, calculate:
- Expiry date
- Days until expiry
- Auto-renewal status (enabled/disabled)
- Last renewal date

Flag as WARNING if `days_until_expiry <= expiry_warning_days`.
Flag as CRITICAL if `days_until_expiry <= 7`.

### Step 4: Self-Healing — Trigger Renewal for Expiring Certificates (Attempt 1)

For any certificate flagged WARNING or CRITICAL:

*ACM (auto-renewal configured):*
```bash
# ACM renews automatically if DNS validation is configured — check renewal status
aws acm describe-certificate --certificate-arn $CERT_ARN \
  --query 'Certificate.RenewalSummary.RenewalStatus'
# If PENDING_AUTO_RENEWAL → verify DNS validation record exists
```

*ACM (no auto-renewal — manual):*
```bash
# Re-request certificate
aws acm request-certificate --domain-name api.myapp.example.com \
  --validation-method DNS --idempotency-token renewal-2024
```

*Let's Encrypt (certbot):*
```bash
certbot renew --cert-name api.myapp.example.com --non-interactive
```

After renewal, verify the new certificate is issued and active:
```bash
aws acm describe-certificate --certificate-arn $CERT_ARN \
  --query 'Certificate.Status'  # Expect: ISSUED
```

If renewal fails → escalate to human immediately (certificate expiry is a production P0 risk).

### Step 5: Self-Healing — Trigger Rotation for Overdue Secrets (Attempt 1)

For secrets past their rotation due date (`days_since_rotation > rotation_policy_days`):

*AWS Secrets Manager rotation (if rotation Lambda is configured):*
```bash
aws secretsmanager rotate-secret --secret-id $SECRET_ARN
```

Wait for rotation completion:
```bash
aws secretsmanager describe-secret --secret-id $SECRET_ARN \
  --query 'RotationRules.{Enabled:RotationEnabled,LastRotatedDate:LastRotatedDate}'
```

*Manual rotation required (no auto-rotation configured):*
Do NOT attempt to rotate manually — secrets rotation for database credentials and API keys requires coordination with the consuming service. Present to human with a rotation runbook reference.

After rotation: verify consuming service is still healthy (check monitoring / smoke-test the health endpoint).

### Step 6: Produce Secrets Lifecycle Report

```markdown
## Secrets & Certificate Lifecycle Report

**Date:** 2024-01-15
**Secrets manager:** AWS Secrets Manager
**Certificate provider:** ACM

### Secrets Inventory

| Secret | Type | Last Rotated | Days Since | Policy | Status |
|---|---|---|---|---|---|
| prod/db/app-password | DB credential | 2023-10-14 | 93 days | 90 days | OVERDUE |
| prod/api/stripe-key | API key | 2024-01-10 | 5 days | 180 days | OK |
| prod/app/jwt-secret | Signing key | 2023-07-01 | 198 days | 180 days | OVERDUE |
| prod/app/session-key | Session key | 2024-01-15 | 0 days | 90 days | ROTATED (this run) |

### Certificates

| Domain | Expiry | Days Until | Auto-Renewal | Status |
|---|---|---|---|---|
| api.myapp.example.com | 2024-02-14 | 30 days | ACM DNS | WARNING — renewal triggered |
| myapp.example.com | 2024-05-10 | 116 days | ACM DNS | OK |

### Actions Taken This Run

- `prod/app/session-key`: rotation triggered via Secrets Manager Lambda — COMPLETED
- `api.myapp.example.com`: ACM renewal triggered — status PENDING_VALIDATION (DNS record required)

### Actions Requiring Human Decision

| Item | Issue | Recommended Action |
|---|---|---|
| `prod/db/app-password` | 93 days (overdue, no auto-rotation) | Manually rotate per runbook: [link] |
| `prod/app/jwt-secret` | 198 days (overdue, no auto-rotation) | Coordinate rotation with all JWT consumers before rotating |
```

## Outputs

- `aidlc-docs/<intent>/governance/secrets-lifecycle-report-<date>.md`
  - Full secrets inventory with rotation status
  - Certificate inventory with expiry dates
  - Actions taken (auto-rotated, cert renewed)
  - Items requiring human action

## Artefact Verification

`artefact-verification: "true"` — Human reviews the secrets lifecycle report before it is considered complete. Critical items (OVERDUE secrets, expiring certificates, failed renewals) require explicit human acknowledgment and a stated remediation plan.
