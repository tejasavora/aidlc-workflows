# IaC Drift Detection — Validation Spec

## Activation Check

- If `toolchain.yaml` → `infrastructure.iac_tool` is absent: skill was correctly skipped (not a failure)
- If `iac_tool` is configured: skill MUST have run post-deploy or on-schedule

## Pass Criteria

- IaC drift detection tool ran against all configured stacks/workspaces
- All drifted resources are listed in the report with resource ID, drift type, and property differences
- Each drifted resource is classified (HOTFIX / CONFIG_DRIFT / DELETED)
- Audit-trail was cross-referenced to identify known hotfixes
- Human reviewed all drifted resources and made a decision (update IaC / revert / accepted-risk)
- Report exists at expected path

## Fail Criteria

- Skill skipped when `infrastructure.iac_tool` is configured
- Drift detection ran but results not presented to human
- Skill auto-applied IaC changes or infrastructure changes without human decision
- DELETED resources not flagged (missing from report)
- Security-risk drifts (e.g., open security group ingress) not explicitly highlighted
- Human decisions not documented in the report

## Validation Steps

1. Verify activation: confirm `toolchain.yaml` → `infrastructure.iac_tool` is set
2. Verify report exists: `aidlc-docs/<intent>/operations/<env>/drift-detection-report.md`
3. Confirm the report lists all configured stacks and the total drifted resource count
4. For each drifted resource: verify resource ID, expected value, actual value, and classification are present
5. Check audit-trail cross-reference: HOTFIX classification must cite an audit-trail event ID
6. Verify no infrastructure changes were made automatically by this skill
7. Confirm human-decision section is present for each drifted resource (decision + rationale)
