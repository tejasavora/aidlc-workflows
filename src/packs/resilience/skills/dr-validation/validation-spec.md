# DR Validation — Validation Spec

## Pass Criteria

- DR prerequisites were verified before drill execution
- Human approved the drill plan before execution
- Actual RTO was measured (timer started at failure trigger, stopped at smoke-test-pass)
- Actual RPO was measured (data written before failover was verified after recovery)
- DR report exists with timing data, pass/fail against targets
- System was restored to normal state after drill
- DR runbook was updated/created based on actual drill steps

## Fail Criteria

- Drill executed without human approval
- RTO or RPO was estimated (not actually measured)
- System was not restored after drill (left in DR state)
- DR prerequisites were missing and drill proceeded anyway
- Report shows targets were missed but no escalation occurred
- DR runbook was not updated after the drill

## Validation Steps

1. Verify report exists: `aidlc-docs/<intent>/operations/dr-report.md`
2. Confirm report contains: drill type, start time, recovery time, actual RTO (minutes), actual RPO (minutes)
3. Verify actual RTO is compared to NFR target (explicit pass/fail verdict)
4. Verify actual RPO is compared to NFR target (explicit pass/fail verdict)
5. Confirm `dr-runbook.md` exists with concrete steps that match what was actually executed
6. Verify target environment is currently healthy (run smoke test)
7. If RTO/RPO missed target: verify either a fix was applied and re-drilled, or escalation is documented
