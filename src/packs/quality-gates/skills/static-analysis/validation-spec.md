# Static Analysis — Validation Spec

## Pass Criteria

- Static analysis tool ran successfully (exit code captured)
- All auto-fixable issues were fixed (re-run confirms)
- No `severity: error` findings remain unaddressed
- If findings remain, they are documented in the escalation report
- Report file exists at expected path
- Audit trail records all fix attempts

## Fail Criteria

- Tool failed to execute (wrong config, missing binary, crash)
- Auto-fix introduced new issues (regression)
- Findings were silently suppressed without documentation
- Report file is missing or empty

## Validation Steps

1. Verify report file exists: `aidlc-docs/<intent>/construction/<unit>/quality/static-analysis-report.md`
2. Verify report contains: tool name, findings count, fix count, remaining count, attempt count
3. If remaining > 0: verify escalation section exists with options presented
4. Re-run tool one final time: confirm reported state matches actual state
5. Check no regressions: new findings introduced by fixes should be zero
