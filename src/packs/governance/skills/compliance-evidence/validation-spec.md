# Compliance Evidence — Validation Spec

## Pass Criteria

- Framework(s) were identified (from config or human clarification)
- Evidence files exist for every in-scope control (or gap is documented)
- Compliance matrix exists with status per control (SATISFIED / GAP / PARTIAL)
- All GAPs have description of what evidence is missing and how to obtain it
- Human reviewed and acknowledged the compliance matrix

## Fail Criteria

- Evidence was collected without knowing which framework applies
- Controls with no evidence were marked as SATISFIED
- Compliance matrix is missing or has undocumented blanks
- Evidence files are empty placeholders
- Human review was not performed before the matrix was finalized

## Validation Steps

1. Verify `aidlc-docs/<intent>/governance/evidence/` exists with at least one framework subdirectory
2. Verify compliance matrix file exists: `compliance-matrix-<framework>-<date>.md`
3. Open matrix: confirm every row has an explicit status (SATISFIED, GAP, or PARTIAL)
4. For each SATISFIED row: verify the referenced evidence file exists and contains relevant content
5. For each GAP row: verify description of missing evidence and remediation suggestion exists
6. Confirm human acknowledgment section is present in the compliance matrix
