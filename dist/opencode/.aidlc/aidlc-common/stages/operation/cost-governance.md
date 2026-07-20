---
slug: cost-governance
phase: operation
execution: CONDITIONAL
condition: Execute when cloud infrastructure requires ongoing cost discipline — budget enforcement, tag compliance, orphan detection.
lead_agent: aidlc-operations-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - cost-governance-policy
  - tagging-audit
  - anomaly-detection-config
  - cost-governance-questions
consumes:
  - artifact: cost-estimate
    required: false
  - artifact: deployed-resources
    required: false
requires_stage:
  - cost-estimation
sensors:
  - required-sections
scopes:
  - enterprise
  - infra
inputs: Cost estimation from construction, deployed resource inventory
outputs: aidlc-docs/governance/cost-governance/cost-governance-policy.md, aidlc-docs/governance/cost-governance/tagging-audit.md, aidlc-docs/governance/cost-governance/anomaly-detection-config.md
---

# Cost Governance

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas
Load aidlc-operations-agent persona and knowledge.

### Step 2: Audit Resource Tagging
- Verify ALL resources have mandatory tags (Environment, Project, Owner, CostCenter)
- Flag untagged resources (orphans that can't be attributed)
- Verify tag values are from controlled vocabulary (not free-form)

### Step 3: Configure Budget Alerts
- Set monthly budget alert at 50%, 80%, 100% of target
- Configure anomaly detection (AWS Cost Anomaly Detection) for unexpected spikes
- Define action on breach: alert only (80%), auto-scale-down non-critical (100%), emergency review (120%)

### Step 4: Detect Orphan Resources
- Identify unused EBS volumes, unattached EIPs, idle load balancers
- Identify resources in terminated/failed stacks
- Identify dev/test resources running 24/7 that should be scheduled

### Step 5: Savings Plan Evaluation
- Compare on-demand spend vs. reserved/savings plan pricing
- Recommend commitment based on baseline utilization
- Calculate ROI of scheduling (dev environments off nights/weekends)

### Step 6: Update State
Mark cost-governance as `[x]` completed.

### Step 7: Present Completion & Request Approval
Completion emoji: :dollar:
Standard 2-option approval.
