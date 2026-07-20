---
trigger: model_decision
description: "AI-DLC V2 resilience: chaos-engineering"
---


# Chaos Engineering

Deliberately inject failures into the running system to verify it degrades gracefully, protects the user experience, and recovers within the timeframes defined in the NFR requirements.

## Inputs

- `aidlc-docs/<intent>/inception/nfr-requirements.md` → availability targets, fallback requirements
- `aidlc-docs/<intent>/construction/` → architecture topology (what components exist)
- `aidlc-docs/<intent>/toolchain.yaml` → `resilience.chaos_tool`
- Load test is concurrently running (or at baseline) — chaos is injected under load

## Execution

### Step 1: Derive Experiment Catalogue

From the system topology, derive experiments:
- **Container/service kill**: kill one instance of each service
- **Network partition**: block traffic between service A and dependency B
- **Latency injection**: add 500ms latency on DB or downstream calls
- **Resource exhaustion**: throttle CPU to 10% on one instance
- **Dependency failure**: make external API return 503
- **DB connection exhaustion**: fill connection pool

Filter to experiments that are relevant to the system's critical paths (e.g., if system has no DB replicas, skip "primary DB failure" — that's a DR scenario).

### Step 2: Human Clarification

Present the experiment catalogue and ask for confirmation before any experiment runs:
```markdown
## Chaos Experiments Planned

Environment: staging (load test running at 50% peak)

1. Kill one API instance (expect: other instances handle load, <5s recovery)
2. Inject 500ms latency on DB (expect: p99 stays under 1500ms, no errors)
3. Kill cache node (expect: graceful fallback to DB, cache re-warms)

Which experiments should I run? (all / select 1,3 / none)
Note: Each experiment requires separate approval before execution.
```

### Step 3: Verify Steady State

Before each experiment, verify the system is in a known-good state:
- Record: error rate, p99 latency, throughput (from load test metrics)
- Confirm: all services healthy, no active alarms
- This is the "steady state hypothesis" — the system MUST return to this state after chaos

### Step 4: Execute One Experiment at a Time

For each approved experiment:
1. **Announce** the experiment to the human (final confirmation before injection)
2. **Inject**: run the chaos tool command
   - AWS FIS: `aws fis start-experiment --experiment-template-id <id>`
   - Litmus: `kubectl apply -f <chaos-engine.yaml>`
   - tc (Linux): `tc qdisc add dev eth0 root netem delay 500ms`
   - kill: `kill -9 <pid>` (containerized)
3. **Observe**: watch metrics in real time for configured blast duration (default: 2 minutes)
4. **Verify degradation** is graceful (errors below budget, user experience maintained per requirements)
5. **Stop injection**: halt the fault
6. **Verify recovery**: confirm system returns to steady state within RTO

### Step 5: Analyse Results

For each experiment, record:
- Was steady state maintained DURING injection? (graceful degradation)
- Was steady state restored AFTER injection? (recovery)
- How long did recovery take? (actual RTO)
- What user-visible impact occurred?

If a system failed to degrade gracefully → this is a design finding (missing circuit breaker, no fallback). Document. Do NOT attempt auto-fix during chaos testing — escalate.

## Outputs

- `aidlc-docs/<intent>/operations/chaos-report.md`
  - Per-experiment: hypothesis, blast radius, observed impact, recovery time, pass/fail
- Chaos experiment definitions (FIS templates, Litmus manifests, scripts) in `tests/chaos/`

## Artefact Verification

`artefact-verification: "true"` — Human reviews chaos results. Any experiment that failed (system did NOT degrade gracefully or did NOT recover) is a blocking finding that must be addressed before DR validation.
