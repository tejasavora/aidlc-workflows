# Dependency Update — Validation Spec

## Pass Criteria

- Dependency audit ran successfully and produced a finding list
- All critical and high CVEs are either fixed or have a documented incompatibility
- Tests pass after all upgrades are applied
- No upgrade was applied that breaks the test suite without being reverted or pinned
- Update report exists with complete listing of changes made
- Human reviewed and approved the report before dependency files were committed

## Fail Criteria

- Dependency files were updated but tests were not run
- Critical CVE remains unaddressed without documentation
- An upgrade was applied that causes test failures (and was not reverted)
- Report is missing or shows "unknown" for CVE status
- Incompatible package was silently left at vulnerable version without documentation

## Validation Steps

1. Re-run dependency audit tool: confirm no critical/high CVEs remain unfixed
2. Run full test suite: confirm all tests pass with updated dependencies
3. Verify `aidlc-docs/<intent>/maintenance/dependency-update-report-<date>.md` exists
4. Confirm report lists: packages scanned, CVEs fixed, packages upgraded, pinned packages with reason
5. For each pinned package: verify incompatibility documentation and recommended remediation exists
6. Confirm human approval is documented in the report
