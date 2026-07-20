---
slug: api-governance
phase: operation
execution: CONDITIONAL
condition: Execute when the system exposes APIs consumed by external clients or other services and needs lifecycle management.
lead_agent: aidlc-architect-agent
support_agents:
  - aidlc-developer-agent
mode: inline
produces:
  - api-lifecycle-plan
  - deprecation-schedule
  - api-registry
  - api-governance-questions
consumes:
  - artifact: backward-compat-report
    required: false
  - artifact: code-summary
    required: true
requires_stage:
  - backward-compat
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
inputs: API specifications, backward compatibility report, generated code
outputs: aidlc-docs/governance/api-governance/api-lifecycle-plan.md, aidlc-docs/governance/api-governance/deprecation-schedule.md, aidlc-docs/governance/api-governance/api-registry.md
---

# API Governance

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas
Load aidlc-architect-agent persona and knowledge.

### Step 2: Build API Registry
Catalog all API endpoints: URL, method, version, consumers, authentication, rate limits.

### Step 3: Lifecycle Management
- Define versioning strategy (URL-based /v1, header-based, query param)
- Define deprecation policy (sunset period, sunset header in responses, consumer notification)
- Verify: deprecated endpoints emit Sunset header with date
- Verify: SDK generation from OpenAPI spec produces correct client code
- Audit: rate limits are fair across consumers (no single consumer starving others)

### Step 4: Generate deprecation schedule for any marked-for-removal endpoints

### Step 5: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :globe_with_meridians:
- Summary of api-lifecycle-plan, deprecation-schedule, api-registry
- Review path: `<record>/operation/api-governance/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .kiro/tools/aidlc-orchestrate.ts report --stage api-governance --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/api-governance/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/api-governance/required-sections-<iso>.md`.

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
