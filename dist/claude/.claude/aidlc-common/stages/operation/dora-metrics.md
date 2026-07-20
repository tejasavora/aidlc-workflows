---
slug: dora-metrics
phase: operation
execution: CONDITIONAL
condition: Execute when the team wants to track engineering effectiveness metrics. Typically run after each release or on a sprint cadence.
lead_agent: aidlc-pipeline-deploy-agent
support_agents:
  - aidlc-operations-agent
mode: inline
produces:
  - dora-report
  - dora-metrics-questions
consumes:
  - artifact: deployment-log
    required: false
  - artifact: ci-config
    required: false
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
inputs: Git history, CI/CD logs, deployment logs, incident records
outputs: aidlc-docs/governance/dora-metrics/dora-report.md, aidlc-docs/governance/dora-metrics/dora-metrics-questions.md
---

# DORA Metrics

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-pipeline-deploy-agent persona from `agents/aidlc-pipeline-deploy-agent.md` and knowledge from `.claude/knowledge/aidlc-pipeline-deploy-agent/`.

### Step 2: Gather Data Sources

Collect metrics from available sources:
- **Git history**: commit frequency, branch lifetime, merge frequency
- **CI/CD logs**: build times, deployment frequency, deployment success rate
- **Deployment logs**: time from commit to production, rollback events
- **Incident records**: outage duration, time to restore, change failure rate

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What time period to measure (last sprint, last month, last quarter)?
- What is the primary branch (main/master/develop)?
- What counts as a "deployment" (merge to main, production deploy, both)?
- What counts as a "failure" (rollback, hotfix, incident, all)?
- Are there existing DORA baselines to compare against?

Follow stage-protocol.md question flow.

### Step 4: Calculate Four Key Metrics

1. **Deployment Frequency**: how often code is deployed to production
   - Elite: multiple times per day
   - High: once per day to once per week
   - Medium: once per week to once per month
   - Low: less than once per month

2. **Lead Time for Changes**: time from commit to production
   - Elite: less than one hour
   - High: one day to one week
   - Medium: one week to one month
   - Low: more than one month

3. **Change Failure Rate**: percentage of deployments causing failures
   - Elite: 0-15%
   - High: 16-30%
   - Medium: 31-45%
   - Low: 46-60%

4. **Time to Restore Service (MTTR)**: time from failure detection to resolution
   - Elite: less than one hour
   - High: less than one day
   - Medium: one day to one week
   - Low: more than one week

### Step 5: Generate Report

Create `dora-report.md`:
- Measurement period and data sources
- Four metrics with values and DORA classification (Elite/High/Medium/Low)
- Trend comparison (vs. previous period, if data available)
- Contributing factors for each metric level
- Recommendations for improvement (specific process/tooling changes)
- Target metrics for next period

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :chart_with_upwards_trend:
- Summary of dora-report
- Review path: `<record>/operation/dora-metrics/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .claude/tools/aidlc-orchestrate.ts report --stage dora-metrics --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/dora-metrics/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/dora-metrics/required-sections-<iso>.md`.

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
- Verification check → new manifest at `.claude/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
