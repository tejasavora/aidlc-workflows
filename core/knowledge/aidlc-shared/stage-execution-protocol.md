# Stage Execution Protocol — Superpowers-Informed

## Core Principle: Evidence Before Claims

Claiming work is complete without verification evidence is dishonesty, not efficiency.
If you haven't RUN the verification in THIS turn, you cannot claim it passes.

## Execution Model

Every work-producing stage follows this pattern:

```
1. ORCHESTRATOR reads the stage directive (aidlc-orchestrate next)
2. ORCHESTRATOR dispatches a FRESH IMPLEMENTER subagent for the stage
   - Subagent gets: stage instructions + consumed artifacts + project context
   - Subagent does NOT inherit session history or knowledge of other stages
   - Subagent's ONLY job: produce the stage's outputs
3. IMPLEMENTER produces work:
   - Writes code to src/ (for workspace_requires stages)
   - Writes artifacts to aidlc-docs/ (for doc stages)
   - RUNS verification commands (tests, linter, builds)
   - Returns: what was produced + verification evidence (command output)
4. ORCHESTRATOR dispatches a FRESH REVIEWER subagent
   - Reviewer gets: stage requirements + implementer's output + verification evidence
   - Reviewer does NOT know the implementer or share its context
   - Reviewer's ONLY job: verify the work meets the stage requirements
5. REVIEWER verdicts:
   - PASS: work meets all requirements, evidence confirms
   - FAIL: specific deficiencies listed, must redo
6. If PASS → present to human (AskUserQuestion) → on approve → advance
7. If FAIL → re-dispatch implementer with feedback → loop (max 3)
```

## Why Fresh Subagents

The orchestrator (you) accumulates context across 78 stages. By stage 30, you're optimizing for "finish the session" not "do excellent work." Fresh subagents:
- Have ONE task, no awareness of the queue
- Can't feel pressure to "batch approve" remaining stages
- Start with full context budget for their one job
- Produce better output because they're focused, not fatigued

## The Reviewer Is The Gate

There is NO separate approve/advance/gate-start ceremony. The reviewer's verdict IS the gate:
- Reviewer says PASS + human approves → engine advances (orchestrator calls present-gate --confirm)
- Reviewer says FAIL → orchestrator re-dispatches implementer with feedback
- Human says "Request Changes" → orchestrator re-dispatches with human feedback

The orchestrator NEVER self-judges work quality. Only the reviewer judges.

## Evidence Requirements Per Stage Type

### Code-producing stages (workspace_requires: true)
Evidence MUST include:
- Files created/modified (list with line counts)
- Test output (full pytest/jest/etc output showing pass/fail)
- Build output (compilation successful, no errors)
- For APIs: curl output showing endpoint responds
- For UI: render confirmation (no template errors)

### Design/planning stages
Evidence MUST include:
- Artifact content summary (not just "file created" — what's IN it)
- Completeness check: all sections from stage requirements present
- Consistency check: doesn't contradict prior stage artifacts
- Specificity check: references THIS project's entities/services, not generic

### Operation stages
Evidence MUST include:
- Commands that would execute the operation (even if dry-run)
- Configuration that was written (show the file content)
- Verification that config is valid (lint, validate, parse)

## What Counts as Verification

| Claim | Verification Required |
|-------|----------------------|
| "Tests pass" | Paste the test runner output with 0 failures |
| "Build succeeds" | Paste the build command output with exit 0 |
| "Endpoint works" | Paste the curl response showing correct data |
| "Config is valid" | Paste the validator output (cfn-lint, eslint, etc) |
| "File created" | Paste at minimum the first 10 lines showing real content |
| "Stage complete" | Reviewer subagent's PASS verdict with justification |

## What Does NOT Count

| Not Evidence | Why |
|-------------|-----|
| "I wrote the file" | Proves nothing about content quality |
| "Tests should pass" | "Should" is not evidence |
| "Based on the design..." | Inference is not verification |
| "All requirements met" | Self-assessment is not review |
| File exists at path | Empty/placeholder files exist too |
| "Created 3 artifacts" | Quantity ≠ quality |

## Minimum Content Standards

For any markdown artifact to pass the reviewer:
- Minimum 15 lines of substantive content (not headers/whitespace)
- Must reference project-specific entities (actual service names, actual endpoints, actual config values)
- Must NOT contain: "Stage artifacts produced", "TBD", "TODO", placeholder text
- Must answer: what was done, why, with what specific values for THIS project

## Orchestrator Responsibilities

As the orchestrator, you:
1. Read the next directive
2. Dispatch implementer subagent (Task tool with developer/quality/operations agent)
3. Read implementer's return (work produced + evidence)
4. Dispatch reviewer subagent (Task tool with architecture-reviewer or quality agent)
5. Read reviewer's verdict
6. If PASS → present to human → on approval → call present-gate + --confirm
7. If FAIL → re-dispatch implementer with reviewer feedback
8. Move to next stage

You NEVER:
- Write stage artifacts yourself (dispatch a subagent)
- Judge the quality of work yourself (dispatch a reviewer)
- Skip the reviewer step ("it looks fine, I'll approve")
- Batch multiple stages without individual review
