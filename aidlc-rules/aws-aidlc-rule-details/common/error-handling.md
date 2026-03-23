# Error Handling and Recovery

## Error Handling Principles

1. Identify the error and assess if blocking or workable
2. Inform user with options and clear resolution steps
3. Log error and resolution in `audit.md`

## Error Severity Levels

- **Critical** — Workflow cannot continue (missing files, invalid input, system errors)
- **High** — Phase cannot complete (incomplete answers, contradictory responses, missing dependencies)
- **Medium** — Workarounds possible (optional artifacts missing, non-critical validation failures)
- **Low** — Non-blocking (formatting issues, optional info missing)

## Error Categories and Actions

### Input/Requirements Errors
- **Contradictory requirements** — Create follow-up questions to resolve. Do not proceed until resolved.
- **Incomplete answers** — Highlight unanswered questions, provide examples. Do not proceed until complete.
- **Ambiguous responses** — Add follow-up questions with specific examples. Do not proceed until clear.

### Artifact/File Errors
- **Cannot read workspace files** — Verify path/permissions; fall back to user-provided info
- **Corrupted `aidlc-state.md`** — Backup, ask user to start fresh or attempt recovery
- **Cannot generate artifacts** — Return to prerequisite stage for clarification; generate partial with gaps marked
- **Empty/corrupted artifact file** — Backup corrupted file, regenerate from source stage

### Design/Architecture Errors
- **Circular unit dependencies** — Identify cycles, suggest boundary refactoring
- **Unclear architectural decision** — Add follow-up questions. Do not proceed until documented.
- **Incompatible tech stack** — Highlight incompatibilities, ask user to choose. Do not proceed until resolved.
- **Cannot determine services/units** — Default to monolith, allow change later

### Implementation Errors
- **Code syntax errors** — Fix and regenerate; verify compilation before proceeding
- **Test generation fails** — Generate basic structure, mark for manual completion
- **Unit dependencies not satisfied** — Reorder generation sequence; use stubs if needed
- **Human action required** (network config, credentials) — Mark as **HUMAN TASK**, wait for confirmation

### Operations Errors
- **Cannot determine build tool** — Ask user to specify; provide generic instructions as fallback
- **Unclear deployment target** — Ask user to specify; provide common platform instructions

## Recovery Procedures

### Partial Phase Completion
1. Load phase plan file
2. Find last completed step (last `[x]` checkbox)
3. Verify prior steps are actually complete
4. Resume from next uncompleted step

### Corrupted State File
1. Create backup: `aidlc-state.md.backup`
2. Ask user which phase they're on
3. Regenerate state file; mark completed phases based on existing artifacts
4. Resume from current phase

### Missing Artifacts
1. Identify missing artifacts and source stage
2. If regeneratable: return to that stage and re-execute
3. If not: ask user to provide information manually
4. Document gap in `audit.md`

### Phase Restart
1. Confirm with user (data will be lost)
2. Archive existing artifacts: `{artifact}.backup`
3. Reset phase status in `aidlc-state.md` and clear plan checkboxes
4. Re-execute from beginning

### Phase Skip
1. Confirm user understands implications (may cause downstream failures)
2. Mark as "SKIPPED" in `aidlc-state.md`; document reason in `audit.md`
3. Proceed to next phase

## Session Resumption

### State Validation on Resume
1. Check `aidlc-state.md` matches actual artifacts on disk
2. Load artifacts stage-by-stage, validating each

### Resumption Error Resolution

| Condition | Action |
|-----------|--------|
| State says complete, artifacts missing | Mark stage incomplete, re-execute |
| Artifacts exist, state says incomplete | Verify artifacts valid, update state to complete |
| Multiple stages marked "current" | Review artifacts, ask user, correct to single current stage |
| Cannot load context from prior stages | List needed artifacts, regenerate or ask user |
| Artifacts contain contradictions | Present contradictions to user, reconcile before proceeding |

### Resumption Best Practices
- Always validate state against actual artifacts
- Fail fast on missing critical artifacts
- Communicate exactly what's missing and why
- Offer options: regenerate, provide manually, or start fresh
- Log all recovery actions in `audit.md`

## Escalation Guidelines

### Ask User Immediately
- Contradictory or ambiguous input
- Missing required information
- Technical constraints AI cannot resolve
- Decisions requiring business judgment

### Ask After Attempting Resolution
- Repeated errors in same step
- Complex technical issues
- Unusual project structures
- External system integration

### Consider Fresh Start If
- Multiple phases have errors or state is severely corrupted
- Requirements changed significantly or architecture needs reversal
- Artifacts are inconsistent across phases

Before fresh start: archive all work, document lessons learned, get user confirmation.

## Prevention
1. Validate inputs and dependencies before starting work
2. Update checkboxes immediately after completing steps
3. Clarify ambiguities immediately — do not assume
4. Document all decisions and changes in `audit.md`
