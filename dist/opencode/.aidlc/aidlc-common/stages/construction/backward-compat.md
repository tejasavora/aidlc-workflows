---
slug: backward-compat
phase: construction
execution: CONDITIONAL
condition: Execute when the project exposes APIs, SDKs, or shared schemas consumed by other services or clients. Skip for standalone applications with no external consumers.
lead_agent: aidlc-architect-agent
support_agents:
  - aidlc-developer-agent
mode: inline
produces:
  - backward-compat-report
  - backward-compat-questions
consumes:
  - artifact: code-summary
    required: true
  - artifact: business-logic-model
    required: false
requires_stage:
  - code-generation
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
inputs: Generated code from code-generation, existing API specifications (if brownfield)
outputs: aidlc-docs/construction/backward-compat/backward-compat-report.md, aidlc-docs/construction/backward-compat/backward-compat-questions.md
---

# Backward Compatibility Validation

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-architect-agent persona from `agents/aidlc-architect-agent.md` and knowledge from `.aidlc/knowledge/aidlc-architect-agent/`.

### Step 2: Load Prior Context

- Read API specifications from `aidlc-docs/construction/*/functional-design/`
- Read code summary from `aidlc-docs/construction/*/code-generation/`
- If brownfield: read existing API schemas, OpenAPI specs, protobuf definitions, database schemas

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What API versioning strategy is used (URL path, header, query param)?
- What external consumers exist (other services, mobile apps, third-party integrations)?
- What is the deprecation policy (sunset period, communication)?
- Are there schema registries or contract repositories?

Follow stage-protocol.md question flow.

### Step 4: Detect Breaking Changes

Compare current code against baseline (git diff, schema diff, OpenAPI diff):
- **API surface**: removed endpoints, changed request/response shapes, new required fields
- **Database schema**: column removals, type changes, constraint additions
- **Event schemas**: changed event payloads, removed event types
- **SDK/library**: removed public methods, changed signatures, type narrowing

### Step 5: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE breaking changes detected AND attempt < max_attempts:
  1. CLASSIFY each break:
     - auto-fixable: add default value for new required field, keep old
       endpoint as alias, add schema migration step
     - needs-design-review: fundamental shape change, removed capability
     - acceptable-break: documented in migration guide with sunset timeline
  2. AUTO-FIX auto-fixable breaks (backward-compatible wrappers, aliases,
     default values, dual-write patterns)
  3. For needs-design-review: propose alternatives that preserve compatibility
  4. RE-CHECK compatibility
  5. attempt += 1

IF breaking changes remain after max_attempts:
  ESCALATE: present breaking changes with consumer impact assessment,
  migration guide draft, and sunset timeline proposal to user
```

### Step 6: Generate Report

Create `aidlc-docs/construction/backward-compat/backward-compat-report.md`:
- Compatibility check methodology and tools used
- Breaking changes found and classification
- Auto-remediated changes (what compatibility shims were added)
- Remaining breaks with migration guide and sunset timeline
- Consumer impact matrix

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :link:
- Summary of backward-compat-report
- Review path: `<record>/construction/backward-compat/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .aidlc/tools/aidlc-orchestrate.ts report --stage backward-compat --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/construction/backward-compat/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/backward-compat/required-sections-<iso>.md`.

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
