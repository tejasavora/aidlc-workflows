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

### Step 7: Update State

Mark dr-validation as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :fire_engine:
Review path: `aidlc-docs/operation/dr-validation/`
Standard 2-option approval (Approve / Request Changes).
