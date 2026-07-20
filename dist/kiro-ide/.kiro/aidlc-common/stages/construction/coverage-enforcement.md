---
slug: coverage-enforcement
phase: construction
execution: CONDITIONAL
condition: Execute when coverage thresholds are defined in NFR requirements or team practices. Skip if no coverage targets set.
lead_agent: aidlc-quality-agent
support_agents: []
mode: inline
produces:
  - coverage-report
  - coverage-enforcement-questions
consumes:
  - artifact: build-test-results
    required: true
  - artifact: code-summary
    required: true
requires_stage:
  - build-and-test
workspace_requires: true
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - workshop
inputs: Test results from build-and-test stage, code summary from code-generation
outputs: aidlc-docs/construction/coverage-enforcement/coverage-report.md, aidlc-docs/construction/coverage-enforcement/coverage-enforcement-questions.md
---

# Coverage Enforcement

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-quality-agent persona from `agents/aidlc-quality-agent.md` and knowledge from `.kiro/knowledge/aidlc-quality-agent/`.

### Step 2: Determine Thresholds

Read coverage targets from (priority order):
1. `aidlc/spaces/<active-space>/memory/team.md` → `## Testing` section (affirmed practices)
2. NFR requirements from `aidlc-docs/construction/nfr-requirements/`
3. Default thresholds: 80% line coverage, 70% branch coverage

### Step 3: Measure Coverage

Run the project's coverage tool:
- Python: pytest-cov, coverage.py
- TypeScript/JS: Istanbul/nyc, c8, vitest --coverage
- Java: JaCoCo, Cobertura
- Go: go test -coverprofile
- .NET: coverlet, dotCover

Produce per-file and aggregate metrics: line coverage, branch coverage, function coverage.

### Step 4: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE coverage < threshold AND attempt < max_attempts:
  1. IDENTIFY uncovered code:
     - List files below threshold with specific uncovered lines/branches
     - Classify: testable logic vs. infrastructure/boilerplate vs. error paths
  2. GENERATE missing tests:
     - Write tests for uncovered testable logic (prioritize by business criticality)
     - Skip infrastructure boilerplate (constructors, getters, DI wiring)
     - Add edge-case tests for uncovered branches
  3. RUN tests to verify new tests pass
  4. RE-MEASURE coverage
  5. attempt += 1

IF coverage still below threshold after max_attempts:
  ESCALATE: present coverage gap report with justification for
  which uncovered code is acceptable (infra, generated, third-party wrappers)
```

### Step 5: Generate Report

Create `aidlc-docs/construction/coverage-enforcement/coverage-report.md`:
- Coverage tool and configuration
- Aggregate metrics (line, branch, function) vs. thresholds
- Per-unit breakdown
- Files below threshold (with justification if acceptable)
- Tests added during self-healing
- Coverage trend (if prior measurements exist)

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :bar_chart:
- Summary of coverage-report
- Review path: `<record>/construction/coverage-enforcement/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .kiro/tools/aidlc-orchestrate.ts report --stage coverage-enforcement --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/construction/coverage-enforcement/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/coverage-enforcement/required-sections-<iso>.md`.

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
