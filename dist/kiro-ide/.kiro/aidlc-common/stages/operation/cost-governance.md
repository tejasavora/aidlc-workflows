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

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :dollar:
- Summary of cost-governance-policy, tagging-audit, anomaly-detection-config
- Review path: `<record>/operation/cost-governance/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .kiro/tools/aidlc-orchestrate.ts report --stage cost-governance --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/cost-governance/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/cost-governance/required-sections-<iso>.md`.

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
