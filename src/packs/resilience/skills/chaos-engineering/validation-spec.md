# Chaos Engineering — Validation Spec

## Pass Criteria

- Steady state was verified before each experiment (not assumed)
- Each experiment received explicit human approval before injection
- System demonstrated graceful degradation during failure injection (error rate within budget)
- System recovered to steady state after each experiment
- Recovery time was measured and documented
- Chaos report exists with results for each experiment

## Fail Criteria

- Any experiment executed without human approval
- Steady state was not verified before injection
- System failed completely (not degraded gracefully) and this was not flagged as a blocking finding
- System did not recover after injection and no escalation occurred
- Experiments ran against production without explicit approval
- Report is missing or shows "unknown" for any experiment outcome

## Validation Steps

1. Verify report exists: `aidlc-docs/<intent>/operations/chaos-report.md`
2. Confirm each experiment in report has: hypothesis, injection time, recovery time, pass/fail verdict
3. For each failed experiment: verify it is flagged as a blocking finding in the report
4. Verify chaos experiment definitions exist in `tests/chaos/`
5. Confirm target environment is currently healthy (run quick smoke test)
6. Check that no experiment ran against production unless explicitly documented and approved
