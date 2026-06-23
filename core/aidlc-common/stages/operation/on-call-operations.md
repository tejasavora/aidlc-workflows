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

### Step 5: Update State
Mark on-call-operations as `[x]` completed.

### Step 6: Present Completion & Request Approval
Completion emoji: :telephone_receiver:
Standard 2-option approval.
