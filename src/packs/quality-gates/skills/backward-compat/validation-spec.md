# Backward Compatibility — Validation Spec

## Activation Check

- If no API spec file exists or no spec file changed: skill was correctly skipped (not a failure)
- If a spec file changed AND `api-contracts.md` is present: skill MUST have run

## Pass Criteria

- Previous version of the spec was retrieved from git history for comparison
- Comparison tool ran to completion (or auto-mode used with documented limitation)
- All changes categorised as BREAKING, DEPRECATION, ADDITION, or DOCUMENTATION
- Every breaking change has an impact assessment and decision options documented
- Human reviewed and acknowledged each breaking change before construction proceeded
- Report exists at expected path

## Fail Criteria

- Skill was skipped when a spec file changed and `api-contracts.md` is present
- Breaking changes were present but not reported (missing from the report)
- Skill attempted to auto-fix a breaking change (e.g., silently restoring a removed field)
- Human acknowledgment is absent for breaking changes
- Report does not distinguish between breaking, deprecation, and addition categories
- New required fields were added without flagging as BREAKING

## Validation Steps

1. Confirm spec file change: `git diff --name-only HEAD~1 HEAD` includes the spec file
2. Verify report exists: `aidlc-docs/<intent>/construction/<unit>/backward-compat-report.md`
3. Confirm BREAKING section is present (may be empty if no breaking changes)
4. For each BREAKING entry: verify impact assessment and decision options are present
5. Verify no source code was auto-modified by this skill (backward-compat is report-only)
6. Confirm human-acknowledgment section is present documenting decision per breaking change
7. If `breaking_policy: block` and breaking changes exist: verify construction did not proceed without human approval
