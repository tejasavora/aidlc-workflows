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

Load aidlc-operations-agent persona from `agents/aidlc-operations-agent.md` and knowledge from `.claude/knowledge/aidlc-operations-agent/`.

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

### Step 6: Update State

Mark postmortem as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :memo:
Review path: `aidlc-docs/maintenance/postmortem/`
Standard 2-option approval (Approve / Request Changes).
