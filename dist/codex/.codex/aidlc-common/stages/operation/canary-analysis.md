---
slug: canary-analysis
phase: operation
execution: CONDITIONAL
condition: Execute when deployment strategy is canary or blue/green with traffic shifting. Skip for single-environment direct deployments.
lead_agent: aidlc-pipeline-deploy-agent
support_agents:
  - aidlc-operations-agent
mode: inline
produces:
  - canary-config
  - canary-results
  - canary-analysis-questions
consumes:
  - artifact: deployment-strategy
    required: true
  - artifact: deployment-log
    required: true
  - artifact: dashboards
    required: false
requires_stage:
  - deployment-execution
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - workshop
inputs: Deployment strategy from deployment-pipeline, deployment log from deployment-execution, observability dashboards
outputs: aidlc-docs/operation/canary-analysis/canary-config.md, aidlc-docs/operation/canary-analysis/canary-results.md, aidlc-docs/operation/canary-analysis/canary-analysis-questions.md
---

# Canary Analysis

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-pipeline-deploy-agent persona from `agents/aidlc-pipeline-deploy-agent.md` and knowledge from `.codex/knowledge/aidlc-pipeline-deploy-agent/`.

### Step 2: Load Prior Context

- Read deployment strategy from `aidlc-docs/operation/deployment-pipeline/`
- Read deployment log from `aidlc-docs/operation/deployment-execution/`
- Read observability config from `aidlc-docs/operation/observability-setup/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What percentage of traffic should the canary receive (5%, 10%, 25%)?
- What metrics determine canary health (error rate, latency p99, saturation)?
- What is the bake time before promoting (5min, 15min, 30min)?
- What thresholds trigger automatic rollback?
- Should promotion be automatic or require human approval?

Follow stage-protocol.md question flow.

### Step 4: Configure Canary

Create `canary-config.md`:
- Traffic splitting configuration (weighted routing, header-based, percentage)
- Health metrics and thresholds:
  - Error rate: canary error rate must not exceed baseline + X%
  - Latency p99: canary must not exceed baseline p99 + Yms
  - Success rate: must remain above Z%
- Bake time per promotion step (e.g., 5% → 25% → 50% → 100%)
- Rollback trigger conditions (automatic rollback thresholds)
- CloudWatch alarms for canary-specific metrics

### Step 5: Execute Canary Analysis

Monitor canary deployment against baseline:
1. Collect baseline metrics from existing production traffic
2. Route configured traffic percentage to canary
3. Compare canary metrics against baseline over bake period
4. Decision logic:
   - **PROMOTE** if: all metrics within thresholds for full bake time
   - **ROLLBACK** if: any metric breaches threshold
   - **EXTEND** if: metrics are borderline (increase bake time)

### Step 6: Generate Results

Create `canary-results.md`:
- Canary configuration summary
- Baseline metrics (before canary)
- Canary metrics (during analysis)
- Comparison table (metric | baseline | canary | threshold | verdict)
- Decision: PROMOTED / ROLLED BACK / EXTENDED
- Timeline of traffic shifts
- If rolled back: root cause analysis (which metric breached, by how much)

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :canary:
- Summary of canary-config, canary-results
- Review path: `<record>/operation/canary-analysis/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .codex/tools/aidlc-orchestrate.ts report --stage canary-analysis --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/canary-analysis/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/canary-analysis/required-sections-<iso>.md`.

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
