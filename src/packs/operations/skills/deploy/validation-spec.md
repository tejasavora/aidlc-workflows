# Deploy — Validation Spec

## Pass Criteria

- Deployment completed without errors (deployment tool exit code = 0)
- Health check passed within configured timeout
- All services report healthy (readiness probes green)
- Deploy report exists with timestamp, artefact version, and health check results
- Production deployments have documented human approval before execution
- If rollback occurred: rollback restored healthy state and is documented

## Fail Criteria

- Deployment executed on production without human approval
- Health check timed out without remediation attempt
- Deployment failed and no rollback was executed (service left in broken state)
- Deploy report is missing or does not record actual outcome
- Auto-fix introduced a config change that was not logged

## Validation Steps

1. Verify deploy report exists: `aidlc-docs/<intent>/operations/<env>/deploy-report.md`
2. Confirm report contains: environment, artefact version, deployment timestamp, health check outcome
3. For production: verify approval section exists with timestamp and approver
4. If deployment failed: verify rollback section exists and describes final state
5. Re-run health check against deployed environment: confirm services are currently healthy
6. Confirm no silent retries — all attempts and outcomes are recorded
