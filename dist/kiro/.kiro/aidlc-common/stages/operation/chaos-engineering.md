---
slug: chaos-engineering
phase: operation
execution: CONDITIONAL
condition: Execute when resilience validation is needed — after deployment to staging/production, when HA/DR designs need verification, or when SLOs include availability targets above 99.9%.
lead_agent: aidlc-operations-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - chaos-experiment-plan
  - chaos-results
  - chaos-engineering-questions
consumes:
  - artifact: ha-architecture
    required: false
  - artifact: dr-architecture
    required: false
  - artifact: deployment-log
    required: true
  - artifact: dashboards
    required: true
requires_stage:
  - deployment-execution
  - observability-setup
sensors:
  - required-sections
scopes:
  - enterprise
  - workshop
inputs: Deployed application, HA/DR designs, observability dashboards
outputs: aidlc-docs/operation/chaos-engineering/chaos-experiment-plan.md, aidlc-docs/operation/chaos-engineering/chaos-results.md, aidlc-docs/operation/chaos-engineering/chaos-engineering-questions.md
---

# Chaos Engineering

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-operations-agent persona from `agents/aidlc-operations-agent.md` and knowledge from `.kiro/knowledge/aidlc-operations-agent/`.

### Step 2: Load Prior Context

- Read HA design from `aidlc-docs/construction/ha-design/` (if exists)
- Read DR design from `aidlc-docs/construction/dr-design/` (if exists)
- Read observability setup from `aidlc-docs/operation/observability-setup/`
- Read deployment architecture from `aidlc-docs/construction/infrastructure-design/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What chaos tool to use (AWS Fault Injection Service, Litmus, Gremlin, custom scripts)?
- What environment to target (staging first, then production)?
- What failure modes to test (AZ failure, instance termination, network partition, dependency timeout)?
- What is the blast radius limit (single instance, single AZ, single service)?
- What are the abort conditions (error rate > X%, latency > Y ms)?
- Is there a maintenance window requirement for production experiments?

Follow stage-protocol.md question flow.

### Step 4: Design Experiments

Create `chaos-experiment-plan.md`:

For each experiment:
- **Hypothesis**: "The system will [expected behavior] when [failure condition]"
- **Injection method**: what fault to inject (instance kill, latency injection, DNS failure, disk full)
- **Blast radius**: scope of impact (single instance, single AZ, percentage of fleet)
- **Steady-state metrics**: what metrics prove the system is healthy
- **Abort conditions**: when to stop the experiment immediately
- **Duration**: how long to maintain the fault
- **Rollback**: how to undo the injection if abort triggers

Progressive complexity:
1. Single instance termination (compute resilience)
2. Dependency latency injection (timeout/retry resilience)
3. AZ failure simulation (HA design validation)
4. Network partition (split-brain detection)
5. Memory/CPU pressure (auto-scaling validation)
6. Per-dependency circuit breaker tuning (inject latency at each dependency, verify breaker opens at configured threshold, verify half-open recovery)
7. Game day exercise scenario (structured team exercise: inject failure, observe team response, measure MTTD/MTTR, compare against SLA)

### Step 5: Execute Experiments

For each experiment:
1. Verify steady-state metrics are healthy (pre-experiment baseline)
2. Start monitoring dashboards and set abort alarms
3. Inject fault
4. Observe system behavior vs. hypothesis
5. Record metrics during experiment
6. Remove fault injection
7. Verify system returns to steady state
8. Record findings

### Step 6: Generate Results

Create `chaos-results.md`:
- Experiment summary table (hypothesis | result | finding)
- Detailed results per experiment:
  - Metrics during injection (latency, errors, throughput)
  - System behavior vs. hypothesis (confirmed/falsified)
  - Recovery time after fault removal
  - Gaps discovered (missing circuit breaker, slow failover, no retry)
- Remediation recommendations for gaps found
- Confidence assessment: which failure modes are validated vs. untested

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :boom:
- Summary of chaos-experiment-plan, chaos-results
- Review path: `<record>/operation/chaos-engineering/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .kiro/tools/aidlc-orchestrate.ts report --stage chaos-engineering --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/chaos-engineering/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/chaos-engineering/required-sections-<iso>.md`.

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
