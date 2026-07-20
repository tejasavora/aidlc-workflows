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

Load aidlc-architect-agent persona from `agents/aidlc-architect-agent.md` and knowledge from `.kiro/knowledge/aidlc-architect-agent/`.
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

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :rescue_worker_helmet:
- Summary of dr-architecture, backup-strategy
- Review path: `<record>/construction/dr-design/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .kiro/tools/aidlc-orchestrate.ts report --stage dr-design --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/construction/dr-design/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/dr-design/required-sections-<iso>.md`.
- **`upstream-coverage`** verifies the output prose references each artefact declared in this stage's `consumes:` frontmatter. Failure mode: missing upstream references emit `SENSOR_FAILED` listing each unreferenced artefact (this stage consumes `deployment-architecture`, `ha-architecture`, `reliability-requirements`).

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
