---
slug: ha-design
phase: construction
execution: CONDITIONAL
condition: Execute when availability targets exceed 99.9% SLA, or when the system serves production traffic with downtime impact. Skip for internal tools, dev-only services, or POCs.
lead_agent: aidlc-architect-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - ha-architecture
  - failover-strategy
  - ha-design-questions
consumes:
  - artifact: deployment-architecture
    required: true
  - artifact: infrastructure-services
    required: true
  - artifact: reliability-requirements
    required: false
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
inputs: Infrastructure design from infrastructure-design stage, reliability NFRs from nfr-requirements
outputs: aidlc-docs/construction/ha-design/ha-architecture.md, aidlc-docs/construction/ha-design/failover-strategy.md, aidlc-docs/construction/ha-design/ha-design-questions.md
---

# High Availability Design

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-architect-agent persona from `agents/aidlc-architect-agent.md` and knowledge from `.aidlc/knowledge/aidlc-architect-agent/`.
Load aidlc-aws-platform-agent for AWS-specific HA patterns.

### Step 2: Load Prior Context

- Read infrastructure design from `aidlc-docs/construction/infrastructure-design/`
- Read reliability requirements from `aidlc-docs/construction/nfr-requirements/`
- Read application design from `aidlc-docs/inception/application-design/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What is the target SLA (99.9%, 99.95%, 99.99%)?
- What is acceptable downtime per month (43m, 21m, 4m)?
- Is multi-AZ sufficient or is multi-region required?
- What are the stateful components (databases, caches, queues)?
- What is the blast radius tolerance (single component vs. entire system)?
- Are there regulatory requirements for data residency that constrain region selection?

Follow stage-protocol.md question flow.

### Step 4: Design HA Architecture

Create `ha-architecture.md`:
- **Compute layer**: multi-AZ deployment, auto-scaling groups, health checks, instance diversity
- **Data layer**: multi-AZ RDS/Aurora, read replicas, DynamoDB global tables, ElastiCache replication
- **Network layer**: multi-AZ ALB/NLB, Route 53 health checks, CloudFront failover origins
- **Messaging layer**: multi-AZ SQS/SNS, cross-region replication for critical queues
- **State management**: session affinity vs. stateless, distributed cache topology

For each component, document:
- Failure modes (AZ loss, instance failure, network partition)
- Detection mechanism (health check type, interval, threshold)
- Recovery action (auto-replace, failover, drain + redirect)
- Recovery time (seconds for auto-scaling, minutes for failover)

### Step 5: Design Failover Strategy

Create `failover-strategy.md`:
- **Active-active** vs. **active-passive** decision matrix per component
- Failover trigger conditions (health check failures, metric thresholds)
- Failover sequence (ordered steps with timing)
- Data consistency during failover (eventual consistency window, split-brain prevention)
- Failback procedure (manual vs. automatic, verification steps)
- Testing approach (how to validate failover works without impacting production)
- **DNS configuration:** TTL values for failover records (low TTL = faster failover, higher DNS load), Route 53 health check type and evaluation period, failover routing policy configuration
- **Session management:** Stateless design (preferred) or sticky sessions with session replication across AZs. If stateful: session store (Redis/DynamoDB) with cross-AZ replication, session failover verification

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :shield:
- Summary of ha-architecture, failover-strategy
- Review path: `<record>/construction/ha-design/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .aidlc/tools/aidlc-orchestrate.ts report --stage ha-design --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/construction/ha-design/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/ha-design/required-sections-<iso>.md`.
- **`upstream-coverage`** verifies the output prose references each artefact declared in this stage's `consumes:` frontmatter. Failure mode: missing upstream references emit `SENSOR_FAILED` listing each unreferenced artefact (this stage consumes `deployment-architecture`, `infrastructure-services`, `reliability-requirements`).

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
- Verification check → new manifest at `.aidlc/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
