---
slug: dr-design
phase: construction
execution: CONDITIONAL
condition: Execute when RTO/RPO targets are defined, or when the system handles data that cannot be lost. Skip for stateless services with no persistence, POCs, or refactors.
lead_agent: aidlc-architect-agent
support_agents:
  - aidlc-aws-platform-agent
  - aidlc-operations-agent
mode: inline
produces:
  - dr-architecture
  - backup-strategy
  - dr-design-questions
consumes:
  - artifact: deployment-architecture
    required: true
  - artifact: ha-architecture
    required: false
  - artifact: reliability-requirements
    required: true
requires_stage:
  - infrastructure-design
sensors:
  - required-sections
  - upstream-coverage
scopes:
  - enterprise
  - feature
  - infra
  - workshop
inputs: Infrastructure design, HA design (if exists), reliability NFRs with RTO/RPO targets
outputs: aidlc-docs/construction/dr-design/dr-architecture.md, aidlc-docs/construction/dr-design/backup-strategy.md, aidlc-docs/construction/dr-design/dr-design-questions.md
---

# Disaster Recovery Design

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-architect-agent persona from `agents/aidlc-architect-agent.md` and knowledge from `.claude/knowledge/aidlc-architect-agent/`.
Load aidlc-aws-platform-agent for AWS DR patterns.

### Step 2: Load Prior Context

- Read infrastructure design from `aidlc-docs/construction/infrastructure-design/`
- Read HA design from `aidlc-docs/construction/ha-design/` (if exists)
- Read reliability requirements from `aidlc-docs/construction/nfr-requirements/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What are the RTO targets (recovery time: minutes, hours, days)?
- What are the RPO targets (data loss tolerance: zero, minutes, hours)?
- What DR tier is appropriate (pilot light, warm standby, hot standby, multi-site active)?
- What data stores need cross-region replication?
- What is the DR drill frequency (quarterly, semi-annual)?
- What is the budget constraint for DR infrastructure?

Follow stage-protocol.md question flow.

### Step 4: Design DR Architecture

Create `dr-architecture.md`:

Select DR strategy based on RTO/RPO matrix:
- **Backup & Restore** (RTO: hours, RPO: hours) — S3 cross-region replication, periodic snapshots
- **Pilot Light** (RTO: 10-30min, RPO: minutes) — core infrastructure pre-provisioned, scale on activation
- **Warm Standby** (RTO: minutes, RPO: seconds-minutes) — scaled-down replica running, scale up on failover
- **Hot Standby / Multi-Site** (RTO: seconds, RPO: zero) — full replica, active-active or instant failover

For the selected strategy, document:
- Region topology (primary, secondary, rationale for region selection)
- Data replication (per data store: sync vs. async, lag budget)
- Infrastructure-as-code parity (CDK/Terraform runs in both regions)
- DNS failover (Route 53 health checks, failover records)
- Stateful component handling (databases, object stores, secrets)

### Step 5: Design Backup Strategy

Create `backup-strategy.md`:
- Backup schedule per data store (frequency, retention period)
- Backup types (full, incremental, continuous/PITR)
- Backup verification (automated restore tests)
- Encryption at rest for backups
- Cross-account backup copies (for ransomware protection)
- Recovery procedures (step-by-step for each data store)

### Step 6: Update State

Mark dr-design as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :rescue_worker_helmet:
Review path: `aidlc-docs/construction/dr-design/`
Standard 2-option approval (Approve / Request Changes).
