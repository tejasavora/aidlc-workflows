---
slug: on-call-operations
phase: operation
execution: CONDITIONAL
condition: Execute for enterprise scope when the system requires on-call coverage and incident response readiness.
lead_agent: aidlc-operations-agent
support_agents:
  - aidlc-delivery-agent
mode: inline
produces:
  - on-call-schedule
  - escalation-policy
  - game-day-plan
  - on-call-questions
consumes:
  - artifact: incident-plan
    required: true
  - artifact: chaos-results
    required: false
requires_stage:
  - incident-response
sensors:
  - required-sections
scopes:
  - enterprise
inputs: Incident response plan, chaos engineering results, team information
outputs: aidlc-docs/operation/on-call-operations/on-call-schedule.md, aidlc-docs/operation/on-call-operations/escalation-policy.md, aidlc-docs/operation/on-call-operations/game-day-plan.md
---

# On-Call Operations

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas
Load aidlc-operations-agent persona and knowledge.

### Step 2: Design On-Call Rotation
- Define rotation cadence (weekly, bi-weekly)
- Define handoff procedures (runbook review, open incidents, known issues)
- Define response SLAs per severity (SEV1: 15min, SEV2: 30min, SEV3: 4hr)
- Define burnout prevention (max consecutive on-call days, comp time)

### Step 3: Design Escalation Policy
- Primary → Secondary → Engineering Manager → VP (with time thresholds)
- Auto-escalation if acknowledgment SLA missed
- Multi-channel notification (PagerDuty/phone + Slack + email)

### Step 4: Plan Game Days
From chaos-engineering results, design structured exercises:
- Scenario: inject known failure mode
- Objective: team detects, diagnoses, and resolves within SLA
- Measurement: MTTD, MTTR, communication quality
- Frequency: quarterly minimum

### Step 5: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :telephone_receiver:
- Summary of on-call-schedule, escalation-policy, game-day-plan
- Review path: `<record>/operation/on-call-operations/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun {{HARNESS_DIR}}/tools/aidlc-orchestrate.ts report --stage on-call-operations --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/on-call-operations/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/on-call-operations/required-sections-<iso>.md`.

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
- Verification check → new manifest at `{{HARNESS_DIR}}/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
