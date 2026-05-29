---
name: aidlc-dora-metrics
description: |
  Calculate and report the four DORA metrics from the AI-DLC audit trail, git log,
  and deployment history. User-triggered or post-release scheduled. Asks for reporting
  period, targets, and format. Compares results against DORA elite/high/medium/low
  thresholds. Suggests improvements based on the weakest metric.
metadata:
  phase: common
  stage: dora-metrics
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: governance
  max-attempts: 1
---

# DORA Metrics

Calculate and report the four DORA (DevOps Research and Assessment) metrics for this project. The four metrics are the industry-standard measure of software delivery performance, drawn from the annual State of DevOps report.

## Activation

User-triggered or scheduled post-release. Not part of the automated construction/operations flow. Invoked when a team wants to measure their delivery performance over a period.

## Human Clarification

`human-clarification: "true"` — Before calculating, ask:

1. **Reporting period**: Last 30 days / 90 days / quarter / year / custom range?
2. **Targets**: Are there team-defined targets for any metric? (e.g., "we want DF ≥ 1/day")
3. **Output format**: Markdown report / JSON data / both?
4. **Scope**: All deployments, or a specific environment (e.g., production only)?

If the user asks for "quick DORA metrics" without specifying, default to: last 30 days, production environment, markdown report, no custom targets.

## Inputs

- `aidlc-docs/<intent>/governance/audit-trail.jsonl` — deployment events, incidents, rollbacks
- Git log (`git log --format="%H %ai %s"`) — commit timestamps for lead time calculation
- `aidlc-docs/<intent>/operations/*/deploy-report.md` — deployment history per environment
- `aidlc-docs/<intent>/operations/*/smoke-test-report.md` — post-deploy test results (classify failures as incidents)
- Human-provided reporting period and scope

## The Four Metrics

### 1. Deployment Frequency (DF)

**Definition:** How often code is successfully deployed to production (or the target scope environment).

**Data source:** `audit-trail.jsonl` → filter `action: DEPLOYMENT_SUCCEEDED` for the target environment within the reporting period.

**DORA thresholds:**
| Performance | DF |
|---|---|
| Elite | Multiple deploys per day |
| High | Between once per day and once per week |
| Medium | Between once per week and once per month |
| Low | Less than once per month |

**Calculation:**
```
DF = successful_deployments / reporting_period_in_days
Report as: X deploys/day or X deploys/week depending on scale
```

### 2. Lead Time for Changes (LT)

**Definition:** Time from code commit to successful production deployment.

**Data source:** For each production deployment in the period:
- Find the earliest commit SHA included in that deployment (from deploy-report or git log)
- Calculate: `deploy_timestamp - commit_timestamp`
- Median across all deployments in the period

**DORA thresholds:**
| Performance | Lead Time |
|---|---|
| Elite | Less than one hour |
| High | Between one day and one week |
| Medium | Between one week and one month |
| Low | More than six months |

**Calculation:**
```
For each deployment D in period:
  commits_in_D = git log from previous_deploy_SHA to D.SHA
  earliest_commit = min(commit.timestamp for commit in commits_in_D)
  lead_time_D = D.deploy_timestamp - earliest_commit.timestamp
LT = median(lead_time_D for all D)
```

If git history is unavailable, use `audit-trail.jsonl` → `ARTEFACT_CREATED` events as a proxy for commit time.

### 3. Mean Time to Restore (MTTR)

**Definition:** Time from production incident detection to service restoration.

**Data source:**
- Incident start: `audit-trail.jsonl` → `ROLLBACK_TRIGGERED` or failed `smoke-test-report.md`
- Incident end: next `DEPLOYMENT_SUCCEEDED` after rollback, OR `smoke-test-report.md` showing recovery
- If no incidents in period → MTTR = N/A (report as "No incidents in period — excellent")

**DORA thresholds:**
| Performance | MTTR |
|---|---|
| Elite | Less than one hour |
| High | Less than one day |
| Medium | Less than one week |
| Low | More than six months |

**Calculation:**
```
For each incident I in period:
  I.start = rollback_triggered.timestamp or first_smoke_test_failure.timestamp
  I.end = next DEPLOYMENT_SUCCEEDED.timestamp after I.start
  MTTR_I = I.end - I.start
MTTR = mean(MTTR_I for all I)
```

### 4. Change Failure Rate (CFR)

**Definition:** Percentage of deployments that cause a production incident or require a rollback.

**Data source:**
- Total deployments: `DEPLOYMENT_SUCCEEDED` events in period
- Failed deployments: `ROLLBACK_TRIGGERED` events + deployments followed by failed smoke tests

**DORA thresholds:**
| Performance | CFR |
|---|---|
| Elite | 0–5% |
| High | 0–15% (Elite through High use same upper bound per 2023 report) |
| Medium | 16–45% |
| Low | 46–60% |

**Calculation:**
```
CFR = (deployments_causing_incident / total_deployments) * 100
```

## Output Format

### Report Structure

```markdown
## DORA Metrics Report

**Project:** <intent>
**Period:** 2024-01-01 to 2024-01-31 (30 days)
**Environment:** production
**Generated:** 2024-01-31T18:00:00Z

---

### Results

| Metric | Value | Performance Band | Target | Status |
|--------|-------|:---:|--------|:---:|
| Deployment Frequency | 2.3/day | Elite | ≥ 1/day | ✓ |
| Lead Time for Changes | 4h 20min | Elite | < 1 day | ✓ |
| Mean Time to Restore | 2h 45min | High | < 4h | ✓ |
| Change Failure Rate | 8% | High | < 10% | ✓ |

**Overall band:** High (limited by CFR and MTTR)

---

### Trend (vs previous period)

| Metric | Previous | Current | Change |
|--------|----------|---------|--------|
| DF | 1.8/day | 2.3/day | +28% ↑ |
| LT | 6h 10min | 4h 20min | -30% ↑ |
| MTTR | 3h 15min | 2h 45min | -15% ↑ |
| CFR | 12% | 8% | -33% ↑ |

---

### Weakest Metric Analysis

**CFR (8%) is the weakest metric** — currently High band, targeting Elite (< 5%).

Root causes from audit trail:
- 2 of 3 incidents were caused by database migration failures
- 1 incident was an environment config error

Recommended improvements:
1. Add migration dry-run step to pre-deploy gate (estimated CFR impact: -4%)
2. Add environment config validation to smoke-test (estimated CFR impact: -2%)
3. Consider feature flags for risky changes to reduce blast radius

---

### Data Sources

- Deployments analysed: 23
- Incidents analysed: 2
- Git commits in range: 147
- Audit trail entries: 1,284
```

## Outputs

- `aidlc-docs/<intent>/governance/dora-metrics-report.md` (human-readable, as above)
- `aidlc-docs/<intent>/governance/dora-metrics-<period>.json` (machine-readable, if JSON format requested)

## Human Review Gate

`artefact-verification: "true"` — Present the complete metrics report to the human. This is advisory: no automated action is taken based on DORA metrics. The human decides what (if any) process improvements to pursue.
