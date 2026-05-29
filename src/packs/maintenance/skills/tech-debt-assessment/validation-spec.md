# Tech Debt Assessment — Validation Spec

## Pass Criteria

- All five debt categories were analysed (complexity, coverage, architecture drift, outdated patterns, staleness)
- Findings are prioritised (not a flat undifferentiated list)
- Assessment document exists at expected path with date in filename
- Human reviewed and acknowledged the assessment
- No code was changed as part of this skill (advisory only)

## Fail Criteria

- Assessment only covered one category (e.g., only complexity) without scoping justification
- Findings were not prioritised by risk
- Code changes were made as part of the assessment
- Assessment document is missing or does not contain a remediation plan section

## Validation Steps

1. Verify `aidlc-docs/<intent>/maintenance/tech-debt-assessment-<date>.md` exists
2. Confirm the document contains sections for: complexity, coverage, architecture drift, outdated patterns, dependencies
3. Confirm the remediation plan is prioritised (Priority 1, 2, 3 or equivalent)
4. Confirm `git diff` shows no source code changes (this is advisory only)
5. Verify human acknowledgment section exists in the document
