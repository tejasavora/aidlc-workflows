---
name: aidlc-drift-detection
description: |
  Detects manual changes to infrastructure that diverge from IaC definitions.
  Compares live cloud state against current IaC templates. Presents drifted resources
  with expected vs actual configuration for human decision: update IaC to match reality,
  or revert infra to match IaC. Tool-agnostic: cdk diff, terraform plan, driftctl,
  CloudFormation drift detection API, or custom. Does NOT auto-fix.
metadata:
  phase: operations
  stage: drift-detection
  per-unit: "false"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: operations
  max-attempts: 1
---

# IaC Drift Detection

Identify infrastructure resources that have been modified manually (outside of IaC) since the last successful deployment. Drift is a reliability and compliance risk: the actual infrastructure no longer matches what is version-controlled and reproducible.

## Activation Condition

Activates when:
1. A deployment has completed (post-deploy trigger), OR
2. Manually triggered for a scheduled periodic check (e.g., daily drift audit)

Requires `toolchain.yaml` → `infrastructure.iac_tool` to be configured. If absent, this skill is skipped.

## Inputs

- `aidlc-docs/<intent>/toolchain.yaml` → `infrastructure` section:
  ```yaml
  infrastructure:
    iac_tool: cdk              # cdk | terraform | cloudformation | driftctl | custom
    stack_names:               # CloudFormation stacks or Terraform workspaces to check
      - MyApp-Production
      - MyApp-DataLayer
    environment: production
    aws_region: us-east-1
    drift_check_scope: managed # managed | full (full checks unmanaged resources too)
  ```
- Infrastructure design documents: `aidlc-docs/<intent>/construction/*/infrastructure-design/`
- Current IaC templates/code (CDK, Terraform, or CloudFormation templates)
- Live cloud state (via IaC tool or cloud API)

## Execution

### Step 1: Run Drift Detection

Select and run the configured IaC tool's drift detection capability:

**AWS CDK:**
```bash
cdk diff --app "npx ts-node bin/app.ts" --stack MyApp-Production
# Output: + (added), - (removed), ~ (modified) resources
```

**Terraform:**
```bash
terraform plan -detailed-exitcode -out=tfplan.binary
terraform show -json tfplan.binary > tfplan.json
# exit code 2 = differences detected
```

**CloudFormation drift detection API:**
```bash
# Initiate drift detection
aws cloudformation detect-stack-drift --stack-name MyApp-Production \
  --output text --query 'StackDriftDetectionId'
# Poll for completion
aws cloudformation describe-stack-drift-detection-status \
  --stack-drift-detection-id $DETECTION_ID
# Get drifted resources
aws cloudformation describe-stack-resource-drifts \
  --stack-name MyApp-Production \
  --stack-resource-drift-status-filters MODIFIED DELETED
```

**driftctl:**
```bash
driftctl scan --output json://drift-results.json
```

**Custom:** read `infrastructure.drift_command` from toolchain.yaml and execute it.

If the tool is unfamiliar → invoke `knowledge-acquisition` meta-skill.

### Step 2: Parse Drift Results

For each drifted resource, extract:
- Resource ID / ARN
- Resource type (e.g., `AWS::Lambda::Function`, `aws_security_group`)
- Drift type: MODIFIED, DELETED, or NOT_CHECKED
- Property differences: expected value (IaC) vs actual value (live)

Filter by scope:
- `managed`: only resources managed by the IaC stack
- `full`: include unmanaged resources found in the account (requires driftctl or equivalent)

### Step 3: Classify and Assess Impact

For each drifted resource, classify the likely origin:

| Classification | Indicator | Risk |
|---|---|---|
| **HOTFIX** | Modified recently (< 7 days), matches known incident or outage window | May be intentional emergency change — verify with team |
| **CONFIG_DRIFT** | Modified > 7 days ago, no known incident context | Likely untracked manual change — high risk |
| **DELETED** | Resource expected by IaC is absent from live environment | Service disruption risk — investigate immediately |
| **UNKNOWN** | Cannot determine origin from available evidence | Treat as CONFIG_DRIFT |

Cross-reference with `aidlc-docs/<intent>/governance/audit-trail.jsonl` — if the change is tracked there (e.g., a manual hotfix during an incident), note it as HOTFIX with the audit event ID.

### Step 4: Produce Drift Detection Report

```markdown
## IaC Drift Detection Report

**Date:** 2024-01-15T09:00:00Z
**Tool:** AWS CloudFormation drift detection
**Stacks checked:** MyApp-Production, MyApp-DataLayer
**Environment:** production
**Total drifted resources:** 3

### Drifted Resources

#### 1. AWS::Lambda::Function — order-processor [MODIFIED — HOTFIX]

**Resource:** arn:aws:lambda:us-east-1:123456789:function:order-processor
**Drift type:** MODIFIED
**Classification:** HOTFIX (modified during incident 2024-01-14, audit-trail event: INC-042)

| Property | Expected (IaC) | Actual (live) |
|---|---|---|
| `MemorySize` | 256 | 512 |
| `Timeout` | 30 | 60 |

**Recommended action:**
- Option A: Update IaC to reflect hotfix values (makes IaC the source of truth again)
- Option B: Revert Lambda to IaC values if hotfix is no longer needed

#### 2. AWS::EC2::SecurityGroup — api-inbound [MODIFIED — CONFIG_DRIFT]

**Resource:** sg-0a1b2c3d4e5f
**Drift type:** MODIFIED
**Classification:** CONFIG_DRIFT (last modified 18 days ago, no audit-trail entry)

| Property | Expected (IaC) | Actual (live) |
|---|---|---|
| `SecurityGroupIngress[2].CidrIp` | `10.0.0.0/8` | `0.0.0.0/0` (open to internet) |

**Recommended action:**
- Option A: Revert to IaC (close the open ingress rule) — RECOMMENDED: security risk
- Option B: Update IaC to reflect current state — NOT recommended without security review

#### 3. AWS::SQS::Queue — dead-letter-queue [DELETED]

**Resource:** arn:aws:sqs:us-east-1:123456789:order-dlq
**Drift type:** DELETED
**Classification:** DELETED
**Impact:** Dead-letter messages from order-processor are currently being discarded

**Recommended action:**
- Redeploy the IaC stack to recreate the queue (Option A — strongly recommended)

### Decision Required

For each drifted resource, choose:
- Option A or Option B (see above)

Or mark as ACCEPTED-RISK with documented justification.
```

### Step 5: Present to Human for Decision

Present the full drift report. The human decides per resource:
- **Update IaC** to match live state (when drift was an intentional, approved change)
- **Revert infrastructure** to match IaC (when drift was unintentional or a security risk)
- **Accept as risk** with documented rationale (temporary exception)

Do NOT auto-reconcile. Drift could represent a critical hotfix that must NOT be overwritten, or a critical security breach that must be reverted immediately. Both require human judgment.

## Outputs

- `aidlc-docs/<intent>/operations/<env>/drift-detection-report.md`
  - All drifted resources with expected vs actual values
  - Classification (HOTFIX / CONFIG_DRIFT / DELETED)
  - Recommended actions with options
  - Human decisions documented

## No Auto-Fix Policy

`max-attempts: 1` — Drift reconciliation is never automated. The appropriate action depends on context that only a human can assess: was this a hotfix? A security change? An experiment? Each situation has a different correct response.
