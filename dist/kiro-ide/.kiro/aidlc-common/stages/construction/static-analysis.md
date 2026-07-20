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

Load aidlc-quality-agent persona from `agents/aidlc-quality-agent.md` and knowledge from `.claude/knowledge/aidlc-quality-agent/`.

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

### Step 6: Update State

Mark static-analysis as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :mag:
Review path: `aidlc-docs/construction/static-analysis/`
Standard 2-option approval (Approve / Request Changes).

## Sensors

The `linter` sensor fires on this stage's outputs to verify no regressions were introduced during the self-healing loop.
