---
slug: workflow-telemetry
phase: operation
execution: ALWAYS
condition: Always executes as the FINAL stage of every workflow — computes and stores the workflow summary from accumulated per-stage telemetry. This is the methodology's self-assessment.
lead_agent: aidlc-operations-agent
support_agents: []
mode: inline
produces:
  - workflow-summary
  - stage-performance-report
  - improvement-recommendations
consumes: []
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - poc
  - bugfix
  - refactor
  - infra
  - security-patch
  - workshop
inputs: aidlc-docs/telemetry.jsonl (accumulated per-stage telemetry from entire workflow)
outputs: aidlc-docs/workflow-summary.json, aidlc-docs/governance/workflow-telemetry/stage-performance-report.md, aidlc-docs/governance/workflow-telemetry/improvement-recommendations.md
---

# Workflow Telemetry

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This is the methodology's self-assessment — it reads all per-stage telemetry emitted during the workflow and produces a structured summary that enables cross-run comparison, debugging, and autonomous readiness assessment.

## Steps

### Step 1: Read Accumulated Telemetry

Read `aidlc-docs/telemetry.jsonl` — one JSON line per stage that executed. Parse all entries.

### Step 2: Compute Workflow Summary

Aggregate into `aidlc-docs/workflow-summary.json`:

**Execution stats:**
- Total stages executed, skipped, failed
- Total duration (wall clock from first stage start to last stage end)
- Mean duration per stage
- Longest stage (bottleneck identification)

**Contract effectiveness:**
- Total contracts defined (from contract-generation)
- First-attempt pass rate (code satisfied contract without regeneration)
- After-regeneration pass rate
- Escalation rate (contracts that couldn't be satisfied)

**Self-healing effectiveness:**
- Total findings across all quality gates
- Auto-fix rate (findings resolved without human)
- Escalation rate (findings that required human)
- Most common finding categories

**Human interaction:**
- Total human interventions (gate revisions + escalations)
- Reasons breakdown (design ambiguity, contract unclear, technology unknown, business decision)
- Stages with most human intervention

**Quality outcome:**
- Final production readiness score
- Final runtime validation score
- Final coverage percentages
- Security findings remaining
- Deployment health status

**Confidence:**
- Mean confidence across all stages
- Confidence distribution (how many stages > 0.8, how many < 0.5)
- Lowest confidence stage (the weakest link)

### Step 3: Compute Stage Performance Report

Create `stage-performance-report.md`:

| Stage | Duration | Confidence | Findings | Fixed | Escalated | Gate |
|-------|----------|-----------|----------|-------|-----------|------|
| ... | ... | ... | ... | ... | ... | ... |

Sorted by: lowest confidence first (identify where methodology is weakest).

### Step 4: Generate Improvement Recommendations

Based on the telemetry, identify methodology improvements:

- **High escalation stages:** "contract-generation escalated 3 times — contracts may need more context from requirements"
- **Low confidence stages:** "frontend-verification confidence 0.4 — sandbox wasn't available, couldn't validate runtime"
- **High regeneration:** "code-generation regenerated 2.5x avg per function — functional-design may lack detail"
- **Expensive + low-value:** "backward-compat took 5min, found 0 issues — consider making CONDITIONAL for this scope"
- **Human intervention patterns:** "3/4 interventions were 'technology unknown' — knowledge-acquisition research should run earlier"

Format as actionable items:
```markdown
## Recommendations for Next Run

1. [HIGH] functional-design should include more implementation detail for [specific area]
   - Evidence: code-generation regenerated 3x for auth module
   - Impact: would reduce regeneration by ~60% for similar projects

2. [MEDIUM] sandbox-deploy should run earlier (before contract-generation)
   - Evidence: 4 contract tests couldn't validate runtime behavior without sandbox
   - Impact: contracts would be more verifiable from the start
```

### Step 5: Autonomous Readiness Assessment

Based on the data, assess whether this project's execution would have succeeded at higher trust levels:

```markdown
## Autonomous Readiness

| Metric | This Run | L3 Threshold | Verdict |
|--------|----------|-------------|---------|
| First-attempt contract pass | 78% | >= 90% | NOT READY |
| Self-healing resolution | 91% | >= 85% | READY |
| Runtime validation score | 95% | >= 90% | READY |
| Human interventions | 6 | <= 3 | NOT READY |
| Mean confidence | 0.82 | >= 0.8 | READY |

Verdict: 3/5 thresholds met. NOT ready for L3 autonomous.
Blocking factor: contract first-attempt pass rate (needs better functional-design detail)
```

### Step 6: Store Workflow Summary

Write `aidlc-docs/workflow-summary.json` (structured, machine-readable).

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :bar_chart:
- Summary of workflow-summary, stage-performance-report, improvement-recommendations
- Review path: `<record>/operation/workflow-telemetry/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .kiro/tools/aidlc-orchestrate.ts report --stage workflow-telemetry --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/workflow-telemetry/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/workflow-telemetry/required-sections-<iso>.md`.

## Learn

While running this stage, maintain a running log in
`<record>/<phase>/<stage>/memory.md` (create on stage start if absent).
Append entries under four standard headings:

- **Interpretations** — choices made where the stage prose was ambiguous
- **Deviations** — places you intentionally departed from the stage prose, and why
- **Tradeoffs** — alternatives considered and why you picked what you did
- **Open questions** — anything to confirm before next run, or uncertain context

Format each entry with an ISO 8601 timestamp:
`- 2026-05-20T10:14:32Z — <summary>; <context>`

Before the approval gate, read memory.md and surface candidates as a
structured question. For each entry the user keeps, write to the appropriate
harness destination per `stage-protocol.md` §13 — never to this stage file:

- Prescriptive rule → a practice line under the routed heading in
  `aidlc/spaces/<active-space>/memory/project.md` (default) or `team.md` (promoted)
- Verification check → new manifest at `.kiro/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
