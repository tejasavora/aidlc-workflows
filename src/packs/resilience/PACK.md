---
name: resilience
description: |
  Load testing, chaos engineering, and disaster recovery validation.
  Activates when NFR targets include performance or availability requirements,
  or when explicitly triggered by the user. Tests the system's ability to handle
  peak load, survive failures, and recover within RTO/RPO targets.
metadata:
  activation: user-triggered-or-nfr-driven
  phase: operations
  runs-after: deploy
  configurable: true
---

# Resilience Extension Pack

## Activation

Activates when any of the following are true:
- `aidlc-docs/<intent>/inception/nfr-requirements.md` contains performance targets (throughput, latency, p99)
- `aidlc-docs/<intent>/inception/nfr-requirements.md` contains availability targets (SLA, RTO, RPO)
- User explicitly requests load testing or DR validation

## Configuration (captured in toolchain.yaml under `resilience` section)

- **Load test tool**: auto-detected or user-specified (Locust, k6, Gatling, Artillery, JMeter, wrk, any)
- **Chaos tool**: auto-detected or user-specified (AWS FIS, Litmus, Gremlin, tc/kill scripts, any)
- **Target environment**: where to run tests (staging recommended; production only with approval)
- **NFR targets**: pulled from nfr-requirements.md (p99 latency, throughput RPS, error rate budget)
- **Load test duration**: user-specified (default: baseline 5m, soak 30m)
- **Chaos experiments**: user-specified or auto-derived from system topology

Example toolchain.yaml resilience section:
```yaml
resilience:
  load_test_tool: k6
  chaos_tool: aws-fis
  target_environment: staging
  nfr_targets:
    p99_latency_ms: 500
    throughput_rps: 1000
    error_rate_budget: 0.001
  load_test_duration:
    baseline: 5m
    ramp: 10m
    peak: 15m
    spike: 5m
    soak: 30m
  run_chaos: true
  run_dr_validation: true
```

## Execution Order

After deployment and smoke tests pass:

1. `load-test-design` — Generate test scenarios from user journeys and NFR targets
2. `load-test-execute` — Run test battery, collect metrics, auto-remediate bottlenecks
3. `chaos-engineering` — Inject failures during load, verify graceful degradation
4. `dr-validation` — Execute DR drill, measure actual RTO/RPO

Each skill runs against the configured target environment. Running against production requires explicit human approval at each step.

## Self-Healing Philosophy

Resilience skills are unique: when a bottleneck or failure is found, the goal is to prove the system CAN be made resilient, not just to report that it isn't. The self-healing loop attempts fixes (scale, cache, optimize, replicate) and re-tests to demonstrate improvement before escalating.
