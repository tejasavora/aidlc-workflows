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

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :clipboard:
- Summary of change-management-process, deployment-window-policy, emergency-change-procedure
- Review path: `<record>/operation/change-management/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .codex/tools/aidlc-orchestrate.ts report --stage change-management --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/change-management/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/change-management/required-sections-<iso>.md`.

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
- Verification check → new manifest at `.codex/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
