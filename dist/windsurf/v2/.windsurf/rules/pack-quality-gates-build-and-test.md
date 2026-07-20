---
trigger: model_decision
description: "AI-DLC V2 quality-gates: build-and-test"
---


# Build and Test

Compile/build the generated code and run all test suites. When tests fail, diagnose whether the test or the code is wrong by checking against the design documents.

## Inputs

- Generated source code + test files for the current unit
- `aidlc-docs/<intent>/toolchain.yaml` → `quality.testing` section
- `aidlc-docs/<intent>/construction/<unit>/functional-design/` (source of truth for expected behavior)

## Execution

### Step 1: Build

Run the build command for the project:
- Python: `pip install -e .` or verify imports resolve
- TypeScript: `tsc --noEmit` or `npm run build`
- Java: `mvn compile` or `gradle build`
- Go: `go build ./...`

If build fails → diagnose (missing import, type error, syntax) → fix → re-build.

### Step 2: Run Tests

Run configured test suites:
- Unit tests: `quality.testing.unit_dir`
- Integration tests: `quality.testing.integration_dir` (if exists and configured)

Capture: pass count, fail count, error count, per-test results.

### Step 3: Diagnose Failures

For each failing test:

1. **Read the test**: what does it assert?
2. **Read the design**: what does functional-design say this behavior should be?
3. **Compare**:
   - If TEST matches DESIGN but CODE doesn't → **code bug** → fix code
   - If CODE matches DESIGN but TEST doesn't → **test bug** → fix test
   - If neither matches DESIGN → **both wrong** → fix both per design
   - If DESIGN is ambiguous → **ask human** (or check requirements for clarification)

### Step 4: Fix and Re-run

Apply the determined fix:
- Code fix: modify source, preserve intent of design
- Test fix: modify test to match designed behavior
- Both: fix design interpretation, update both

Re-run tests. Repeat until all pass or max attempts reached.

### Step 5: Integration Test Failures

Integration tests may fail due to:
- Missing infrastructure (DB, cache, queue) → check if localstack/testcontainers are configured
- Wrong config (endpoints, credentials) → verify test config matches infra
- Contract mismatch (API changed) → check against API design documents
- Data not seeded → run data seeding fixture

## Outputs

- `aidlc-docs/<intent>/construction/<unit>/quality/build-and-test-report.md`
- Modified source files (bug fixes)
- Modified test files (test corrections)
- Updated design documents (if design was clarified during diagnosis)

## Escalation

After max attempts:
- Present: which tests still fail, what was tried, diagnosis for each
- Present: "I believe X is the root cause but cannot fix it because Y"
- Options: provide guidance, skip failing tests, add to tech-debt backlog
