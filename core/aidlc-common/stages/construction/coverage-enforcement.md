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

Load aidlc-quality-agent persona from `agents/aidlc-quality-agent.md` and knowledge from `.claude/knowledge/aidlc-quality-agent/`.

### Step 2: Determine Thresholds

Read coverage targets from (priority order):
1. `.claude/rules/aidlc-team.md` → `## Testing` section (affirmed practices)
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

### Step 6: Update State

Mark coverage-enforcement as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :bar_chart:
Review path: `aidlc-docs/construction/coverage-enforcement/`
Standard 2-option approval (Approve / Request Changes).
