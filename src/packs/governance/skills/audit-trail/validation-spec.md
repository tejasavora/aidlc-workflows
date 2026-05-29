# Audit Trail — Validation Spec

## Pass Criteria

- `aidlc-docs/<intent>/governance/audit-trail.jsonl` exists and is non-empty
- Every skill that executed has a SKILL_STARTED and SKILL_COMPLETED/SKILL_FAILED entry
- Every human approval has a corresponding HUMAN_APPROVED or HUMAN_REJECTED entry
- All entries contain required fields: timestamp, session_id, actor, action, rationale, artefacts_affected
- Log file is append-only (no entries were deleted or modified)
- Phase boundary audit summary documents exist for completed phases

## Fail Criteria

- Audit log file does not exist
- Entries are missing required fields (especially rationale)
- Human approvals exist in reports but have no corresponding log entry
- Log entries were deleted or modified (integrity violation)
- Gaps in timeline that have no RECONSTRUCTED note

## Validation Steps

1. Verify `aidlc-docs/<intent>/governance/audit-trail.jsonl` exists
2. Parse all JSONL lines: confirm each parses as valid JSON with required fields
3. Cross-reference with skill output reports: every skill report should have corresponding SKILL_COMPLETED entry
4. Cross-reference with human approvals documented in artefact-verification reports: each should have HUMAN_APPROVED entry
5. Sort entries by timestamp: confirm monotonically increasing (no out-of-order inserts that would indicate modification)
6. Verify `audit-summary-<phase>.md` exists for each completed phase
