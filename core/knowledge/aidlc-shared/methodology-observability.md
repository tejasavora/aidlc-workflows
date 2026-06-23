# Methodology Observability — Self-Measurement Protocol

Every stage in AI-DLC MUST emit structured telemetry about its own execution. This data enables:
1. Debugging WHY a workflow produced suboptimal output
2. Comparing runs to measure methodology improvement
3. Proving empirically that the methodology works (or doesn't)
4. Identifying which stages provide value vs which are overhead

## Mandatory Telemetry (Every Stage)

At stage completion, BEFORE presenting the approval gate, append to `aidlc-docs/telemetry.jsonl`:

```json
{
  "stage": "<slug>",
  "phase": "<phase>",
  "unit": "<unit-name or null>",
  "timestamp_start": "<ISO8601>",
  "timestamp_end": "<ISO8601>",
  "duration_seconds": <number>,
  "gate_outcome": "approved | revised | auto-approved | escalated",
  "revision_count": <0-N>,
  "findings": {
    "total": <number>,
    "auto_fixed": <number>,
    "design_fixed": <number>,
    "escalated": <number>,
    "false_positive": <number>
  },
  "regeneration": {
    "attempts": <0-3>,
    "reason": "<null or description of why regeneration was needed>"
  },
  "contracts": {
    "total": <number or null>,
    "passed_first_attempt": <number or null>,
    "passed_after_regen": <number or null>,
    "failed_escalated": <number or null>
  },
  "artifacts_produced": <number>,
  "questions_asked": <number>,
  "questions_from_prework": <number>,
  "knowledge_consulted": ["<knowledge-file-name>", ...],
  "mcp_queries": <number>,
  "sandbox_deploys": <number or null>,
  "runtime_checks": {
    "endpoints_tested": <number or null>,
    "endpoints_passed": <number or null>,
    "endpoints_failed": <number or null>
  },
  "quality_metrics": {
    "coverage_line": <percent or null>,
    "coverage_branch": <percent or null>,
    "security_critical": <number or null>,
    "security_high": <number or null>,
    "lint_errors": <number or null>
  },
  "human_intervention": {
    "occurred": <boolean>,
    "reason": "<null or why human was needed>",
    "action": "<null or what human decided>"
  },
  "confidence_score": <0.0-1.0>
}
```

## Confidence Score Calculation

Each stage self-assesses its output confidence (0.0 = no confidence, 1.0 = verified correct):

| Condition | Score Impact |
|-----------|:---:|
| All contract tests pass first attempt | +0.3 |
| Zero security findings | +0.1 |
| Coverage above threshold | +0.1 |
| Deployed and runtime healthy | +0.2 |
| No regeneration needed | +0.1 |
| MCP research confirmed API accuracy | +0.1 |
| Human approved without revision | +0.1 |
| **Maximum** | **1.0** |

Deductions:
| Condition | Score Impact |
|-----------|:---:|
| Contract tests failed (but passed after regen) | -0.1 per regen |
| Self-healing needed | -0.05 per finding |
| Escalation to human | -0.2 |
| Runtime validation failed | -0.3 |
| Knowledge gap (no MCP result available) | -0.1 |

## Workflow-Level Aggregation

At workflow completion, compute and store `aidlc-docs/workflow-summary.json`:

```json
{
  "workflow_id": "<unique>",
  "scope": "<scope>",
  "trust_level": "L1 | L2 | L3 | L4",
  "intent": "<one-line description>",
  "started": "<ISO8601>",
  "completed": "<ISO8601>",
  "total_duration_seconds": <number>,
  "stages": {
    "executed": <number>,
    "skipped": <number>,
    "failed": <number>
  },
  "contracts": {
    "total_defined": <number>,
    "passed_first_attempt": <number>,
    "passed_after_regen": <number>,
    "failed_escalated": <number>,
    "first_attempt_pass_rate": <percent>
  },
  "self_healing": {
    "total_findings": <number>,
    "auto_fixed": <number>,
    "escalated": <number>,
    "resolution_rate": <percent>
  },
  "human_interventions": {
    "total": <number>,
    "reasons": {"design_ambiguity": N, "contract_unclear": N, "tech_unknown": N, ...}
  },
  "quality": {
    "final_coverage_line": <percent>,
    "final_coverage_branch": <percent>,
    "security_findings_remaining": <number>,
    "production_readiness_score": <percent>,
    "runtime_validation_score": <percent>
  },
  "deployment": {
    "sandbox_deploys": <number>,
    "deploy_failures": <number>,
    "rollbacks": <number>,
    "final_status": "healthy | degraded | failed"
  },
  "confidence": {
    "mean_stage_confidence": <0.0-1.0>,
    "lowest_confidence_stage": "<slug>",
    "highest_confidence_stage": "<slug>"
  },
  "cost": {
    "estimated_tokens_input": <number or null>,
    "estimated_tokens_output": <number or null>,
    "estimated_cost_usd": <number or null>
  }
}
```

## What This Data Enables

### Debugging a Failed Run
"The runtime-validation score was 60%. Which endpoints failed?" → Read telemetry.jsonl for runtime-validation stage → see `runtime_checks.endpoints_failed` with details in the stage's report.

### Comparing Methodology Changes
"Did adding contract-generation improve first-attempt pass rates?" → Compare `contracts.first_attempt_pass_rate` across runs with and without contract-generation.

### Proving Autonomous Readiness
"Is the system ready for L3?" → Show 50+ runs where:
- `contracts.first_attempt_pass_rate` >= 90%
- `self_healing.resolution_rate` >= 85%
- `human_interventions.total` <= 3
- `quality.runtime_validation_score` >= 90%

### Identifying Weak Stages
"Which stage is least reliable?" → Sort stages by mean confidence_score across runs → lowest confidence = needs improvement.

### Cost Optimization
"Which stages are expensive but low-value?" → Compare `duration_seconds` and `estimated_tokens_output` against `findings.total` (issues caught). High cost + zero findings = candidate for removal or reduction.

## Implementation

### Where to Emit
- Append to `aidlc-docs/telemetry.jsonl` (one JSON line per stage completion)
- This file is committed with aidlc-docs/ (not gitignored — it IS the empirical record)

### When to Emit
- AFTER all stage work is complete
- BEFORE presenting the approval gate
- The telemetry emission is part of the stage protocol (like state update)

### How to Use in Next Session
- On workflow resume: read telemetry.jsonl to understand what already ran and how well
- On workflow completion: compute workflow-summary.json
- Cross-run comparison: read workflow-summary.json from prior runs (if in same repo)

## Stage Protocol Addition

Add to stage-protocol.md completion message flow:

```
Step N-1 (before gate): Emit telemetry
  - Compute all metrics for this stage
  - Append to aidlc-docs/telemetry.jsonl
  - Include confidence_score

Step N: Present Completion & Request Approval
  - Include confidence_score in completion message:
    "Stage confidence: 0.85 (contracts pass, deployed, minor self-healing)"
```

The confidence score becomes part of the approval decision:
- L3/L4: auto-approve if confidence >= 0.8
- L1/L2: shown to human as context ("this stage is 95% confident" vs "62% confident — review carefully")
