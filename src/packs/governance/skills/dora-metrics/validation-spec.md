# DORA Metrics — Validation Spec

## Pass Criteria

- Human clarification was requested (reporting period, scope, format) before calculation
- All four DORA metrics are calculated: Deployment Frequency, Lead Time for Changes, MTTR, Change Failure Rate
- Each metric has: numeric value, performance band (Elite/High/Medium/Low), data source reference
- MTTR shows "No incidents in period" if no rollbacks or smoke-test failures exist (not "0" or blank)
- Weakest metric is identified with root-cause analysis and improvement recommendations
- Report file exists at the specified output path
- Human has reviewed and acknowledged the report

## Fail Criteria

- Metrics were calculated without asking the reporting period or environment scope
- Any of the four metrics is missing from the report
- Performance band labels are absent (values without context are not actionable)
- Data sources used for calculation are not referenced (unverifiable results)
- MTTR is shown as 0 when there were no incidents (0 ≠ "no incidents")
- Weakest metric analysis is absent (missing the improvement loop)
- Report was finalized without human review

## Validation Steps

1. Verify report exists: `aidlc-docs/<intent>/governance/dora-metrics-report.md`
2. Confirm all four metric rows are present in the results table with value, band, and status
3. Verify MTTR row: if no rollbacks in audit trail for period → confirm value is "No incidents in period"
4. Cross-check Deployment Frequency: count `DEPLOYMENT_SUCCEEDED` entries in `audit-trail.jsonl` for the stated period and environment — value should match
5. Confirm weakest-metric section names the metric and lists at least one improvement recommendation
6. Confirm data sources section lists the number of deployments, incidents, and audit trail entries analysed
7. Verify human-acknowledgment or human-review section is present in the report
