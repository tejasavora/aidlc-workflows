---
name: aidlc-load-test-design
description: |
  Generate load test scenarios from user journeys and NFR targets. Produce test
  scripts in the user's chosen tool format. Tool-agnostic: Locust, k6, Gatling,
  Artillery, JMeter, wrk, or any configured tool.
metadata:
  phase: operations
  stage: load-test-design
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "true"
  plan-verification: "true"
  artefact-verification: "false"
  pack: resilience
  max-attempts: 2
---

# Load Test Design

Design the load test scenarios before running any tests. Produces test scripts that faithfully represent real user journeys at the scale defined by NFR targets.

## Inputs

- `aidlc-docs/<intent>/inception/nfr-requirements.md` → performance and availability targets
- `aidlc-docs/<intent>/inception/stories.md` → user journeys (top stories become test scenarios)
- `aidlc-docs/<intent>/operations/deployment-design.md` → target environment URLs
- `aidlc-docs/<intent>/toolchain.yaml` → `resilience.load_test_tool`

## Execution

### Step 1: Extract NFR Targets

From `nfr-requirements.md`, extract:
- Target throughput (requests per second at peak)
- Latency targets (p50, p95, p99 thresholds)
- Error rate budget (acceptable failure %)
- Concurrent user targets

If NFR targets are absent or ambiguous → ask human to specify.

### Step 2: Derive Test Scenarios

Map the top 5-8 user stories to load test scenarios. Each scenario is:
- A sequence of API calls representing one user's journey
- Weighted by expected frequency (e.g., browse:60%, checkout:30%, search:10%)

Example mapping:
```
Story: User browses product catalog (USR-001)
→ Scenario: GET /products → GET /products/{id} (x3) → GET /products/{id}/reviews
Weight: 60% of virtual users
```

### Step 3: Design Test Battery

Define the test stages:
- **Baseline**: 10% of peak load for 5 minutes (verify system works under light load)
- **Ramp**: gradually increase to 100% peak over 10 minutes (find breaking point)
- **Peak**: sustain 100% peak for 15 minutes (verify steady-state performance)
- **Spike**: sudden 3x peak for 2 minutes (verify auto-scaling or graceful degradation)
- **Soak**: 50% peak for 30 minutes (find memory leaks, resource exhaustion)

Adjust durations per `toolchain.yaml` → `resilience.load_test_duration`.

### Step 4: Human Clarification

Present the test plan before generating scripts:
```markdown
## Load Test Plan

**Tool:** k6
**Target:** staging (https://staging.example.com)

**NFR Targets:**
- p99 latency: ≤500ms
- Throughput: 1,000 RPS at peak
- Error rate: ≤0.1%

**Scenarios:**
1. Product Browse (60% weight): GET /products → GET /products/{id}
2. Checkout Flow (30% weight): POST /cart → POST /orders → GET /orders/{id}
3. Search (10% weight): GET /search?q=...

**Test Stages:** Baseline (5m) → Ramp (10m) → Peak (15m) → Spike (5m) → Soak (30m)
**Peak virtual users:** ~500 (to achieve 1,000 RPS)

Proceed with this plan? (yes / modify scenarios / adjust targets)
```

### Step 5: Generate Test Scripts

After approval, generate test scripts for the configured tool:
- **k6**: `tests/load/k6-load-test.js` with stages and thresholds
- **Locust**: `tests/load/locustfile.py` with TaskSet classes
- **Gatling**: `tests/load/LoadSimulation.scala`
- **Artillery**: `tests/load/artillery.yaml`
- **JMeter**: `tests/load/load-test.jmx`

Include: think time between requests, realistic headers, auth token refresh, data parameterization.

## Outputs

- `tests/load/<tool>-load-test.<ext>` — executable test script
- `aidlc-docs/<intent>/operations/load-test-design.md` — test plan document
- Updated `toolchain.yaml` with finalized resilience configuration
