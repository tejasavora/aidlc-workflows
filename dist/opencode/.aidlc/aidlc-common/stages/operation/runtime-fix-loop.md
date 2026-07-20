---
slug: runtime-fix-loop
phase: operation
execution: CONDITIONAL
condition: Execute when runtime-validation discovers failures that are fixable (code bugs, config errors, missing wiring). Skip if runtime-validation passes clean or failures require manual infrastructure changes.
lead_agent: aidlc-developer-agent
support_agents:
  - aidlc-quality-agent
  - aidlc-operations-agent
mode: inline
produces:
  - fix-log
  - redeploy-results
  - runtime-fix-questions
consumes:
  - artifact: runtime-validation-report
    required: true
  - artifact: runtime-metrics
    required: true
  - artifact: code-summary
    required: true
requires_stage:
  - runtime-validation
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - workshop
inputs: Runtime validation failures, generated code, deployment configuration
outputs: aidlc-docs/operation/runtime-fix-loop/fix-log.md, aidlc-docs/operation/runtime-fix-loop/redeploy-results.md, aidlc-docs/operation/runtime-fix-loop/runtime-fix-questions.md
---

# Runtime Fix Loop

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage closes the loop between "deployment failed verification" and "deployment passes verification" WITHOUT human intervention. It is the critical bridge for autonomous execution — when runtime-validation finds failures, this stage diagnoses, fixes, redeploys, and re-validates automatically.

## Why This Stage Exists

In a human-driven workflow, a failed deployment triggers: developer reads error → investigates code → makes fix → commits → redeploys → retests. This cycle takes hours or days with context switches. For autonomous execution, this cycle must be automated and bounded.

Without this stage, any runtime-validation failure halts the autonomous pipeline and waits for a human — making "autonomous" a lie.

## Steps

### Step 1: Load Agent Personas

Load aidlc-developer-agent persona from `agents/aidlc-developer-agent.md` and knowledge from `.aidlc/knowledge/aidlc-developer-agent/`.

### Step 2: Analyze Runtime Failures

Read the runtime-validation-report and classify each failure:

| Failure Type | Diagnosis Method | Fix Approach |
|-------------|-----------------|-------------|
| Wrong API response shape | Compare actual vs expected (from functional-design) | Fix route handler return value |
| Endpoint returns 500 | Read error in logs/response body | Fix the exception source |
| Endpoint returns 404 | Route not registered | Add missing route registration |
| Database query fails | Connection error vs query error | Fix connection config or query |
| External API timeout | Network or auth issue | Fix URL/credentials/timeout config |
| Frontend render error | Template/component error | Fix template variable or import |
| WebSocket not connecting | Handler not registered or CORS | Fix WS route or upgrade handling |
| Event not firing | Publisher not wired to bus | Wire event emission in the handler |
| Auth failure | Token/role misconfigured | Fix auth config or IAM policy |

### Step 3: Cross-Phase Fix Loop

```
cycle = 0
max_cycles = 3

WHILE runtime failures exist AND cycle < max_cycles:

  FOR each failure in runtime-validation-report:
    1. TRACE: Map failure to source code location
       - API error → find the route handler → find the called service → find the bug
       - Config error → find the referenced env var / secret → fix the value
       - Wiring error → find where the connection should be established → add it

    2. FIX: Apply the correction
       - Code fix: modify source file(s)
       - Config fix: update .env / config file / IaC variable
       - Wiring fix: add missing registration/subscription/connection

    3. TEST LOCALLY: Run unit/integration tests for affected code
       - If tests fail: fix is wrong, try different approach
       - If tests pass: proceed to redeploy

  4. REDEPLOY: Execute deployment with the fixes
     - Run build
     - Deploy to same environment
     - Wait for health check to pass

  5. RE-VALIDATE: Run runtime-validation checks for previously-failing endpoints
     - If all pass: loop complete, proceed
     - If some still fail: increment cycle, loop again

  cycle += 1
END WHILE

IF failures remain after max_cycles:
  ESCALATE with:
  - Original failures
  - Fixes attempted at each cycle
  - Current state (which improved, which didn't)
  - Hypothesis for why fix didn't work
```

### Step 4: Generate Fix Log

Create `fix-log.md`:
- Cycle count (how many fix-redeploy-validate iterations)
- Per-failure: original error → diagnosis → fix applied → result
- Code files modified
- Redeployment count
- Final runtime-validation result (pass/fail/partial)

### Step 5: Generate Redeploy Results

Create `redeploy-results.md`:
- Each redeployment: timestamp, changes included, build result, deploy result
- Health check status after each deploy
- Runtime-validation delta (which failures resolved at each cycle)
- Final state: all endpoints passing / partial / still failing

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :arrows_counterclockwise:
- Summary of fix-log, redeploy-results
- Review path: `<record>/operation/runtime-fix-loop/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .aidlc/tools/aidlc-orchestrate.ts report --stage runtime-fix-loop --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/runtime-fix-loop/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/runtime-fix-loop/required-sections-<iso>.md`.

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
- Verification check → new manifest at `.aidlc/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
