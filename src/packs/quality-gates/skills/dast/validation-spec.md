# DAST — Validation Spec

## Activation Check

- If `toolchain.yaml` → `quality.security.dast` is absent or staging is not deployed: skill was correctly skipped (not a failure)
- If DAST is configured AND staging smoke-test has passed: skill MUST have run

## Pass Criteria

- Scan ran to completion against the staging environment (not production)
- All findings are present in the report with CWE IDs, severity, and reproduction steps
- No finding is listed without a severity classification
- Report includes compliance mapping table (PCI-DSS Req 11.3)
- Human reviewed and acknowledged all findings (critical/high findings are explicitly noted as blocking or accepted-risk)
- Production promotion was not attempted with unacknowledged critical/high findings

## Fail Criteria

- DAST was skipped when `quality.security.dast` was configured and staging was healthy
- Scan was run against production (this is a hard failure)
- Findings exist in raw scanner output that are absent from the report (incomplete parsing)
- Critical or high findings have no acknowledgment section in the report
- Report does not include reproduction steps (findings without reproduction are not actionable)
- No compliance mapping table present

## Validation Steps

1. Verify activation check: confirm staging `smoke-test-report.md` exists before DAST ran
2. Verify report exists: `aidlc-docs/<intent>/operations/staging/dast-report.md`
3. Confirm `target_url` in the report matches staging URL (not production)
4. Verify each finding entry contains: `cwe`, `severity`, `url`, `reproduction_steps`, `remediation`
5. Confirm compliance mapping table is present with PCI-DSS Req 11.3 column
6. For any critical/high findings: verify human-acknowledgment section exists documenting decision (fix or accepted-risk with rationale)
7. Confirm no auto-fix was applied to source code (DAST is report-only — code changes go through normal construction flow)
