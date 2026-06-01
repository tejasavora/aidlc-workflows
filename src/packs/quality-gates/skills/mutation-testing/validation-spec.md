# Mutation Testing — Validation Spec

## Activation Check

- If `toolchain.yaml` → `quality.testing.mutation` is absent: skill was correctly skipped (not a failure)
- If `mutation` is configured: skill MUST have run during construction

## Pass Criteria

- Existing tests were confirmed passing before mutation testing began
- Mutation tool ran to completion and produced structured results
- Mutation score calculated correctly: `(killed + timeout) / (total - compile_errors) × 100`
- Score compared against `threshold` from toolchain.yaml
- If score was below threshold on attempt 1: targeted tests were generated for survived mutants
- After self-healing attempt: mutation score meets or exceeds threshold OR surviving mutants are documented with justification
- Human reviewed the final score and any generated tests
- Report exists at expected path

## Fail Criteria

- Mutation testing ran against a failing test suite (prior gate not clean)
- Skill was skipped when `quality.testing.mutation` is configured
- Score below threshold after 2 attempts with no escalation to human
- Survived mutants above threshold are not documented or justified
- Generated tests do not correspond to the mutants they target
- Human review was skipped

## Validation Steps

1. Verify `build-and-test-report.md` confirms tests were passing before this skill ran
2. Verify report exists: `aidlc-docs/<intent>/quality/mutation-testing-report.md`
3. Confirm mutation score formula is correct: check killed + timeout vs total mutant count
4. Verify score meets or exceeds `threshold` in toolchain.yaml (or surviving mutants are justified)
5. If self-healing occurred: confirm generated test names are present in test files
6. Confirm human-verification section is present acknowledging the score and any survived mutants
7. If attempt 2 still below threshold: confirm human was escalated (not silently passed)
