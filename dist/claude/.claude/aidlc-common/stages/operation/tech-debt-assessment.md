---
slug: tech-debt-assessment
phase: operation
execution: CONDITIONAL
condition: Execute on-demand when the team wants a structured assessment of accumulated technical debt, or on a scheduled cadence (monthly/quarterly).
lead_agent: aidlc-architect-agent
support_agents:
  - aidlc-quality-agent
  - aidlc-developer-agent
mode: inline
produces:
  - tech-debt-inventory
  - remediation-roadmap
  - tech-debt-questions
consumes:
  - artifact: code-summary
    required: false
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
inputs: Existing codebase, test coverage data, dependency analysis, complexity metrics
outputs: aidlc-docs/maintenance/tech-debt-assessment/tech-debt-inventory.md, aidlc-docs/maintenance/tech-debt-assessment/remediation-roadmap.md, aidlc-docs/maintenance/tech-debt-assessment/tech-debt-questions.md
---

# Technical Debt Assessment

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-architect-agent persona from `agents/aidlc-architect-agent.md` and knowledge from `.claude/knowledge/aidlc-architect-agent/`.

### Step 2: Gather Metrics

Analyze the codebase across multiple dimensions:
- **Complexity**: cyclomatic complexity, cognitive complexity per function/file
- **Coverage**: test coverage gaps (files below threshold)
- **Staleness**: dependencies behind by major versions, deprecated API usage
- **Duplication**: code clones (similar blocks across files)
- **Coupling**: import graphs, circular dependencies, God objects
- **Documentation**: undocumented public APIs, stale README sections
- **Build health**: build time trends, flaky tests, warning count

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What areas of the codebase cause the most development friction?
- Are there known architectural decisions that need revisiting?
- What is the team's appetite for refactoring (sprint allocation percentage)?
- Are there upcoming features that would benefit from debt reduction first?

Follow stage-protocol.md question flow.

### Step 4: Generate Tech Debt Inventory

Create `tech-debt-inventory.md`:

For each debt item:
| ID | Category | Location | Severity | Effort | Impact | Priority |
|----|----------|----------|----------|--------|--------|----------|

Categories: complexity, coverage, staleness, duplication, coupling, documentation, architecture

Severity: high (blocks feature work), medium (slows development), low (cosmetic/preference)
Effort: T-shirt size (S/M/L/XL)
Impact: what improves if fixed (velocity, reliability, onboarding, security)

### Step 5: Generate Remediation Roadmap

Create `remediation-roadmap.md`:
- Quick wins (high impact, low effort) → do in next sprint
- Strategic investments (high impact, high effort) → plan as dedicated sprints
- Opportunistic (medium impact, low effort) → do alongside feature work
- Deferred (low impact) → revisit next assessment

For each recommended action:
- What to change (specific refactoring, upgrade, rewrite)
- Prerequisites (what must happen first)
- Risk assessment (what could break)
- Definition of done (measurable outcome)
- Estimated effort and timeline

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :wrench:
- Summary of tech-debt-inventory, remediation-roadmap
- Review path: `<record>/operation/tech-debt-assessment/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .claude/tools/aidlc-orchestrate.ts report --stage tech-debt-assessment --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/tech-debt-assessment/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/tech-debt-assessment/required-sections-<iso>.md`.

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
