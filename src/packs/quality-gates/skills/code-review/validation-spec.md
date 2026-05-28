# Code Review — Validation Spec

## Pass Criteria

- Review was performed by an independent agent (not the code author)
- All review categories were checked (design, security, performance, error handling, readability, testing, NFR)
- Findings are specific (file:line, not generic advice)
- Auto-fixable findings were addressed
- No `severity: critical` findings remain open
- Final verdict is APPROVE or REQUEST_CHANGES with clear rationale
- Report file exists with structured findings

## Fail Criteria

- Review was performed by the same agent that generated the code
- Review is superficial (< 3 specific findings for > 500 lines of code)
- Critical findings remain unaddressed
- Findings lack specificity (no file:line references)
- Report is missing

## Validation Steps

1. Verify report exists: `aidlc-docs/<intent>/construction/<unit>/quality/code-review-report.md`
2. Verify independence: report contains reviewer session-id ≠ builder session-id
3. Verify completeness: all 7 categories appear in findings (even if "no issues found")
4. Verify specificity: each finding has file:line reference
5. If verdict is REQUEST_CHANGES: verify fixes were attempted
6. If human-review needed: verify artefact-verification gate presents report
