---
slug: compliance-evidence
phase: operation
execution: CONDITIONAL
condition: Execute when regulatory frameworks are declared (SOC2, HIPAA, PCI-DSS, ISO27001) or when compliance evidence collection is needed for audits.
lead_agent: aidlc-compliance-agent
support_agents:
  - aidlc-devsecops-agent
mode: inline
produces:
  - evidence-collection
  - control-mapping
  - compliance-evidence-questions
consumes:
  - artifact: security-scan-report
    required: false
  - artifact: build-test-results
    required: false
  - artifact: deployment-log
    required: false
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - security-patch
inputs: All AI-DLC artifacts (requirements, designs, code, tests, deployments), security scan results, access logs
outputs: aidlc-docs/governance/compliance-evidence/evidence-collection.md, aidlc-docs/governance/compliance-evidence/control-mapping.md, aidlc-docs/governance/compliance-evidence/compliance-evidence-questions.md
---

# Compliance Evidence Collection

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-compliance-agent persona from `agents/aidlc-compliance-agent.md` and knowledge from `.claude/knowledge/aidlc-compliance-agent/`.

### Step 2: Load Prior Context

- Read all available AI-DLC artifacts across phases
- Read security scan results from `aidlc-docs/construction/security-scan/`
- Read deployment logs from `aidlc-docs/operation/deployment-execution/`
- Read audit trail (if aidlc-audit.ts events exist)

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What compliance frameworks apply (SOC2, HIPAA, PCI-DSS, ISO27001, FedRAMP)?
- What is the audit scope (full system, specific components)?
- What evidence format is required (narrative, screenshots, log exports)?
- Who is the auditor audience (internal audit, external auditor, regulator)?
- What control period applies (last quarter, last year)?

Follow stage-protocol.md question flow.

### Step 4: Map Controls to Evidence

Create `control-mapping.md`:

For each applicable framework, map controls to AI-DLC artifacts:

**SOC2 example:**
| Control | Category | Evidence Source | AI-DLC Artifact |
|---------|----------|----------------|-----------------|
| CC6.1 | Logical Access | IAM policies | infrastructure-design |
| CC7.1 | Change Management | PR reviews, approvals | audit trail, code-review |
| CC7.2 | System Monitoring | CloudWatch config | observability-setup |
| CC8.1 | Incident Management | Runbooks, postmortems | incident-response, postmortem |

### Step 5: Collect Evidence

For each control, gather the evidence artifact:
- Extract relevant sections from AI-DLC documents
- Capture configuration snapshots (IAM policies, security groups, encryption settings)
- Export audit logs for the control period
- Collect approval records (gate approvals from stage-protocol)
- Screenshot monitoring dashboards where applicable

### Step 6: Generate Evidence Collection

Create `evidence-collection.md`:
- Evidence index (control ID → evidence location → status)
- For each control: evidence narrative + artifact reference + gap analysis
- Overall compliance posture: percentage of controls with evidence
- Gaps: controls without sufficient evidence, with remediation recommendations
- Evidence freshness: when each piece of evidence was last validated

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :clipboard:
- Summary of evidence-collection, control-mapping
- Review path: `<record>/operation/compliance-evidence/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .claude/tools/aidlc-orchestrate.ts report --stage compliance-evidence --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/compliance-evidence/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/compliance-evidence/required-sections-<iso>.md`.

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
