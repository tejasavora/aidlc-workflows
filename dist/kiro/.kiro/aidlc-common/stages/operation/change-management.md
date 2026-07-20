---
slug: change-management
phase: operation
execution: CONDITIONAL
condition: Execute for enterprise scope in regulated environments requiring formal change control processes.
lead_agent: aidlc-compliance-agent
support_agents:
  - aidlc-pipeline-deploy-agent
mode: inline
produces:
  - change-management-process
  - deployment-window-policy
  - emergency-change-procedure
  - change-management-questions
consumes:
  - artifact: cd-config
    required: false
  - artifact: deployment-strategy
    required: false
requires_stage:
  - deployment-pipeline
sensors:
  - required-sections
scopes:
  - enterprise
inputs: Deployment pipeline configuration, compliance requirements
outputs: aidlc-docs/governance/change-management/change-management-process.md, aidlc-docs/governance/change-management/deployment-window-policy.md, aidlc-docs/governance/change-management/emergency-change-procedure.md
---

# Change Management

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas
Load aidlc-compliance-agent persona and knowledge.

### Step 2: Define Change Categories
- **Standard:** Pre-approved, low-risk (config change, minor UI fix) → auto-deploy within window
- **Normal:** Requires review (new feature, schema change) → approval + deploy window
- **Emergency:** Incident fix, security patch → expedited approval, any time, post-hoc review

### Step 3: Define Approval Workflows
- Standard: automated CI checks pass → auto-approve
- Normal: PR review + QA sign-off + release manager approval
- Emergency: single senior engineer approval + mandatory post-incident review within 48h

### Step 4: Define Deployment Windows
- Production changes: [defined hours] only (avoid Friday deploys, end-of-day deploys)
- Change freeze calendar (code freeze before major events/releases)
- Maintenance windows for infrastructure changes

### Step 5: Define Rollback Criteria
- Quantitative: error rate > X%, latency > Y ms, success rate < Z% → auto-rollback
- Time-based: if not stable within N minutes → rollback
- Manual: any team member can trigger rollback at any time

### Step 6: Update State
Mark change-management as `[x]` completed.

### Step 7: Present Completion & Request Approval
Completion emoji: :clipboard:
Standard 2-option approval.
