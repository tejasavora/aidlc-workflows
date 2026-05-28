# Security Scan — Validation Spec

## Pass Criteria

- All three scan types ran successfully (SAST, SCA, secrets)
- No `severity: critical` findings remain unaddressed
- No `severity: high` findings remain unaddressed without human acknowledgment
- All detected secrets have been removed from source code
- Dependency upgrades that were applied don't break tests
- Report file exists with complete findings

## Fail Criteria

- Any scan tool failed to execute
- Critical/high findings exist without remediation or human acknowledgment
- Secrets remain in source code
- Dependency upgrades introduced test failures (regression)
- Report is missing or incomplete

## Validation Steps

1. Verify report exists: `aidlc-docs/<intent>/construction/<unit>/quality/security-scan-report.md`
2. Re-run secrets scanner: confirm 0 secrets in source
3. Check no critical/high SAST findings remain open
4. Verify dependency files match report (upgrades actually applied)
5. If findings remain: verify human-acknowledgment section exists in report
