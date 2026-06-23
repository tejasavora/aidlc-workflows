---
slug: bug-triage
phase: maintenance
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

### Step 6: Update State

Mark bug-triage as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :bug:
Review path: `aidlc-docs/maintenance/bug-triage/`
Standard 2-option approval (Approve / Request Changes).
