# Sustainability Check — Validation Spec

## Pass Criteria

- All three audit areas are covered: compute efficiency, storage/data lifecycle, network
- Each finding has: category, description, recommendation, and estimated impact (even if approximate)
- Report distinguishes high-impact from advisory findings
- Human was shown the report for acknowledgement
- `sustainability-report.md` exists at expected path
- Report explicitly states findings are advisory and do not block progression

## Fail Criteria

- One or more audit areas (compute, storage, network) was skipped entirely
- Findings are generic (not specific to the actual infrastructure-design being reviewed)
- No estimated impact for any finding (vague "may save money" without quantification)
- Report was not shown to human (no acknowledgement in audit trail)
- `sustainability-report.md` is missing

## Validation Steps

1. Verify `aidlc-docs/<intent>/construction/well-architected/sustainability-report.md` exists
2. Confirm report covers compute, storage/data lifecycle, and network sections
3. Verify at least one finding per section (or an explicit "no findings" statement)
4. Confirm each finding includes a concrete recommendation (not just "consider optimization")
5. Verify the advisory disclaimer is present in the report
6. Verify audit trail records human acknowledgement of the report
7. Confirm construction workflow was not blocked by this skill (status is complete, not pending-fix)
