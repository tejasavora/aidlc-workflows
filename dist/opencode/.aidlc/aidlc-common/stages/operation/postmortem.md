---
slug: postmortem
phase: operation
execution: CONDITIONAL
condition: Execute after a production incident is resolved, or after a significant deployment failure. Captures lessons learned in a blameless format.
lead_agent: aidlc-operations-agent
support_agents:
  - aidlc-architect-agent
mode: inline
produces:
  - postmortem-report
  - action-items
  - postmortem-questions
consumes:
  - artifact: incident-plan
    required: false
  - artifact: deployment-log
    required: false
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - workshop
inputs: Incident timeline, monitoring data, deployment logs, on-call notes
outputs: aidlc-docs/maintenance/postmortem/postmortem-report.md, aidlc-docs/maintenance/postmortem/action-items.md, aidlc-docs/maintenance/postmortem/postmortem-questions.md
---

# Postmortem

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Blameless Principle

This postmortem follows a blameless approach: focus on systemic causes and process improvements, never on individual fault. People make the best decisions they can with the information available. The goal is to make the system more resilient, not to assign blame.

## Steps

### Step 1: Load Agent Personas

Load aidlc-operations-agent persona from `agents/aidlc-operations-agent.md` and knowledge from `.aidlc/knowledge/aidlc-operations-agent/`.

### Step 2: Gather Incident Context

Collect from available sources:
- Incident timeline (detection → response → mitigation → resolution)
- Monitoring data (which alarms fired, metric graphs)
- Deployment history (what changed before the incident)
- Communication log (who was paged, response times)
- Customer impact (duration, affected users, SLO burn)

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What was the user-visible impact and duration?
- What was the detection mechanism (alarm, user report, monitoring)?
- What was the time to detect (TTD) and time to resolve (TTR)?
- What contributing factors led to the incident?
- What went well during response?
- What could be improved in detection, response, or prevention?

Follow stage-protocol.md question flow.

### Step 4: Generate Postmortem Report

Create `postmortem-report.md`:

```
## Incident Summary
- Date/Time: [start] — [resolved]
- Duration: [total]
- Severity: [P1-P4]
- Customer Impact: [description]
- SLO Budget Consumed: [percentage]

## Timeline
| Time | Event |
|------|-------|
| ... | ... |

## Root Cause
[5-Whys or contributing factor analysis]

## Contributing Factors
1. [Factor 1 — systemic, not individual]
2. [Factor 2]

## What Went Well
- [Detection was fast because...]
- [Rollback was smooth because...]

## What Could Be Improved
- [Detection gap: ...]
- [Response gap: ...]
- [Prevention gap: ...]

## Lessons Learned
- [Lesson linked to AI-DLC phase/stage improvement]
```

### Step 5: Generate Action Items

Create `action-items.md`:

Each action item linked to an AI-DLC stage for implementation:
| ID | Action | Owner | Priority | AI-DLC Stage | Due |
|----|--------|-------|----------|-------------|-----|
| 1 | Add alarm for [metric] | [team] | P1 | observability-setup | [date] |
| 2 | Add circuit breaker for [dependency] | [team] | P2 | code-generation | [date] |
| 3 | Update runbook for [scenario] | [team] | P2 | incident-response | [date] |

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :memo:
- Summary of postmortem-report, action-items
- Review path: `<record>/operation/postmortem/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .aidlc/tools/aidlc-orchestrate.ts report --stage postmortem --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/postmortem/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/postmortem/required-sections-<iso>.md`.

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
