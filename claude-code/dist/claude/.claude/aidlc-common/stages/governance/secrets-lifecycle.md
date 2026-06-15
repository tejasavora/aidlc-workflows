---
slug: secrets-lifecycle
phase: governance
execution: CONDITIONAL
condition: Execute when the system uses secrets (API keys, database credentials, tokens) and needs rotation, expiry tracking, or injection validation.
lead_agent: aidlc-devsecops-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - secrets-inventory
  - rotation-plan
  - secrets-lifecycle-questions
consumes:
  - artifact: deployment-architecture
    required: false
  - artifact: security-requirements
    required: false
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - security-patch
inputs: Infrastructure design, deployed application configuration, AWS Secrets Manager/Parameter Store state
outputs: aidlc-docs/governance/secrets-lifecycle/secrets-inventory.md, aidlc-docs/governance/secrets-lifecycle/rotation-plan.md, aidlc-docs/governance/secrets-lifecycle/secrets-lifecycle-questions.md
---

# Secrets Lifecycle Management

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-devsecops-agent persona from `agents/aidlc-devsecops-agent.md` and knowledge from `.claude/knowledge/aidlc-devsecops-agent/`.

### Step 2: Inventory Secrets

Scan the system for all secrets:
- AWS Secrets Manager entries
- AWS Systems Manager Parameter Store (SecureString)
- Environment variables containing sensitive values
- Configuration files referencing secrets
- CI/CD pipeline secrets (GitHub Secrets, CodeBuild env vars)
- Application code references to secrets (connection strings, API keys)

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What is the rotation policy (30 days, 90 days, manual)?
- What secrets management service to use (Secrets Manager, Parameter Store, Vault)?
- Are there secrets shared across environments that should be separated?
- What notification mechanism for expiring secrets (email, Slack, PagerDuty)?
- Are there compliance requirements for secret rotation frequency?

Follow stage-protocol.md question flow.

### Step 4: Generate Secrets Inventory

Create `secrets-inventory.md`:
| Secret Name | Type | Storage | Last Rotated | Rotation Policy | Consumers | Status |
|-------------|------|---------|-------------|----------------|-----------|--------|
| db-password | credential | Secrets Manager | 2024-01-15 | 90 days | api-service | overdue |
| api-key-stripe | api-key | Parameter Store | 2024-03-01 | 180 days | payment-service | ok |

Flag: secrets hardcoded in code, secrets past rotation deadline, secrets shared across environments.

### Step 5: Generate Rotation Plan

Create `rotation-plan.md`:
- Secrets requiring immediate rotation (overdue, compromised, or hardcoded)
- Rotation procedure per secret type:
  - Database credentials: rotate in Secrets Manager → update RDS → verify connectivity
  - API keys: generate new key → update config → verify → revoke old key
  - TLS certificates: request new cert → deploy → verify → let old expire
- Automation configuration (Lambda rotation functions, Secrets Manager auto-rotation)
- Monitoring: CloudWatch alarms for rotation failures, expiry warnings
- Emergency rotation procedure (for compromised secrets)
- Zero-downtime rotation verification: prove that rotating a secret does NOT cause service interruption (dual-credential period, hot-swap, connection pool refresh)
- TLS certificate management: auto-renewal via ACM, expiry alerting at 30/14/7 days, certificate chain validation, no self-signed certs in production

### Step 6: Update State

Mark secrets-lifecycle as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :key:
Review path: `aidlc-docs/governance/secrets-lifecycle/`
Standard 2-option approval (Approve / Request Changes).
