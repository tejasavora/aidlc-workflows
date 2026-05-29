# Load Test Execute — Validation Spec

## Pass Criteria

- All 5 test stages completed (or documented reason for stopping early)
- All NFR targets met (p99 latency, throughput, error rate)
- Load test report exists with per-stage metrics
- Any bottlenecks found were diagnosed and remediation was attempted
- Human reviewed and approved final report before proceeding

## Fail Criteria

- Tests were run but results were not compared against NFR targets
- NFR breach was silently ignored without remediation attempt
- Test was aborted without documenting reason
- Results files are missing
- System was left in degraded state after testing (no restore/scale-down)

## Validation Steps

1. Verify report exists: `aidlc-docs/<intent>/operations/load-test-report.md`
2. Confirm report contains metrics for each stage (baseline, ramp, peak, spike, soak)
3. Check each NFR target: report explicitly shows pass or fail per metric
4. If any stage failed: verify bottleneck section exists with diagnosis and remediation actions
5. Verify raw results exist in `tests/load/results/`
6. Confirm target environment is healthy after testing (run smoke test)
