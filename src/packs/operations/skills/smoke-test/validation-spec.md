# Smoke Test — Validation Spec

## Pass Criteria

- All critical-path tests executed (none skipped without documentation)
- All critical-path tests passed (HTTP 2xx, response shape correct)
- Smoke test report exists with per-test results and response times
- If any test failed: failure was classified and appropriate action was taken
- Rollback was triggered immediately on regression failures (not after max-attempts)

## Fail Criteria

- Smoke tests were skipped or not run
- Failing tests were silently ignored without classification
- Regression failure occurred but rollback was not triggered
- Environment was promoted to next stage while smoke tests were failing
- Report is missing or incomplete

## Validation Steps

1. Verify report exists: `aidlc-docs/<intent>/operations/<env>/smoke-test-report.md`
2. Confirm report lists all critical paths tested (matches top stories from inception)
3. Re-run at least one critical-path test manually: confirm it passes
4. If any test failed in report: verify classification section exists (regression/config/data/flaky)
5. If rollback was triggered: verify rollback report exists and final state is documented
6. Confirm environment was not promoted while any unresolved failure existed
