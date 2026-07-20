# Execution Discipline — How to Actually Run This Successfully

This is the meta-instruction file. It doesn't define WHAT to do (stages do that). It defines HOW to execute the methodology reliably, what to do when things go wrong, and what to prioritize when you can't do everything.

## Rule 0: Subagent Execution + Independent Review (MANDATORY)

**Read `.codex/knowledge/aidlc-shared/stage-execution-protocol.md` FIRST.**

You are the ORCHESTRATOR. You do NOT produce stage work yourself. For every stage:
1. Dispatch a FRESH implementer subagent (Task tool) to do the work
2. Dispatch a FRESH reviewer subagent (aidlc-stage-reviewer-agent) to verify the work
3. Only present the gate to human if the reviewer says PASS
4. If reviewer says FAIL → re-dispatch implementer with feedback

You NEVER write stage artifacts directly. You NEVER judge your own work quality. You NEVER skip the reviewer step.

## Rule 0a: One Unit Per Session (for_each stages)

For stages with `for_each: unit-of-work` (code-generation, functional-design, nfr-requirements, etc.):
- Execute ONE unit per session
- After completing one unit: PARK (`touch aidlc-docs/.aidlc-parked`)
- The next session resumes with the next unit
- Do NOT attempt all units in one context window
- Do NOT rush through multiple units to "finish faster"

The subagent sessions that produce best work (374 tests, real modules) happen when focused on ONE unit. Multi-unit sessions produce placeholders.

## Rule 0b: Never Offer Batch Approve

When presenting AskUserQuestion at a gate, the ONLY options are:
- "Approve" — proceed to next stage
- "Request Changes" — revise this stage

NEVER offer: "Batch approve", "Approve all remaining", "Skip to end", "Continue without gates", or any other escape hatch. These options do not exist. If the human asks for batch approval, respond: "The workflow requires individual approval per stage. I can park and resume later if you need to stop."

## Rule 0c: Park Proactively

After completing each stage (or each unit within a for_each stage):
- If context usage exceeds 50% → PARK immediately (`touch aidlc-docs/.aidlc-parked`)
- If you've been running for more than 5 stages in this session → consider parking
- Parking is CORRECT behavior, not failure. Multi-session workflows produce better output than rushed single-session workflows.

NEVER think "I should finish more before stopping." One stage done well is infinitely better than ten stages done as placeholders.

## Rule 1: One Stage At a Time, Fully

Do NOT pre-read all 78 stages. Load only the CURRENT stage's file. Execute it completely. Emit telemetry. Move on. The stage graph determines order — you don't need to plan ahead.

If you find yourself thinking "I'll skip this step and come back later" — STOP. That's how things get missed. Either do the step now or explicitly skip it with a logged reason in telemetry.

## Rule 2: Non-Negotiables Per Stage

Every stage has steps that are MANDATORY and steps that are BEST-EFFORT. When context is tight or time is limited:

**ALWAYS do (non-negotiable):**
- Load the correct agent persona
- Read consumed artifacts (inputs)
- Produce the declared artifacts (outputs)
- Emit telemetry entry to telemetry.jsonl
- Present the gate (or auto-approve per trust level)

**DO if possible (important but not blocking):**
- Self-healing loop (run tool, fix, re-run)
- Generate clarifying questions (skip if answers derivable from inputs)
- Produce per-step detailed report sections

**SKIP if truly unnecessary (nice-to-have):**
- Extended commentary in artifacts
- Alternative-considered analysis (unless architecture decisions)
- Historical comparison with prior runs

## Rule 3: Checkpoint Summaries Every 5 Stages

After every 5th stage completes, produce a checkpoint in `aidlc-docs/checkpoints/`:

```markdown
# Checkpoint after [stage-name] (stage N of M)

## Key Decisions So Far
- Architecture: [1 sentence]
- Tech stack: [1 sentence]
- Data model: [1 sentence]
- Auth approach: [1 sentence]
- Deploy target: [1 sentence]

## Open Constraints
- [Anything that MUST be honored in all subsequent stages]

## Trust Level: L[N]
## Confidence Trajectory: [improving/stable/declining]
## Contracts Defined: [X of Y passing]
```

This checkpoint survives context compaction. When resuming or when later stages need to remember early decisions, they read the latest checkpoint — not the full history.

## Rule 4: Gate Timeout Behavior

If awaiting human input:
- After 5 minutes: emit `HUMAN_REMINDER` event
- After 15 minutes: emit `HUMAN_WAITING_EXTENDED` event
- After 30 minutes: 
  - L3/L4: auto-approve with `gate_outcome: "timeout_auto_approved"`
  - L1/L2: save complete state, emit `WORKFLOW_PAUSED`, stop cleanly
- NEVER leave a gate hanging indefinitely — it wastes resources and context

## Rule 4b: Parking the Workflow (How to Stop Cleanly)

