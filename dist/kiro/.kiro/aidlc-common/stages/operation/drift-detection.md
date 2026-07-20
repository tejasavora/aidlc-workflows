---
slug: drift-detection
phase: operation
execution: CONDITIONAL
condition: Execute when infrastructure is managed by IaC and deployed environments need validation against source of truth. Skip if no IaC or for ephemeral environments.
lead_agent: aidlc-operations-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - drift-report
  - drift-detection-questions
consumes:
  - artifact: deployment-log
    required: true
  - artifact: deployment-architecture
    required: true
requires_stage:
  - deployment-execution
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - infra
inputs: Deployed infrastructure from deployment-execution, IaC definitions from infrastructure-design
outputs: aidlc-docs/operation/drift-detection/drift-report.md, aidlc-docs/operation/drift-detection/drift-detection-questions.md
---

# Infrastructure Drift Detection

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-operations-agent persona from `agents/aidlc-operations-agent.md` and knowledge from `.claude/knowledge/aidlc-operations-agent/`.

### Step 2: Load Prior Context

- Read infrastructure design from `aidlc-docs/construction/infrastructure-design/`
- Read deployment log from `aidlc-docs/operation/deployment-execution/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What IaC tool manages this infrastructure (CDK, Terraform, CloudFormation, Pulumi)?
- Which environments should be checked for drift (dev, staging, production)?
- Should drift detection run on schedule or on-demand?
- What drift is acceptable (auto-scaling changes) vs. alarming (security group changes)?

Follow stage-protocol.md question flow.

### Step 4: Execute Drift Detection

Compare deployed state against IaC source of truth:
- **CloudFormation/CDK**: `aws cloudformation detect-stack-drift`
- **Terraform**: `terraform plan` (detects differences between state and actual)
- **Pulumi**: `pulumi preview`

For each drifted resource, capture:
- Resource type and logical ID
- Expected configuration (from IaC)
- Actual configuration (from AWS API)
- Drift type (modified, deleted, added outside IaC)

### Step 5: Classify and Remediate

Classify each drift:
- **Benign**: auto-scaling adjustments, CloudWatch metric updates → document and ignore
- **Concerning**: security group rule changes, IAM policy modifications → alert and investigate
- **Critical**: encryption disabled, public access enabled, deletion protection removed → immediate action

For concerning/critical drift:
1. Determine if drift was intentional (check recent change logs, ask user)
2. If unintentional: propose IaC update to match desired state, or revert resource to IaC state
3. If intentional: update IaC to match new desired state (import into state)

### Step 6: Generate Report

Create `drift-report.md`:
- Environments checked and IaC tool used
- Summary: total resources checked, drifted count, by classification
- Detailed drift table (resource, expected, actual, classification, action)
- Remediation actions taken or recommended
- Suggested preventive measures (AWS Config rules, SCPs, drift alerts)

### Step 7: Update State

Mark drift-detection as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :compass:
Review path: `aidlc-docs/operation/drift-detection/`
Standard 2-option approval (Approve / Request Changes).
