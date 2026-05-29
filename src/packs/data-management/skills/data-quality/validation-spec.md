# Data Quality — Validation Spec

## Pass Criteria

- Quality check definitions exist for at least completeness, uniqueness, and format rules
- All checks ran successfully (tool executed without crash)
- All quality rules pass (0 violations) OR failures were diagnosed and fixed
- Quality report exists with rules checked, pass/fail counts, and any violations
- If code was found to be producing invalid data: escalation was raised (not silently fixed in seed data)

## Fail Criteria

- Quality checks were not defined (no check files exist)
- Violations were silently suppressed without diagnosis
- Application code is producing invalid data and this was not escalated
- Report is missing or shows undefined rule counts
- Checks ran only against seeded data but code path that generates data was not validated

## Validation Steps

1. Verify quality check definitions exist in `tests/data-quality/`
2. Re-run quality checks: confirm all pass (or failures are documented in escalation)
3. Verify `aidlc-docs/<intent>/construction/<unit>/data/quality-report.md` exists with:
   - Count of rules checked
   - Per-rule pass/fail
   - Violation details for any failures
4. For any failure fixed by updating seed data: verify the fix addresses root cause (not just masking)
5. Confirm at least these rule types are covered: completeness, uniqueness, referential integrity
