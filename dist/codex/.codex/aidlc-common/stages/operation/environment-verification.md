---
slug: environment-verification
phase: operation
execution: CONDITIONAL
condition: Execute after deployment when the target environment is not local development — staging, production, or any shared environment where configuration correctness matters.
lead_agent: aidlc-aws-platform-agent
support_agents:
  - aidlc-operations-agent
  - aidlc-devsecops-agent
mode: inline
produces:
  - environment-report
  - environment-metrics
  - environment-verification-questions
consumes:
  - artifact: deployment-log
    required: true
  - artifact: environment-inventory
    required: false
  - artifact: deployment-architecture
    required: true
requires_stage:
  - deployment-execution
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - infra
  - security-patch
  - workshop
inputs: Deployed infrastructure, infrastructure design, environment inventory
outputs: aidlc-docs/operation/environment-verification/environment-report.md, aidlc-docs/operation/environment-verification/environment-metrics.md, aidlc-docs/operation/environment-verification/environment-verification-questions.md
---

# Environment Verification

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage verifies the deployed environment itself is correctly configured — not the application logic (that's runtime-validation), but the infrastructure, networking, permissions, secrets, DNS, TLS, and cross-service connectivity that the application depends on.

## Why This Stage Exists

The most common production incident pattern is: "code works in dev, fails in staging/prod." Root cause is always environment configuration:
- Secret exists in dev but wasn't created in staging
- IAM role in prod has narrower permissions than dev role
- VPC security group blocks the port the service needs
- DNS CNAME doesn't point to the new load balancer
- TLS certificate doesn't cover the new subdomain
- Environment variable has a typo (prod-us-east-1 vs prod-us-east1)
- Database endpoint is the dev DB, not prod DB
- Cross-account access not configured for the new service
- CloudWatch log group doesn't exist (logs silently dropped)
- S3 bucket policy doesn't allow the new service's role

These are never caught by unit tests, integration tests, or code review. They can only be caught by inspecting the actual deployed environment.

## Steps

### Step 1: Load Agent Personas

Load aidlc-aws-platform-agent persona from `agents/aidlc-aws-platform-agent.md` and knowledge from `.codex/knowledge/aidlc-aws-platform-agent/`.

### Step 2: Load Prior Context

- Read deployment log from `aidlc-docs/operation/deployment-execution/`
- Read infrastructure design from `aidlc-docs/construction/infrastructure-design/`
- Read environment inventory from `aidlc-docs/operation/environment-provisioning/` (if exists)

### Step 3: Network and DNS Verification

Verify the network layer is correctly configured:
- [ ] DNS records resolve to correct targets (CNAME/A records for service endpoints)
- [ ] TLS certificates are valid (not expired, cover correct domains, full chain)
- [ ] Load balancer listeners on correct ports (80→443 redirect, 443→target group)
- [ ] Target groups have healthy targets registered
- [ ] Security groups allow required ingress/egress (application ports, database ports, HTTPS)
- [ ] NACLs don't block required traffic
- [ ] VPC endpoints exist for AWS services (if private subnet)
- [ ] NAT Gateway configured for outbound internet (if private subnet needs external APIs)

### Step 4: Secrets and Configuration Verification

Verify all secrets and config are present and correct:
- [ ] All referenced Secrets Manager entries exist and are not empty
- [ ] All referenced Parameter Store parameters exist with correct values
- [ ] Database connection strings point to correct environment (not dev/staging crosswired)
- [ ] API keys and tokens are valid (not expired, correct scope)
- [ ] Environment variables set correctly on compute (ECS task def, Lambda env, EC2 user data)
- [ ] No dev/test credentials in production environment
- [ ] Secret rotation is enabled (not using initial/static values)

### Step 5: IAM and Permissions Verification

Verify least-privilege access is correctly configured:
- [ ] Service roles have required permissions (S3 read/write, DynamoDB CRUD, SQS send/receive)
- [ ] Service roles do NOT have excessive permissions (no `*` actions unless justified)
- [ ] Cross-account roles allow required access (if multi-account setup)
- [ ] Resource policies (S3 bucket, KMS key, SQS queue) allow the service role
- [ ] No wildcard resource ARNs in production policies (specific bucket, table, queue)

### Step 6: Data Layer Verification

Verify data infrastructure is correctly provisioned:
- [ ] Database exists, accessible from compute subnet, correct engine version
- [ ] Database schema matches what migrations expect (migrations have been applied)
- [ ] Read replicas exist (if HA design requires)
- [ ] Backup retention configured per DR design
- [ ] Encryption at rest enabled
- [ ] Cache cluster (Redis/Memcached) accessible and empty/warm
- [ ] Message queues/topics exist with correct configuration (DLQ, retention, visibility timeout)

### Step 7: Observability Layer Verification

Verify monitoring infrastructure is ready:
- [ ] CloudWatch log groups exist (logs not silently dropped)
- [ ] Log retention policy set (not infinite)
- [ ] CloudWatch alarms exist and in OK state (not INSUFFICIENT_DATA)
- [ ] Dashboard exists and shows current metrics
- [ ] X-Ray tracing configured (if required)
- [ ] SNS topics for alerts have confirmed subscriptions (not pending)

### Step 8: Cross-Service Connectivity Verification

Verify services can talk to each other:
- [ ] Service A can reach Service B (network + auth + correct URL)
- [ ] Service can reach external APIs (outbound connectivity, correct credentials)
- [ ] Event publisher can write to queue/topic
- [ ] Event subscriber can read from queue/topic
- [ ] WebSocket connections can be established through load balancer (if sticky sessions needed)

### Step 9: Generate Environment Metrics

Create `environment-metrics.md`:

```markdown
## Environment Verification Metrics

| Category | Checks | Passing | Failing | Status |
|----------|--------|---------|---------|--------|
| Network/DNS | 8 | 8 | 0 | PASS |
| Secrets/Config | 12 | 11 | 1 | WARN |
| IAM/Permissions | 6 | 6 | 0 | PASS |
| Data Layer | 9 | 9 | 0 | PASS |
| Observability | 5 | 5 | 0 | PASS |
| Cross-Service | 4 | 4 | 0 | PASS |
| **Total** | **44** | **43** | **1** | **PASS with warnings** |

### Failing Checks
| Check | Expected | Actual | Severity | Remediation |
|-------|----------|--------|----------|-------------|
| API key expiry | > 30 days | 12 days | WARN | Rotate before expiry |
```

### Step 10: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE critical environment issues exist AND attempt < max_attempts:
  1. CLASSIFY each issue:
     - missing-resource: log group, queue, DNS record doesn't exist → CREATE via IaC/CLI
     - wrong-config: env var has wrong value, secret points to wrong DB → UPDATE value
     - permission-denied: IAM role too restrictive → UPDATE policy (with least-privilege)
     - network-blocked: security group missing rule → ADD rule
     - cert-issue: TLS expired or wrong domain → REQUEST new cert or fix domain
  2. APPLY fixes (prefer IaC changes over manual fixes for reproducibility)
  3. RE-VERIFY affected checks
  4. attempt += 1

IF issues remain after max_attempts:
  ESCALATE with:
  - Failing checks with exact error/output
  - Required manual actions (things that need human AWS console access)
  - Impact assessment (which features are affected)
```

### Step 11: Generate Report

Create `environment-report.md`:
- Environment identified: account, region, VPC, cluster/service
- Verification summary: checks run, pass/fail/warn counts
- Critical issues found and resolved
- Warnings (non-blocking but should be addressed)
- Cross-service connectivity matrix (service × service: can/cannot reach)
- Drift from IaC (if any manual changes detected)
- Comparison to prior environment verification (if historical data exists)
- Recommendations for environment hardening

### Step 12: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :cloud:
- Summary of environment-report, environment-metrics
- Review path: `<record>/operation/environment-verification/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .codex/tools/aidlc-orchestrate.ts report --stage environment-verification --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/environment-verification/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/environment-verification/required-sections-<iso>.md`.

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
- Verification check → new manifest at `.codex/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
