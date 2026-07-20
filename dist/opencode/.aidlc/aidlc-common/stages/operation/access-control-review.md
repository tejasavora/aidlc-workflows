---
slug: access-control-review
phase: operation
execution: CONDITIONAL
condition: Execute for enterprise or security-patch scope to audit IAM privilege, stale access, and MFA enforcement.
lead_agent: aidlc-devsecops-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - access-inventory
  - privilege-review-report
  - break-glass-audit
  - access-control-questions
consumes:
  - artifact: deployment-architecture
    required: false
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - security-patch
inputs: Deployed IAM policies, roles, users, service accounts
outputs: aidlc-docs/governance/access-control-review/access-inventory.md, aidlc-docs/governance/access-control-review/privilege-review-report.md, aidlc-docs/governance/access-control-review/break-glass-audit.md
---

# Access Control Review

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas
Load aidlc-devsecops-agent persona and knowledge.

### Step 2: Enumerate Access
- List all IAM roles, users, groups, and policies
- Identify service accounts and their attached policies
- Map: which service uses which role, which humans have which access

### Step 3: Detect Over-Privilege
- Run IAM Access Analyzer or policy simulator for each role
- Flag: wildcard actions (*), wildcard resources (*), unused permissions (via Access Advisor)
- Flag: roles not used in 90+ days (stale access)
- Verify: MFA enforced on all human accounts
- Verify: no root account usage (check CloudTrail for root events)

### Step 4: Audit Break-Glass
- Identify emergency access mechanisms (break-glass roles)
- Verify: break-glass usage is logged and alerted
- Verify: break-glass credentials are rotated after each use

### Step 5: Generate least-privilege recommendations per role

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :closed_lock_with_key:
- Summary of access-inventory, privilege-review-report, break-glass-audit
- Review path: `<record>/operation/access-control-review/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .aidlc/tools/aidlc-orchestrate.ts report --stage access-control-review --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/access-control-review/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/access-control-review/required-sections-<iso>.md`.

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
- Verification check → new manifest at `.aidlc/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
