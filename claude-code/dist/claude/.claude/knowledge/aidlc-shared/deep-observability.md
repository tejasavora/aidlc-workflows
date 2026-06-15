# Deep Observability — Exhaustive Methodology Instrumentation

Extends `methodology-observability.md` with the metrics needed to fully debug, improve, and prove the AI-DLC methodology. The base telemetry captures WHAT happened. This captures WHY and WHERE things went wrong.

## Additional Per-Stage Telemetry Fields

Append these to the telemetry.jsonl entry alongside the base fields:

```json
{
  "input_quality": {
    "artifacts_consumed": ["<artifact-name>", ...],
    "artifacts_missing": ["<expected-but-not-found>", ...],
    "artifacts_incomplete": ["<artifact with missing sections>", ...],
    "input_ambiguity_score": <0.0-1.0>,
    "prework_used": <boolean>,
    "prework_coverage": <percent of questions answered from prework vs asked fresh>
  },
  "decision_trace": [
    {
      "decision": "<what was decided>",
      "alternatives_considered": ["<option A>", "<option B>"],
      "reason": "<why this choice>",
      "confidence": <0.0-1.0>,
      "source": "design_artifact | knowledge_file | mcp_research | training_data | human_input"
    }
  ],
  "artifact_output_quality": {
    "artifact_name": "<name>",
    "completeness": <0.0-1.0>,
    "sections_present": <number>,
    "sections_expected": <number>,
    "internal_consistency": <boolean>,
    "references_valid": <boolean>,
    "downstream_consumers": ["<stage-slug that will read this>"]
  },
  "hallucination_detection": {
    "api_calls_generated": <number>,
    "api_calls_verified_via_mcp": <number>,
    "api_calls_unverified": <number>,
    "packages_referenced": <number>,
    "packages_verified_exist": <number>,
    "packages_hallucinated": <number>,
    "methods_generated": <number>,
    "methods_signature_verified": <number>
  },
  "context_utilization": {
    "knowledge_files_loaded": <number>,
    "knowledge_files_actually_referenced": <number>,
    "design_artifacts_read": <number>,
    "design_sections_referenced_in_output": <number>,
    "design_sections_ignored": ["<section that was read but not used>"],
    "tokens_in_context": <number>,
    "tokens_actively_used": <estimated number>
  },
  "design_drift": {
    "checked": <boolean>,
    "deviations_found": <number>,
    "deviations": [
      {
        "design_says": "<what the design artifact specifies>",
        "code_does": "<what was actually generated>",
        "justified": <boolean>,
        "justification": "<null or why deviation is intentional>"
      }
    ]
  },
  "token_efficiency": {
    "tokens_input": <number>,
    "tokens_output": <number>,
    "lines_of_code_produced": <number or null>,
    "artifacts_produced_bytes": <number>,
    "tokens_per_useful_line": <ratio or null>,
    "spinning_detected": <boolean>
  },
  "cross_stage_coherence": {
    "checked_against": ["<prior-stage-slug>"],
    "contradictions_found": <number>,
    "contradictions": [
      {
        "this_stage_says": "<decision made here>",
        "prior_stage_said": "<conflicting decision from earlier>",
        "resolution": "this_stage_wins | prior_stage_wins | escalated"
      }
    ]
  }
}
```

## Root Cause Analysis Schema

When a workflow produces suboptimal output, the telemetry should enable tracing the root cause backward through the stage chain. Add a `root_cause_chain` to any stage that encounters a problem:

```json
{
  "root_cause_chain": {
    "symptom_stage": "<where the problem was detected>",
    "symptom": "<what went wrong>",
    "trace": [
      {
        "stage": "<upstream stage>",
        "artifact": "<which artifact>",
        "issue": "missing | ambiguous | wrong | hallucinated",
        "detail": "<specific problem in that artifact>"
      }
    ],
    "root_cause_stage": "<earliest stage where the problem originated>",
    "fix_target": "<which stage/artifact needs to change to prevent recurrence>"
  }
}
```

Example:
```json
{
  "root_cause_chain": {
    "symptom_stage": "runtime-validation",
    "symptom": "POST /api/users returns 500 instead of 201",
    "trace": [
      {"stage": "code-generation", "artifact": "user-service.ts", "issue": "wrong", "detail": "calls non-existent DB method insertUser()"},
      {"stage": "functional-design", "artifact": "entities.yaml", "issue": "ambiguous", "detail": "entity User defined but persistence method not specified"},
      {"stage": "requirements-analysis", "artifact": "requirements.md", "issue": "missing", "detail": "FR-3 says 'users can register' but no detail on persistence mechanism"}
    ],
    "root_cause_stage": "requirements-analysis",
    "fix_target": "functional-design (should specify persistence methods for each entity)"
  }
}
```

