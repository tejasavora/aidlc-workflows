# Build and Test — Validation Spec

## Pass Criteria

- Build completes without errors
- All unit tests pass
- Integration tests pass (if configured and infra available)
- No test was deleted to make the suite pass (test count >= previous count)
- Report file exists with pass/fail counts

## Fail Criteria

- Build fails
- Tests fail after max remediation attempts
- Tests were removed (count decreased without justification)
- Fix introduced new test failures (regression)

## Validation Steps

1. Verify build succeeds: run build command, exit code 0
2. Run full test suite: capture results
3. Compare test count: current >= count at code-generation completion
4. Verify report: `aidlc-docs/<intent>/construction/<unit>/quality/build-and-test-report.md`
5. If failures remain: verify escalation report with diagnosis per failure