When you need to end the session mid-workflow (context limit, human said stop, or you've done as much as one session allows):

```bash
touch aidlc-docs/.aidlc-parked
```

This creates a signal file that the stop hook checks. The hook sees it and releases immediately — no more blocking. The next session removes this file on resume and continues from the current stage.

**Do NOT:**
- Rubber-stamp remaining stages to reach "done"
- Use `--test-run` to bypass guards on stages you haven't executed
- Call `advance` or `approve` without producing output just to silence the hook
- Call `complete-workflow` on a partially-done workflow

**The stop hook WILL release after 2 blocks regardless** (CLAUDE_CODE_STOP_HOOK_BLOCK_CAP=2). But parking is cleaner and communicates intent.

## Rule 5: Canary Execution (Fail Fast)

Before committing to the full pipeline, verify basic viability:

After SHAPE + CONTRACT phases complete (before BUILD loop starts):
1. Take the FIRST function from the FIRST increment
2. Generate it
3. Run its contract test
4. If pass: proceed with full pipeline
5. If fail after 3 regenerations: STOP and escalate

Why: If you can't generate ONE function correctly, generating 50 will just burn tokens. Better to discover the problem (ambiguous contract? unknown technology? hallucination?) on attempt 1 than attempt 50.

## Rule 6: Regenerate, Don't Patch (During Build Loop)

When contract tests fail:
- DO: regenerate the function from scratch with the test failure as context
- DO NOT: try to "fix" the broken code by editing specific lines

Why: patching preserves structural problems. LLMs are better at generating WITH constraints (test must pass) than debugging existing broken code. The test failure IS the constraint that makes the next generation better.

Exception: if the failure is a simple config issue (wrong port, missing env var), fix directly. Regeneration is for logic/design failures, not typos.

## Rule 7: Abort Criteria (When to Stop)

STOP the workflow and escalate to human if:
- 3 consecutive stages have confidence < 0.5 (systemic problem)
- The same contract fails 3 times with 3 different implementations (contract may be wrong)
- Token cost exceeds 80% of budget with < 50% of stages complete (will exceed budget)
- Sandbox has been unhealthy for > 3 consecutive deploys (infrastructure problem, not code)
- Human has been waiting > 1 hour with no response option available

Don't soldier on when the system is clearly failing. Early abort + diagnosis = less waste than completing a broken workflow.

## Rule 8: Telemetry Is Mandatory, Not Optional

Emitting telemetry to `aidlc-docs/telemetry.jsonl` is as mandatory as producing artifacts. If you complete a stage and realize you forgot telemetry — append it NOW before moving to the next stage.

Minimum viable telemetry (even when rushing):
```json
{"stage":"<slug>","timestamp_end":"<now>","duration_seconds":<N>,"confidence_score":<0.X>,"gate_outcome":"<outcome>"}
```

Better to emit partial telemetry than no telemetry. No telemetry = invisible stage = can't debug.

## Rule 9: Don't Hallucinate Telemetry

If you don't KNOW a metric value, emit `null` — not a guess.
- If you didn't measure coverage → `"coverage_line": null` (not 80)
- If you didn't count findings → `"findings.total": null` (not 0)
- If you're unsure about confidence → emit lower than you think (0.5 not 0.8)

Honest telemetry with nulls is infinitely more valuable than confident-looking fake data.

## Rule 10: Adaptive Relevance Is Mandatory

Before executing any CONDITIONAL stage, spend 10 seconds asking: "Is this stage relevant to THIS project?" Check:
- Does the project have a database? (skip data stages if not)
- Does it have a UI? (skip frontend stages if not)
- Is it internet-facing? (skip some security stages if internal-only)
- Does it have multiple services? (skip cross-service stages if monolith)

Log the decision either way:
- Relevant: "Executing — project has PostgreSQL database"
- Not relevant: "Skipping — no frontend in this project (API only)"

## Rule 11: When In Doubt, Ask

If a stage's instructions are ambiguous and you're unsure whether to:
- Skip a step vs do it anyway
- Choose approach A vs B
- Use training data vs research via MCP

Default to: ASK THE HUMAN (L1/L2) or RESEARCH VIA MCP (L3/L4).

Never default to: generating from training data when uncertain. That's where hallucination lives.

## Rule 12: Recovery Protocol

If the session is interrupted (crash, timeout, manual stop):

On resume:
1. Read `aidlc-docs/aidlc-state.md` — find current stage
2. Read `aidlc-docs/telemetry.jsonl` — find what completed successfully
3. Read latest checkpoint in `aidlc-docs/checkpoints/` — restore key decisions
4. Resume from the stage that was interrupted (not from the beginning)
5. Do NOT re-execute completed stages (telemetry proves they ran)

If state file is corrupt or missing:
1. Read `aidlc-docs/` directory structure — infer progress from which artifacts exist
2. Present findings to human: "I think we were at stage X. Confirm?"
3. Resume from confirmed point
