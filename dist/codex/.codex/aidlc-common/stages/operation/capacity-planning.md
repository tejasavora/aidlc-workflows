---
slug: capacity-planning
phase: operation
execution: CONDITIONAL
condition: Execute when the system serves production traffic and needs forward-looking capacity analysis. Projects future needs based on growth trends and validates auto-scaling ceilings.
lead_agent: aidlc-operations-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - capacity-model
  - growth-projections
  - scaling-ceiling-report
  - capacity-planning-questions
consumes:
  - artifact: load-test-results
    required: false
  - artifact: dashboards
    required: true
  - artifact: deployment-architecture
    required: true
requires_stage:
  - performance-validation
  - observability-setup
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - infra
inputs: Performance validation results, observability data, infrastructure design
outputs: aidlc-docs/operation/capacity-planning/capacity-model.md, aidlc-docs/operation/capacity-planning/growth-projections.md, aidlc-docs/operation/capacity-planning/scaling-ceiling-report.md
---

# Capacity Planning

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-operations-agent persona from `agents/aidlc-operations-agent.md` and knowledge from `.codex/knowledge/aidlc-operations-agent/`.

### Step 2: Analyze Current Utilization

From observability data and load test results:
- Current peak traffic (RPS, concurrent users, data volume)
- Current resource utilization at peak (CPU, memory, network, storage, IOPS)
- Current auto-scaling configuration (min/max/desired, scaling policies, cooldown)
- Database connection pool utilization at peak
- Queue depth and consumer lag at peak

### Step 3: Generate Clarifying Questions

- What is the expected growth rate (monthly/quarterly traffic increase)?
- Are there seasonal spikes (Black Friday, end of quarter, marketing campaigns)?
- What is the headroom target (how much spare capacity to maintain)?
- Are there known upcoming features that will change traffic patterns?
- What is the budget ceiling for infrastructure growth?

### Step 4: Build Capacity Model

Create `capacity-model.md`:
- Per-resource capacity ceiling (max instances × per-instance throughput = system max)
- Bottleneck identification (which resource hits ceiling first: compute, DB, network, storage)
- Auto-scaling effectiveness (how quickly can the system scale vs. traffic spike speed)
- Single points of capacity failure (components that cannot scale horizontally)

### Step 5: Project Growth

Create `growth-projections.md`:
- 3-month / 6-month / 12-month traffic projections
- Resource requirements at each projection point
- Cost projection at each growth point
- When current architecture hits ceiling (the "we must re-architect" date)
- Early warning thresholds (at X% utilization, begin planning next tier)

### Step 6: Document Scaling Ceiling

Create `scaling-ceiling-report.md`:
- Per-service maximum throughput (measured, not theoretical)
- Database maximum connections / IOPS / storage before requiring vertical scale
- API Gateway / ALB limits (requests per second, concurrent connections)
- Lambda concurrency limits, SQS throughput limits
- Recommendations: what to do when ceiling is reached (vertical scale, horizontal partition, architecture change)

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :chart_with_upwards_trend:
- Summary of capacity-model, growth-projections, scaling-ceiling-report
- Review path: `<record>/operation/capacity-planning/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .codex/tools/aidlc-orchestrate.ts report --stage capacity-planning --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/capacity-planning/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/capacity-planning/required-sections-<iso>.md`.

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
