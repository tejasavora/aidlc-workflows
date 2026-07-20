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

Load aidlc-operations-agent persona from `agents/aidlc-operations-agent.md` and knowledge from `.kiro/knowledge/aidlc-operations-agent/`.

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

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :compass:
- Summary of drift-report
- Review path: `<record>/operation/drift-detection/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .kiro/tools/aidlc-orchestrate.ts report --stage drift-detection --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/drift-detection/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/drift-detection/required-sections-<iso>.md`.

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
- Verification check → new manifest at `.kiro/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
