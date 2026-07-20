---
trigger: model_decision
description: "AI-DLC V2 operations: canary-analysis"
---


# Canary Analysis

Monitor the canary (or blue-green) deployment by comparing its metrics against the stable baseline. Make a data-driven promote/rollback decision based on configurable thresholds. Runs AFTER the canary portion of the deployment and BEFORE full traffic promotion.

## Activation Condition

Activates when `toolchain.yaml` → `ci_cd.deploy_strategy` is `canary` or `blue-green`. If strategy is `rolling`, `recreate`, or absent, this skill is skipped.

## Inputs

- `aidlc-docs/<intent>/toolchain.yaml` → `ci_cd` section:
  ```yaml
  ci_cd:
    deploy_strategy: canary       # canary | blue-green
    canary_traffic_percentage: 10  # % of traffic sent to canary
    canary_analysis_duration: 10m  # how long to observe before deciding
    canary_thresholds:
      error_rate_delta: 0.005     # 0.5% absolute increase triggers rollback
      p95_latency_delta: 0.20     # 20% relative increase triggers rollback
      p99_latency_delta: 0.50     # 50% relative increase triggers rollback (optional)
      min_requests: 100           # minimum requests before analysis is valid
    monitoring:
      tool: cloudwatch            # cloudwatch | datadog | prometheus | newrelic | custom
      namespace: MyApp/Production
      canary_identifier: canary   # tag/label that identifies canary traffic
      baseline_identifier: stable
  ```
- `aidlc-docs/<intent>/operations/<env>/deploy-report.md` — confirm canary was deployed, get deployment timestamp
- Monitoring tool (CloudWatch, Datadog, Prometheus, etc.) — live metric data

## Execution

### Step 1: Confirm Canary Is Active

Verify the canary is receiving traffic before starting the analysis window:
1. Read `deploy-report.md` to get canary deployment timestamp
2. Query monitoring tool: confirm canary instances are receiving requests
3. Confirm request count is climbing toward `min_requests` threshold
4. If canary receives no traffic after 5 minutes → escalate (routing config issue, not a metrics issue)

### Step 2: Establish Baseline Metrics

Query the monitoring tool for the baseline (stable) deployment over the same analysis window:

| Metric | Query |
|--------|-------|
| Error rate | `rate(http_requests_total{status=~"5..",target=baseline}[analysis_duration])` |
| P95 latency | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{target=baseline}[analysis_duration]))` |
| P99 latency | `histogram_quantile(0.99, ...)` (if configured) |
| Request rate | `rate(http_requests_total{target=baseline}[analysis_duration])` |

Tool-specific query patterns:

**CloudWatch:**
```python
# Error rate: sum of 5xx / total requests
cloudwatch.get_metric_statistics(
    Namespace=config.namespace,
    MetricName='5xxError',
    Dimensions=[{'Name': 'Stage', 'Value': config.baseline_identifier}],
    Period=analysis_duration_seconds,
    Statistics=['Sum']
)
```

**Datadog:**
```
sum:trace.web.request.errors{env:production,version:stable}.as_rate()
```

**Prometheus:**
```
rate(http_requests_total{job="myapp", version="stable", status_code=~"5.."}[10m])
```

If the monitoring tool is unfamiliar → invoke `knowledge-acquisition` meta-skill.

### Step 3: Collect Canary Metrics

Query the same metrics for the canary deployment over the analysis window, using `canary_identifier` to filter.

Minimum request check: if canary has received fewer than `min_requests` at the end of the analysis window → extend window by 50% and re-check. If still insufficient after extension → report as INCONCLUSIVE (not a failure — traffic may be low-volume).

### Step 4: Compute Deltas and Apply Thresholds

Calculate the delta between canary and baseline for each metric:

```
error_rate_delta = canary_error_rate - baseline_error_rate
p95_latency_delta_pct = (canary_p95 - baseline_p95) / baseline_p95
p99_latency_delta_pct = (canary_p99 - baseline_p99) / baseline_p99  # if configured
```

Apply thresholds:

| Metric | Threshold | Canary | Baseline | Delta | Decision |
|--------|-----------|--------|----------|-------|----------|
| Error rate | +0.5% abs | 1.2% | 0.8% | +0.4% | PASS |
| P95 latency | +20% rel | 145ms | 130ms | +11.5% | PASS |
| P99 latency | +50% rel | 280ms | 260ms | +7.7% | PASS |

**Decision logic:**
- ALL metrics within thresholds for full analysis window → **PROMOTE**
- ANY metric breaches threshold → **ROLLBACK**
- Insufficient traffic after extended window → **INCONCLUSIVE** (present to human)

### Step 5: Execute Decision (with Human Gate for Production)

**For non-production environments** (where `auto_promote: true`):
- PROMOTE: execute promotion command automatically, log decision in audit-trail
- ROLLBACK: execute rollback command automatically, log with full metrics evidence

**For production** (always requires human confirmation, regardless of `auto_promote`):

Present the decision with full evidence:

```markdown
## Canary Analysis Decision

**Environment:** production
**Decision:** PROMOTE ✓ (all metrics within thresholds)
**Analysis window:** 10 minutes
**Canary traffic:** 10% (1,247 requests analysed)

| Metric | Threshold | Canary | Baseline | Delta | Status |
|--------|-----------|--------|----------|-------|--------|
| Error rate | < +0.5% | 0.82% | 0.79% | +0.03% | PASS |
| P95 Latency | < +20% | 138ms | 131ms | +5.3% | PASS |
| P99 Latency | < +50% | 265ms | 259ms | +2.3% | PASS |

Promote canary to 100% traffic? (yes / no / extend-window)
```

For a ROLLBACK decision, present the same table with the breaching metric highlighted and immediate action required.

If the human responds with `extend-window` → repeat analysis for an additional `canary_analysis_duration` before re-presenting.

### Step 6: Execute Promotion or Rollback

**Promote:**
- Shift 100% of traffic to canary instances
- Decommission old baseline instances
- Update `deploy-report.md` with promotion timestamp and final metrics

**Rollback:**
- Shift 100% of traffic back to baseline immediately
- Terminate canary instances
- Log full metrics evidence to `canary-analysis-report.md`
- Notify orchestrator: canary rolled back, deployment did not complete

## Outputs

- `aidlc-docs/<intent>/operations/<env>/canary-analysis-report.md`
  - Decision (PROMOTE / ROLLBACK / INCONCLUSIVE)
  - Full metrics comparison table (canary vs baseline)
  - Analysis window duration and request counts
  - Threshold configuration used
  - Confidence note (based on request volume)
  - Promotion or rollback execution confirmation

## Human Review Gate

`artefact-verification: "true"` — For production, the promote/rollback decision is ALWAYS presented to the human before execution. For non-production with `auto_promote: true`, the report is generated and available but execution does not block for human input.

## Decision Is Final

`max-attempts: 1` — The canary analysis runs once per deployment. The decision is promote or rollback — there is no retry loop. If the human requests an extended window, that is handled via the `extend-window` interaction within Step 5, not via max-attempts.
