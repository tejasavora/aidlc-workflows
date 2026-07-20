---
slug: iac-execution
phase: operation
execution: CONDITIONAL
condition: Execute when infrastructure design produced IaC code (CDK, Terraform, CloudFormation) that needs to be deployed. Skip if using pre-existing infrastructure or sandbox-provisioning handled deployment.
lead_agent: aidlc-aws-platform-agent
support_agents:
  - aidlc-pipeline-deploy-agent
  - aidlc-devsecops-agent
mode: inline
produces:
  - iac-execution-log
  - deployed-resources
  - iac-execution-questions
consumes:
  - artifact: deployment-architecture
    required: true
  - artifact: infrastructure-services
    required: true
  - artifact: sandbox-inventory
    required: false
requires_stage:
  - infrastructure-design
workspace_requires: true
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - infra
  - workshop
inputs: Generated IaC code, infrastructure design, sandbox config (if sandbox-provisioning ran)
outputs: aidlc-docs/operation/iac-execution/iac-execution-log.md, aidlc-docs/operation/iac-execution/deployed-resources.md, aidlc-docs/operation/iac-execution/iac-execution-questions.md
---

# IaC Execution

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage ACTUALLY RUNS the infrastructure-as-code — `cdk deploy`, `terraform apply`, or `aws cloudformation create-stack`. It transforms IaC from a design document into deployed, running infrastructure.

## Why This Stage Exists

The upstream `infrastructure-design` stage produces a design document. The `deployment-pipeline` stage produces a pipeline configuration document. Neither actually provisions infrastructure. For autonomous execution, the system must:
1. Synthesize/validate the IaC template
2. Execute the deployment
3. Verify resources were created correctly
4. Handle and recover from deployment failures

## Steps

### Step 1: Load Agent Personas

Load aidlc-aws-platform-agent persona from `agents/aidlc-aws-platform-agent.md` and knowledge from `.claude/knowledge/aidlc-aws-platform-agent/`.

### Step 2: Detect IaC Tool

Identify what IaC tool the project uses:
- `cdk.json` or `CDKApp` → AWS CDK
- `*.tf` files → Terraform
- `template.yaml` / `template.json` → CloudFormation/SAM
- `Pulumi.yaml` → Pulumi

### Step 3: Pre-Deployment Validation

Before deploying, validate the IaC:

**CDK:**
```
cdk synth              # Synthesize CloudFormation template
cdk diff               # Show what will change
cfn-lint template.json # Lint the synthesized template
```

**Terraform:**
```
terraform init         # Initialize providers
terraform validate     # Syntax/semantic check
terraform plan         # Show execution plan (no changes applied)
```

**CloudFormation:**
```
cfn-lint template.yaml # Lint template
aws cloudformation validate-template --template-body file://template.yaml
```

If validation fails → enter self-healing loop to fix IaC code.

### Step 4: Security Pre-Check

Before deploying, verify security posture:
- No IAM policies with `"Action": "*"` on `"Resource": "*"`
- No security groups with `0.0.0.0/0` ingress on sensitive ports
- Encryption at rest enabled on all data stores
- No public access on S3 buckets (unless explicitly designed)
- Deletion protection enabled on stateful resources

If security issues found → fix before deploying (do NOT deploy insecure infrastructure).

### Step 5: Execute Deployment

**CDK:**
```
cdk deploy --all --require-approval never --outputs-file outputs.json
```

**Terraform:**
```
terraform apply -auto-approve -input=false
```

**CloudFormation:**
```
aws cloudformation create-stack / update-stack --stack-name <name> \
  --template-body file://template.yaml \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --parameters ParameterKey=...,ParameterValue=...
aws cloudformation wait stack-create-complete / stack-update-complete
```

### Step 6: Self-Healing on Deployment Failure

```
attempt = 0
max_attempts = 3

WHILE deployment fails AND attempt < max_attempts:
  1. READ deployment error:
     - CloudFormation: describe-stack-events → find FAILED resource
     - CDK: parse error output
     - Terraform: parse error output
  
  2. CLASSIFY error:
     - IAM insufficient permissions → add required permission to role
     - Resource limit exceeded → request increase or choose alternative
     - Invalid parameter → fix parameter value in IaC
     - Dependency not found → fix resource reference or ordering
     - Timeout → increase timeout or check resource health
     - Rollback triggered → investigate root cause resource
  
  3. FIX the IaC code based on classification
  
  4. RE-VALIDATE (Step 3)
  
  5. RE-DEPLOY (Step 5)
  
  attempt += 1

IF deployment still fails after max_attempts:
  ESCALATE with: error details, resources that failed, fixes attempted
```

### Step 7: Verify Deployed Resources

After successful deployment:
- Read stack outputs / terraform output / CDK outputs
- Verify each expected resource exists (describe API call)
- Verify resources are in healthy state (not CREATING/FAILED)
- Verify connectivity (can compute reach database, can LB reach compute)
- Record all resource ARNs and endpoints

### Step 8: Generate Artifacts

Create `iac-execution-log.md`:
- IaC tool and version
- Pre-deployment validation results
- Security pre-check results
- Deployment command and duration
- Self-healing cycles (if any) with error → fix details
- Final deployment status

Create `deployed-resources.md`:
- Stack/workspace identifier
- Per-resource: type, ARN/ID, status, endpoint (if applicable)
- Outputs (exported values, URLs, connection strings)
- Cost estimate (from deployed resource types)
- Tagging verification

### Step 9: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :building_construction:
- Summary of iac-execution-log, deployed-resources
- Review path: `<record>/operation/iac-execution/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .claude/tools/aidlc-orchestrate.ts report --stage iac-execution --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/iac-execution/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/iac-execution/required-sections-<iso>.md`.

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
