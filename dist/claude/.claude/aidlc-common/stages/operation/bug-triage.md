---
slug: bug-triage
phase: operation
execution: CONDITIONAL
condition: Execute when a bug is reported, a test failure is detected, or monitoring alerts fire. This is the entry point for the design-first bug fix workflow.
lead_agent: aidlc-developer-agent
support_agents:
  - aidlc-quality-agent
  - aidlc-architect-agent
mode: inline
produces:
  - bug-analysis
  - fix-plan
  - bug-triage-questions
consumes:
  - artifact: code-summary
    required: false
  - artifact: requirements
    required: false
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - poc
  - bugfix
  - security-patch
inputs: Bug report (user-provided or from monitoring), existing codebase, design artifacts
outputs: aidlc-docs/maintenance/bug-triage/bug-analysis.md, aidlc-docs/maintenance/bug-triage/fix-plan.md, aidlc-docs/maintenance/bug-triage/bug-triage-questions.md
---

# Bug Triage

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Design-First Principle

This stage enforces the AI-DLC principle: **read the design before touching the code**. Most recurring bugs are caused by fixing symptoms rather than roots. This stage traces the bug through the traceability chain (requirement → story → design → code → test) to find where the breakdown occurred.

## Steps

### Step 1: Load Agent Personas

Load aidlc-developer-agent persona from `agents/aidlc-developer-agent.md` and knowledge from `.claude/knowledge/aidlc-developer-agent/`.

### Step 2: Capture Bug Context

Gather from the user or monitoring:
- Symptom description (what's happening vs. what should happen)
- Steps to reproduce (if known)
- Error messages, stack traces, log snippets
- Affected environment (dev, staging, production)
- Severity assessment (P1-P4)
- When it started (recent deployment? always existed?)

### Step 3: Trace Through Design

Follow the traceability chain:
1. **Find the requirement**: which requirement does this behavior relate to?
2. **Find the story**: which user story defined the expected behavior?
3. **Find the design**: what does functional-design say about this case?
4. **Find the code**: which component implements this logic?
5. **Find the test**: is there a test that should have caught this?

Classify the root cause:
- **Design gap**: the design doesn't account for this case → fix design first, then code
- **Implementation gap**: the design is correct but code doesn't match → fix code
- **Test gap**: the code was correct but a change broke it without detection → fix code + add test
- **Requirement gap**: the requirement never specified this behavior → update requirement + design + code

### Step 4: Generate Bug Analysis

Create `bug-analysis.md`:
- Bug summary and reproduction steps
- Root cause classification (design/implementation/test/requirement gap)
- Traceability chain (which artifacts are affected)
- Impact assessment (other features/components affected)
- Regression risk (what could break when fixing this)

### Step 5: Generate Fix Plan

Create `fix-plan.md`:
- Artifacts to update (in order): requirement? → design? → code → test
- Specific changes needed at each level
- Regression test to add (test that reproduces the bug)
- Verification steps (how to confirm the fix works)
- Rollback plan (if fix causes new issues)

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :bug:
- Summary of bug-analysis, fix-plan
- Review path: `<record>/operation/bug-triage/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .claude/tools/aidlc-orchestrate.ts report --stage bug-triage --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/bug-triage/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/bug-triage/required-sections-<iso>.md`.

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
- Verification check → new manifest at `.claude/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
