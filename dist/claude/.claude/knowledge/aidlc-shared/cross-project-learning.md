# Cross-Project Learning

At workflow START, before any stage executes, the agent MUST check for prior run data and load lessons learned. This prevents repeating the same mistakes across projects.

## On Workflow Start

1. Check for `aidlc-docs/methodology-improvement-log.jsonl` in the workspace (from prior runs)
2. Check for `.claude/rules/aidlc-project-learnings.md` (persisted learnings from prior sessions)
3. If found, extract and load as constraints:

```
FOR each entry in methodology-improvement-log.jsonl (last 5 runs):
  IF entry.new_issues_discovered is non-empty:
    Load as "KNOWN PITFALL: [issue]. Previously caused: [symptom]. Prevention: [fix]"
  IF entry.regressions is non-empty:
    Load as "REGRESSION WARNING: [what got worse]. Root cause: [cause]"
```

## Constraint Format

Lessons become HARD constraints in the agent's context:

```markdown
## Lessons From Prior Runs (auto-loaded)

### PITFALL: DynamoDB Global Tables construct hallucination
- Seen in: 3/5 prior runs
- Symptom: code-generation produces `new GlobalTable()` which doesn't exist as L2 construct
- Prevention: ALWAYS use `Table` with `replicationRegions` property. Verify via MCP before generating.

### PITFALL: htmx partial endpoints return JSON instead of HTML
- Seen in: 5/5 UI projects  
- Symptom: htmx swap replaces HTML with raw JSON, breaking the page after first poll
- Prevention: Every hx-get route MUST return rendered HTML fragment, not JSON. Use same template partial.

### REGRESSION: coverage-enforcement adds trivial tests
- Seen after: adding coverage-enforcement stage
- Symptom: tests like `assert user != null` that always pass but inflate coverage
- Prevention: Every generated test must assert a SPECIFIC behavior from requirements, not just non-null.
```

## What Gets Stored After Each Run

The `workflow-telemetry` stage appends to `methodology-improvement-log.jsonl`:
- `new_issues_discovered`: novel problems not in existing knowledge files
- `regressions`: things that got worse vs prior run
- `systematic_mistakes`: patterns that repeated 3+ times within this run
- `knowledge_gaps`: technologies where MCP returned no results

## Decay Policy

Lessons older than 10 runs are archived (moved to separate file). Only recent lessons load into context — prevents unbounded growth. If a lesson hasn't been relevant in 10 runs, it's no longer a pattern worth constraining.

## Agent Behavior

When a lesson is loaded:
- It acts as a RULE (not suggestion) — the agent must actively prevent the documented pitfall
- If the agent encounters the exact situation described, it MUST apply the documented prevention
- If the prevention doesn't apply (different technology, different pattern), it can ignore it
- New instances of the same pitfall = methodology failure (should have been prevented)
