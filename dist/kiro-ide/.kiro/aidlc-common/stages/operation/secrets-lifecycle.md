---
slug: secrets-lifecycle
phase: operation
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

Load aidlc-devsecops-agent persona from `agents/aidlc-devsecops-agent.md` and knowledge from `.kiro/knowledge/aidlc-devsecops-agent/`.

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

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :key:
- Summary of secrets-inventory, rotation-plan
- Review path: `<record>/operation/secrets-lifecycle/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .kiro/tools/aidlc-orchestrate.ts report --stage secrets-lifecycle --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/secrets-lifecycle/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/secrets-lifecycle/required-sections-<iso>.md`.

## Learn

While running this stage, maintain a running log in
`<record>/<phase>/<stage>/memory.md` (create on stage start if absent).
Append entries under four standard headings:

- **Interpretations** — choices made where the stage prose was ambiguous
- **Deviations** — places you intentionally departed from the stage prose, and why
- **Tradeoffs** — alternatives considered and why you picked what you did
- **Open questions** — anything to confirm before next run, or uncertain context

Format each entry with an ISO 8601 timestamp:
`- 2026-05-20T10:14:32Z — <summary>; <context>`

Before the approval gate, read memory.md and surface candidates as a
structured question. For each entry the user keeps, write to the appropriate
harness destination per `stage-protocol.md` §13 — never to this stage file:

- Prescriptive rule → a practice line under the routed heading in
  `aidlc/spaces/<active-space>/memory/project.md` (default) or `team.md` (promoted)
- Verification check → new manifest at `.kiro/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
