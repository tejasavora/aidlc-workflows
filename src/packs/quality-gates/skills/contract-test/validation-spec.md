# Contract Testing — Validation Spec

## Activation Check

- If only one unit exists OR no `api-contracts.md` is present: skill was correctly skipped (not a failure)
- If multiple units exist AND `api-contracts.md` is present: skill MUST have run during construction

## Pass Criteria

- Human clarification collected: consumer services identified, contract file locations confirmed
- Consumer contract files located or generated (with human confirmation if generated)
- Provider verification ran for all consumer-provider pairs
- Every violation was diagnosed with a root cause classification
- Self-healing was attempted for "provider code diverged from design" violations
- After max attempts: all contracts pass OR unresolved violations escalated to human
- Report exists at expected path with per-pair results

## Fail Criteria

- Skill skipped when multiple units and `api-contracts.md` both exist
- Contracts were silently ignored (not run against the provider)
- Consumer contract was modified to accommodate a broken provider (instead of fixing the provider)
- Design gaps were silently resolved with undocumented code changes
- Human review skipped when violations could not be auto-fixed
- Report missing consumer-provider pair table

## Validation Steps

1. Verify activation: count units in `aidlc-docs/<intent>/construction/` — confirm at least 2
2. Verify report exists: `aidlc-docs/<intent>/quality/contract-test-report.md`
3. Confirm consumer-provider pairs table is present with status per pair
4. For any self-healing applied: verify provider code fix references its functional design
5. Verify consumer contracts were not modified to paper over provider bugs
6. Check for design gap escalations: confirm human acknowledgment is present
7. Confirm all pairs show PASS in final report or are explicitly escalated with documented rationale
