# Autonomous Gate Policy (Smart Auto-Approval)

## Overview

In supervised-autonomous mode (L3), approval gates should auto-approve when empirical metrics prove the stage output is correct — and escalate to human ONLY when metrics indicate uncertainty or failure. This eliminates the false choice between "human approves everything" (L2) and "skip all gates" (--test-run).

## Gate Policy Model

Each stage's approval gate evaluates against a threshold policy:

```yaml
gate_policy:
  mode: metric-based    # metric-based | always-human | always-auto
  
  conditions:
    auto_approve_when:
      - metric: "findings_critical"
        operator: "=="
        value: 0
      - metric: "findings_high" 
        operator: "<="
        value: 2
      - metric: "coverage_line"
        operator: ">="
        value: 80
    
    escalate_when:
      - metric: "findings_critical"
        operator: ">"
        value: 0
      - metric: "self_healing_exhausted"
        operator: "=="
        value: true
    
    always_human:
      - stage: "deployment-execution"
        environment: "production"
      - stage: "delivery-planning"
        reason: "human judgment on sequencing"
```

## Default Policy Per Phase

| Phase | Default Gate Mode | Rationale |
|-------|------------------|-----------|
| Initialization | always-auto | Deterministic, no judgment needed |
| Ideation | always-human | Strategy decisions require human judgment |
| Inception | metric-based | Auto-approve if artifacts are complete and consistent |
| Construction | metric-based | Auto-approve if all quality metrics pass thresholds |
| Operation (non-prod) | metric-based | Auto-approve if validation scores pass |
| Operation (prod) | always-human | Production deployment always needs human sign-off |
| Maintenance | metric-based | Auto-approve if fix is verified by tests |
| Governance | always-auto | Metrics collection is informational, not gated |

## Metric Thresholds for Auto-Approval

| Stage | Auto-Approve If | Escalate If |
|-------|----------------|-------------|
| static-analysis | 0 errors after self-healing | Errors remain after 3 attempts |
| security-scan | 0 critical, 0 high after self-healing | Any critical/high remain |
| coverage-enforcement | Line >= 80%, Branch >= 70% | Below threshold after test generation |
| integration-verification | 100% real implementations | Any stubs remain |
| frontend-verification | >= 95% interactions functional | Contract violations remain |
| production-readiness-review | Readiness score >= 85% | Score below 85% |
| runtime-validation | 100% happy-path, >= 90% error-path | Any happy-path failures |
| environment-verification | 100% critical checks pass | Any critical check fails |

## Implementation

This policy is read by the conductor at gate-time. The conductor:
1. Collects the stage's produced metrics
2. Evaluates against the policy conditions
3. If ALL `auto_approve_when` conditions are true AND no `escalate_when` conditions are true → auto-approve
4. If ANY `escalate_when` condition is true → present to human with metrics
5. If `always_human` matches → always present to human regardless of metrics

## Activation

Smart gates activate when:
- `aidlc-state.md` contains `Autonomy Level: supervised` (set during scope confirmation)
- The user explicitly opted in via `/aidlc --autonomy supervised`
- NOT active by default — the system earns autonomy through demonstrated reliability

## Audit Trail

Every auto-approval emits:
```
GATE_AUTO_APPROVED {
  stage: "<slug>",
  metrics: { ... },
  policy: "metric-based",
  thresholds_met: ["findings_critical==0", "coverage>=80"],
  timestamp: "<ISO8601>"
}
```

This is distinct from `--test-run` auto-approval (which carries `Test-Run=true`) and from human approval (which carries the exact user input). Audit consumers can filter by approval type to assess gate reliability.

## Escalation UX

When a metric-based gate escalates (metrics below threshold), the human sees:

```
Stage [static-analysis] completed with issues below auto-approval threshold:

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Critical errors | 0 | 0 | PASS |
| High errors | 3 | <= 2 | FAIL |
| Self-healing attempts | 3/3 | — | Exhausted |

The system attempted to auto-fix 5 findings. 2 remain after 3 attempts.
Remaining findings: [summary]

Options: Approve (accept risks) | Request Changes | Abort
```

This gives the human enough context to make a fast decision without investigating the full artifact.
