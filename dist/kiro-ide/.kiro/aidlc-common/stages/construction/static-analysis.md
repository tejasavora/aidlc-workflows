---
slug: static-analysis
phase: construction
execution: ALWAYS
condition: Always executes after code generation — linting, formatting, and complexity checks with auto-remediation.
lead_agent: aidlc-quality-agent
support_agents: []
mode: inline
produces:
  - static-analysis-report
  - static-analysis-questions
consumes:
  - artifact: code-generation-plan
    required: true
  - artifact: code-summary
    required: true
requires_stage:
  - code-generation
workspace_requires: true
sensors:
  - linter
scopes:
  - enterprise
  - feature
  - mvp
  - poc
  - bugfix
  - refactor
  - security-patch
  - workshop
inputs: Generated code from code-generation stage
outputs: aidlc-docs/construction/static-analysis/static-analysis-report.md, aidlc-docs/construction/static-analysis/static-analysis-questions.md
---

# Static Analysis

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-quality-agent persona from `agents/aidlc-quality-agent.md` and knowledge from `.kiro/knowledge/aidlc-quality-agent/`.

### Step 2: Detect Tooling

Read project configuration to detect static analysis tools:
- Python: ruff, flake8, pylint, mypy, pyright
- TypeScript/JS: eslint, biome, prettier, tsc --noEmit
- Java: checkstyle, PMD, SpotBugs
- Go: golangci-lint, staticcheck
- Rust: clippy
- .NET: dotnet format, Roslyn analyzers

If no tool is detected, ask the user which linter/formatter to use. If the project has no config file, generate a reasonable default configuration.

### Step 3: Execute Analysis

Run the detected tool(s) against all generated/modified code:
1. Run linter (style + correctness rules)
2. Run formatter (if separate from linter)
3. Run type checker (if applicable)
4. Run complexity checker (cyclomatic complexity, cognitive complexity)

### Step 4: Self-Healing Loop

If findings are reported:

```
attempt = 0
max_attempts = 3

WHILE findings exist AND attempt < max_attempts:
  1. CLASSIFY each finding:
     - auto-fixable: style, unused imports, formatting, simple type errors
     - needs-design-review: complexity exceeding threshold, architectural violation
     - needs-human: ambiguous intent, policy decision
  2. AUTO-FIX auto-fixable findings (run tool --fix or apply changes directly)
  3. For needs-design-review: read relevant aidlc-docs/ design artifacts,
     determine if code or design is wrong, fix the correct one
  4. RE-RUN analysis
  5. attempt += 1

IF findings remain after max_attempts:
  ESCALATE: present remaining findings to user with context
```

### Step 5: Generate Report

Create `aidlc-docs/construction/static-analysis/static-analysis-report.md`:
- Tool(s) used and configuration
- Initial finding count by severity
- Auto-fixed count and what was fixed
- Remaining findings (if any) with justification
- Complexity metrics summary

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :mag:
- Summary of static-analysis-report
- Review path: `<record>/construction/static-analysis/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .kiro/tools/aidlc-orchestrate.ts report --stage static-analysis --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

The `linter` sensor fires on this stage's outputs to verify no regressions were introduced during the self-healing loop.

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
