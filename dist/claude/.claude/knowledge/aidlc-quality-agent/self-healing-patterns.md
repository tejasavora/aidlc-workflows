# Self-Healing Quality Gate Patterns

Quality gates in AI-DLC use a self-healing loop pattern: run a tool, classify findings, auto-fix what's safe, re-run, escalate what remains. This document defines the pattern for agents executing quality-related stages.

## The Core Loop

```
attempt = 0
max_attempts = configurable (default: 3)

WHILE findings exist AND attempt < max_attempts:
  1. EXECUTE: Run the configured tool(s)
  2. PARSE: Extract structured findings {severity, location, message, suggested_fix}
  3. CLASSIFY each finding into one of three buckets:
     - auto-fixable: deterministic fix exists, low risk of side effects
     - needs-design-review: fix requires reading design artifacts to determine correct approach
     - needs-human: ambiguous, risky, or involves policy/business decision
  4. AUTO-FIX: apply fixes for auto-fixable findings
  5. DESIGN-FIX: for needs-design-review findings:
     a. Read relevant aidlc-docs/ artifacts (functional-design, NFR, infrastructure)
     b. Determine if the code is wrong or the design is wrong
     c. If design is wrong: update design artifact, then fix code to match
     d. If code is wrong: fix code to match existing design
  6. RE-RUN: execute the tool again to verify fixes
  7. INCREMENT: attempt += 1

IF findings remain after max_attempts:
  ESCALATE to human with:
  - Original findings list
  - What was attempted at each iteration
  - Remaining findings with context
  - Recommended action (fix guidance, skip gate, or abort)
```

## Classification Heuristics

### Auto-Fixable (safe to fix without human input)
- **Style/formatting**: indentation, trailing whitespace, import order, bracket placement
- **Unused code**: unused imports, variables, dead code branches
- **Simple type errors**: missing type annotations inferrable from context, null checks
- **Dependency versions**: patch/minor bumps with no breaking changes
- **Config defaults**: missing required config fields with obvious defaults
- **Missing tests**: coverage gaps where the test is a straightforward assertion of documented behavior

### Needs-Design-Review (must read design artifacts)
- **Complexity violations**: cyclomatic > threshold may indicate design decomposition needed
- **Missing error handling**: need to check design for how errors should flow
- **Architectural boundary violations**: imports crossing defined module boundaries
- **Missing validation**: need to check requirements for which inputs are validated where
- **Security findings**: injection risks where the fix depends on trust boundary design

### Needs-Human (cannot resolve without policy input)
- **Business logic ambiguity**: multiple valid interpretations exist
- **Performance vs. correctness trade-offs**: caching strategy, eventual consistency decisions
- **False positive confirmation**: tool flags code that may be intentionally written that way
- **License compatibility**: dependency license conflicts with project requirements
- **Data handling**: PII classification, retention decisions, compliance implications

## Tool Adapter Pattern

The self-healing loop is tool-agnostic. Each gate stage defines the CAPABILITY; the tool selection comes from project configuration:

1. Check `aidlc-docs/<intent>/toolchain.yaml` (if toolchain-discovery has run)
2. Check project config files (`.eslintrc`, `pyproject.toml`, `Cargo.toml`)
3. Detect from installed packages (`package.json` devDependencies, etc.)
4. Ask the user if nothing is detectable

The same loop pattern works regardless of whether the linter is ruff, eslint, or clippy.

## Escalation Format

When escalating to the human, present:

```markdown
## Quality Gate: [stage-name] — Escalation

**Attempts**: 3/3 exhausted
**Initial findings**: 12
**Auto-fixed**: 8
**Design-fixed**: 2
**Remaining**: 2

### Finding 1: [title]
- **Location**: `src/api/handler.ts:45`
- **Severity**: High
- **Tool**: eslint (no-unsafe-assignment)
- **Why it wasn't auto-fixed**: Multiple valid type narrowing approaches; depends on error handling strategy
- **Suggested options**:
  A) Type guard with runtime check (safer, verbose)
  B) Type assertion with comment (concise, requires trust in caller)
  C) Suppress with eslint-disable + justification comment

### Finding 2: ...
```

## Integration with Sensors

The self-healing loop runs INSIDE the stage execution (Steps section of the stage file). Sensors run AFTER stage completion as a verification pass. If a sensor fires and detects a regression introduced during the self-healing loop, the stage is flagged for revision — the conductor's Keep/Modify/Redo decision applies.

## Principles

1. **Fix, don't suppress**: `eslint-disable` or `# noqa` is a last resort, not a fix
2. **Design is upstream**: if a fix contradicts the design, the design needs updating first
3. **Bounded attempts**: never loop indefinitely; 3 attempts balances thoroughness vs. cost
4. **Transparent escalation**: show the human everything that was tried
5. **Idempotent fixes**: re-running the tool after a fix must show the finding resolved
6. **No silent failures**: if a tool errors (timeout, config issue), report it — don't skip the gate
