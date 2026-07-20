---
trigger: model_decision
description: "AI-DLC V2 quality-gates: coverage-enforcement"
---


# Coverage Enforcement

Measure code coverage for the current unit and enforce the configured thresholds. When coverage is below threshold, analyze which functions/branches are uncovered and auto-generate targeted tests.

## Inputs

- Generated source code + existing tests for the current unit
- `aidlc-docs/<intent>/toolchain.yaml` → `quality.testing.coverage_*` fields
- `aidlc-docs/<intent>/construction/<unit>/functional-design/` (to understand what uncovered code DOES)

## Execution

### Step 1: Measure Coverage

Run coverage tool:
- Read `toolchain.yaml` → `quality.testing.coverage_tool`
- Execute: `pytest --cov=src/<unit> --cov-report=json` (or equivalent)
- Parse: per-file line coverage, branch coverage, uncovered lines

### Step 2: Check Thresholds

Compare against configured thresholds:
- `coverage_threshold_line` (default: 80%)
- `coverage_threshold_branch` (default: 70%)

If both pass → GATE PASSES. Skip to outputs.

### Step 3: Identify Gaps

For each file below threshold:
1. List uncovered lines/branches
2. Map to functions/methods
3. Prioritize: public functions > private, complex logic > simple getters

### Step 4: Generate Tests

For each uncovered function (highest priority first):
1. Read the function's source code
2. Read the functional-design to understand expected behavior
3. Generate test cases covering:
   - Happy path (if not already covered)
   - Edge cases (boundary values, empty inputs, null)
   - Error paths (exceptions, invalid inputs)
4. Write tests to the appropriate test file
5. Run the new tests to verify they pass

### Step 5: Re-measure and Loop

1. Re-run coverage measurement
2. Compare: did coverage increase?
3. If now above threshold → PASS
4. If still below AND attempt < max → generate more tests (target next uncovered area)
5. If still below AND attempt >= max → ESCALATE

### Step 6: Untestable Code Detection

Some code may be genuinely untestable (tight coupling, side effects, infrastructure-dependent):
- Flag as untestable with reason
- Suggest refactoring to make testable (but don't apply — that's a design change)
- Exclude from threshold calculation if human approves

## Outputs

- `aidlc-docs/<intent>/construction/<unit>/quality/coverage-report.md`
- New test files (generated tests)
- Coverage data (JSON/XML for CI integration)

## Escalation

After max attempts:
- Report: current coverage %, gap from threshold, what was generated
- List: functions that remain uncovered and why (untestable, complex setup, external dependency)
- Options: lower threshold for this unit, add tests manually, defer to tech-debt
