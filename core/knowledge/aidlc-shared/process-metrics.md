# Process Metrics Collection

Every stage in AI-DLC should contribute to process observability. These metrics enable longitudinal tracking of methodology effectiveness — proving the system works over time and identifying where to optimize.

## What to Collect (per stage)

Every stage completion message should include a `## Process Metrics` section in its memory.md diary:

```markdown
## Process Metrics
- Stage: <slug>
- Started: <ISO8601>
- Completed: <ISO8601>
- Duration: <seconds>
- Gate outcome: approved | revised-1 | revised-2 | revised-3 | auto-approved | escalated
- Self-healing attempts: <0-3>
- Self-healing auto-fixed: <count>
- Self-healing escalated: <count>
- Artifacts produced: <count>
- Questions asked: <count>
- Questions auto-answered: <count> (from prework/prior artifacts)
```

## Aggregation Points

These metrics are aggregated at three levels:

### Per-Stage (in memory.md)
Raw observation during execution.

### Per-Phase (at phase boundary)
Summarized when a phase completes:
- Total stages executed / skipped / failed
- Total time in phase
- Total self-healing cycles
- Most-revised stage (which stage needed the most revision loops)
- Auto-approval rate (stages that passed on first attempt)

### Per-Workflow (at workflow completion)
Full workflow summary:
- Total stages: executed / skipped
- Total duration (wall clock)
- Total gate approvals: first-attempt / revised / auto-approved
- Self-healing success rate: auto-fixed / total-findings
- Production readiness score (from production-readiness-review)
- Runtime validation score (from runtime-validation)
- Cost estimate (tokens consumed, if trackable)

## How This Enables Autonomous Execution

The path from L2 (guided) to L3 (supervised) requires empirical evidence:

| Metric | L3 Threshold | What It Proves |
|--------|-------------|----------------|
| First-attempt approval rate | >= 90% | System produces correct output without revision |
| Self-healing resolution rate | >= 85% | System fixes its own problems |
| Runtime validation pass rate | >= 90% | Deployed system actually works |
| Cross-run consistency | Improving trend | Methodology is getting better, not worse |
| Escalation rate | <= 10% | Human intervention is rare, not constant |

When these thresholds are met consistently across 50+ runs, the system has empirically earned the right to operate autonomously with metric-based auto-approval.

## Comparison Across Runs

To compare runs:
1. Every workflow stores its metrics in `aidlc-docs/workflow-metrics.md` at completion
2. The dora-metrics governance stage reads historical metrics if available
3. Trend visualization: is readiness score improving, stable, or declining?
4. Root cause: if a metric degrades, which stage is responsible?
