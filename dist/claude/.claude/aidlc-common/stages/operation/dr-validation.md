---
slug: dr-validation
phase: operation
execution: CONDITIONAL
condition: Execute when DR design exists and needs validation through a drill. Typically run quarterly or after significant infrastructure changes.
lead_agent: aidlc-operations-agent
support_agents:
  - aidlc-aws-platform-agent
  - aidlc-pipeline-deploy-agent
mode: inline
produces:
  - dr-drill-plan
  - dr-drill-results
  - dr-validation-questions
consumes:
  - artifact: dr-architecture
    required: true
  - artifact: deployment-log
    required: true
requires_stage:
  - deployment-execution
sensors:
  - required-sections
scopes:
  - enterprise
  - workshop
inputs: DR design from construction phase, deployed infrastructure, backup configuration
outputs: aidlc-docs/operation/dr-validation/dr-drill-plan.md, aidlc-docs/operation/dr-validation/dr-drill-results.md, aidlc-docs/operation/dr-validation/dr-validation-questions.md
---

# Disaster Recovery Validation

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-operations-agent persona from `agents/aidlc-operations-agent.md` and knowledge from `.claude/knowledge/aidlc-operations-agent/`.

### Step 2: Load Prior Context

- Read DR design from `aidlc-docs/construction/dr-design/`
- Read backup strategy from `aidlc-docs/construction/dr-design/`
- Read deployment log from `aidlc-docs/operation/deployment-execution/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What type of DR drill to run (tabletop, partial failover, full failover)?
- What environment to use for the drill (DR region, isolated replica)?
- What is the RTO target to validate (minutes)?
- What is the RPO target to validate (data loss tolerance)?
- Who needs to be involved (on-call, leadership notification)?
- What is the rollback plan if the drill causes unexpected issues?

Follow stage-protocol.md question flow.

### Step 4: Design DR Drill

Create `dr-drill-plan.md`:
- Drill type and scope
- Pre-drill checklist (notifications, monitoring, backup verification)
- Step-by-step failover procedure
- Validation checkpoints (data integrity, service availability, latency)
- Timing measurement points (start → DNS switch → service available → data verified)
- Communication plan (who to notify at each stage)
- Abort criteria and rollback procedure

### Step 5: Execute DR Drill

Run the drill with timing measurements:
1. **Start clock**: mark drill initiation time
2. **Verify backups**: confirm backup recency matches RPO target
3. **Initiate failover**: execute the recovery procedure
4. **Measure RTO**: time from initiation to service available in DR region
5. **Verify data**: compare data in DR region against RPO target (acceptable data loss?)
6. **Functional validation**: run smoke tests against recovered service
7. **Stop clock**: mark drill completion time
8. **Failback** (if applicable): restore to primary region

### Step 6: Generate Results

Create `dr-drill-results.md`:
- Drill summary (type, scope, date, participants)
- RTO measurement: target vs. actual (e.g., target 15min, actual 22min)
- RPO measurement: target vs. actual (e.g., target 5min, actual 3min data loss)
- Pass/fail per validation checkpoint
- Issues encountered during drill
- Gaps identified (missing automation, unclear runbook steps, slow DNS propagation)
- Recommendations for DR design improvements
- Next drill schedule

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :fire_engine:
- Summary of dr-drill-plan, dr-drill-results
- Review path: `<record>/operation/dr-validation/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .claude/tools/aidlc-orchestrate.ts report --stage dr-validation --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/dr-validation/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/dr-validation/required-sections-<iso>.md`.

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
