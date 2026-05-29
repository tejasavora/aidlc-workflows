# DR Design — Validation Spec

## Pass Criteria

- RTO and RPO targets were confirmed with the human before architecture was selected
- Selected DR tier is consistent with the RTO/RPO values in the decision matrix
- Backup strategy specifies frequency ≤ RPO target for all stateful components
- Replication topology is specified with explicit placement (AZ, region) and promotion mechanism
- DR runbook outline exists with estimated time per step that sums to ≤ RTO target
- Human approved the DR design plan before artifacts were written
- All three artifacts exist at expected paths

## Fail Criteria

- DR tier was selected without asking for RTO/RPO when absent from NFR requirements
- Backup frequency exceeds RPO target (e.g., daily backups for a 1-hour RPO requirement)
- No replication topology specified for synchronous-replication tier
- Runbook outline is missing or generic (not system-specific step-by-step)
- Design written without human plan approval
- `dr-design.yaml` is missing or contains placeholder values
- Estimated RTO from runbook step-sum exceeds the stated RTO target without flagging this gap

## Validation Steps

1. Verify `aidlc-docs/<intent>/construction/well-architected/dr-design.md` exists
2. Verify `aidlc-docs/<intent>/construction/well-architected/dr-design.yaml` exists
3. Verify `aidlc-docs/<intent>/construction/well-architected/dr-runbook-outline.md` exists
4. Read `dr-design.md` and confirm RTO/RPO targets are explicitly stated
5. Confirm selected DR tier matches decision matrix for the stated RTO/RPO
6. Verify backup strategy: for each stateful component, frequency ≤ RPO
7. Verify runbook outline step times sum to ≤ RTO target (flag mismatch as finding)
8. Confirm cross-region copy is specified for backups when DR scope includes region loss
9. Verify audit trail shows human approved the DR design plan