## Methodology Improvement Signals

These computed metrics (derived from telemetry) indicate WHERE the methodology needs improvement:

### Signal 1: Upstream Propagation Rate
```
For each stage S that fails or needs regeneration:
  Trace root cause to upstream stage U
  upstream_propagation_rate[U] += 1

High propagation rate for stage U = that stage's output is unreliable
→ Improve U's quality gate or add more detail to U's step instructions
```

### Signal 2: Knowledge Gap Frequency
```
For each hallucination or MCP query that returns no result:
  knowledge_gap_frequency[technology] += 1

High gap frequency for technology T = add dedicated knowledge file for T
```

### Signal 3: Human Intervention Clustering
```
For each human intervention:
  Cluster by: stage + reason

If cluster count > 3 across runs:
  The methodology cannot handle this situation autonomously
  → Add more instructions to that stage, or add a new decision rule
```

### Signal 4: Regeneration Pattern Analysis
```
For each regeneration:
  Record: function_type + failure_reason + what_changed_in_regen

If same pattern repeats > 5 times across runs:
  The agent makes a SYSTEMATIC mistake for this function type
  → Add knowledge file with correct pattern for this type
```

### Signal 5: Artifact Dependency Health
```
For each artifact consumed by a downstream stage:
  Track: was it complete? was it used? did it cause issues?

artifact_health_score = (times_useful - times_caused_issues) / times_consumed

Low health score = artifact format needs redesign or producing stage needs enhancement
```

## Debugging Workflow: How to Use This Data

### "Why was the output wrong?"
1. Read `workflow-summary.json` → find lowest confidence stage
2. Read that stage's telemetry entry → check `root_cause_chain`
3. Trace backward to origin → identify which upstream artifact was the source
4. Check `input_quality.artifacts_incomplete` at the symptom stage
5. Check `design_drift.deviations` — was the code wrong or the design wrong?

### "Why did the agent make that choice?"
1. Read `decision_trace` for the relevant stage
2. Check `source` — was it from design, knowledge, MCP, or training data?
3. If `source: training_data` → the agent guessed (hallucination risk)
4. If `source: knowledge_file` → check if knowledge is outdated
5. If `source: design_artifact` → check if design was ambiguous

### "Why did it take so long / cost so much?"
1. Read `token_efficiency` per stage
2. Find stages with high `tokens_per_useful_line` → spinning or over-generating
3. Check `regeneration.attempts` — excessive regeneration = unclear contracts
4. Check `context_utilization.tokens_in_context` vs `tokens_actively_used` → bloated context

### "Why didn't it use the prework?"
1. Read `input_quality.prework_used` and `prework_coverage`
2. If `prework_coverage < 50%` → prework format doesn't match what the stage expects
3. Check `questions_asked` vs `questions_from_prework` — high fresh questions = prework mismatch

### "Is this technology causing systematic problems?"
1. Aggregate `hallucination_detection.packages_hallucinated` across runs
2. Aggregate `knowledge_gap_frequency` per technology
3. High hallucination + high gap = needs dedicated knowledge file or MCP server

### "Which stages are actually useful?"
1. Compute per stage: `value = findings_caught + regressions_prevented`
2. Compute per stage: `cost = duration_seconds + tokens_output`
3. `roi = value / cost`
4. Stages with `roi < 0.1` across 10+ runs → candidate for removal or merge

## Cross-Run Improvement Tracking

Store `aidlc-docs/methodology-improvement-log.jsonl` (append per run):

```json
{
  "run_id": "<workflow_id>",
  "date": "<ISO8601>",
  "scope": "<scope>",
  "methodology_version": "<git commit of aidlc rules>",
  "key_metrics": {
    "contract_first_attempt_rate": <percent>,
    "self_healing_rate": <percent>,
    "human_interventions": <count>,
    "runtime_validation_score": <percent>,
    "mean_confidence": <0.0-1.0>,
    "total_cost_usd": <number>,
    "total_duration_hours": <number>
  },
  "improvements_applied_since_last": ["<description of methodology change>"],
  "new_issues_discovered": ["<novel problems not seen before>"],
  "regressions": ["<things that got worse since last run>"]
}
```

This log enables:
- Trend charts (is the methodology improving over time?)
- A/B comparison (did adding contract-generation help? Compare before/after runs)
- Regression detection (did a methodology change make things worse?)
- ROI calculation (cost per point of quality improvement)
