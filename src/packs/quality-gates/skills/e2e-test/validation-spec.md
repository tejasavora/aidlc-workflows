# E2E Test — Validation Spec

## Activation Check

- If `toolchain.yaml` → `quality.testing.e2e_dir` is absent or empty: skill was correctly skipped (not a failure)
- If `e2e_dir` is configured: skill MUST have run

## Pass Criteria

- E2E suite ran to completion (no crash, no premature exit)
- All tests pass — OR — only flaky/environment failures remain and each has a documented fix applied
- No real regressions remain unaddressed (either fixed or explicitly acknowledged by human)
- Report exists with per-test results and failure classifications
- Re-run after fixes confirms no new failures were introduced

## Fail Criteria

- E2E tests were skipped when `e2e_dir` was configured
- Failing tests were not classified (flaky / environment / regression / test-bug)
- Real regressions exist without human acknowledgment
- Fixes introduced new test failures
- Report is missing, incomplete, or shows suite-level crash without diagnosis
- Code-review was allowed to proceed with unresolved real regressions

## Validation Steps

1. Check `toolchain.yaml`: if `quality.testing.e2e_dir` is empty — confirm skill was skipped; stop here
2. Verify report exists: `aidlc-docs/<intent>/quality/e2e-test-report.md`
3. Confirm report contains: suite summary (pass/fail/skip counts) and per-test results table
4. For each failure in report: verify a classification (flaky/environment/regression/test-bug) is present
5. Re-run one previously-failing test in isolation: confirm it now passes (for flaky/env fixes)
6. Confirm no entry in the report is left as "unknown failure" without a follow-up action
7. If any regression was escalated: confirm human-acknowledgment section is present in the report
