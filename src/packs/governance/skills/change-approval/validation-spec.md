# Change Approval — Validation Spec

## Pass Criteria

- Approval policy was evaluated before any deployment was triggered
- All required approvers (per policy or defaults) provided explicit approval
- Approval record exists at `aidlc-docs/<intent>/governance/approvals/<change-id>.json`
- Approval record contains: approver identities, roles, timestamps, decisions
- Audit trail contains HUMAN_APPROVED entries for each approver
- Production was not deployed without at least 1 human approval

## Fail Criteria

- Deployment proceeded without approval record
- Approval was granted by the same agent/human that requested the deployment (self-approval)
- Policy was evaluated but DENY was overridden without documented escalation
- Approval record is missing required fields (especially timestamps)
- Production deployment occurred with 0 human approvals

## Validation Steps

1. Verify approval record exists in `aidlc-docs/<intent>/governance/approvals/`
2. Parse JSON: confirm required fields present (environment, approvals array with decisions and timestamps)
3. Count approvals: confirm number meets policy requirement (at minimum 1 for production)
4. Cross-reference with audit trail: each approval in the JSON should have corresponding HUMAN_APPROVED entry
5. Verify deployment timestamp is AFTER the last approval timestamp (sequence matters)
6. For production: confirm at least one approval role satisfies the production policy requirement
