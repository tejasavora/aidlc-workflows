---
name: aidlc-code-review
description: |
  Independent code review by a separate agent that was NOT involved in code generation.
  Reviews against: functional design, NFR design, coding standards, security baseline.
  Produces structured findings. Auto-fixes simple issues; escalates architectural concerns.
metadata:
  phase: construction
  stage: code-review
  per-unit: "true"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: quality-gates
  max-attempts: 2
---

# Code Review

An independent review of the generated code, performed by a SEPARATE agent instance that was not involved in code generation. This ensures genuine independence — the reviewer has fresh eyes.

## Independence Requirement

The orchestrator MUST invoke this skill using a DIFFERENT agent session than the one that generated the code. The reviewer:
- Has NOT seen the code-generation conversation
- Has NOT made any decisions during this unit's construction
- Reviews ONLY by reading: code, design docs, standards

This is equivalent to a human reviewer who wasn't the author.

## Inputs

- Generated source code for the current unit
- `aidlc-docs/<intent>/construction/<unit>/functional-design/` (expected behavior)
- `aidlc-docs/<intent>/construction/<unit>/nfr-design/` (patterns and constraints)
- `aidlc-docs/<intent>/toolchain.yaml` → `quality.review.standards`
- `aidlc-docs/<intent>/construction/<unit>/quality/static-analysis-report.md` (skip findings already fixed by static-analysis)
- `aidlc-docs/<intent>/construction/<unit>/quality/security-scan-report.md` (skip security findings already addressed)
- Any active lenses (e.g., aidlc-owasp) — their validation rules apply here too

## Prior Gate Awareness

Before producing any findings, read the prior gate reports if they exist:
- `static-analysis-report.md`: contains issues that were already auto-fixed or acknowledged. Do NOT re-flag issues that appear in this report as "fixed". If a finding appears in the static-analysis report as unresolved, treat it as an escalated item — do not duplicate it.
- `security-scan-report.md`: contains security findings already addressed (secrets removed, dependencies upgraded). Do NOT re-raise security findings that this report marks as "fixed". Focus on design-level security concerns (auth logic, data exposure patterns, trust boundary violations) that automated scanners cannot catch.

The code review's value is in what automated tools miss: design adherence, logic correctness, performance patterns, and code structure. Avoid producing noise by re-flagging already-handled findings.

## Review Categories

The reviewer checks for:

1. **Design Adherence** — Does the code implement what functional-design specifies? Missing features? Extra features not in design?
2. **Security** — OWASP Top 10, input validation, auth checks, secrets handling
3. **Performance** — N+1 queries, unnecessary allocations, missing pagination, unbounded loops
4. **Error Handling** — Edge cases covered, exceptions caught appropriately, graceful degradation
5. **Readability** — Naming, structure, single responsibility, dead code
6. **Testing Adequacy** — Are edge cases in tests? Are assertions meaningful?
7. **NFR Compliance** — Does implementation match the NFR design patterns?

## Output Format

```markdown
## Code Review Report

**Unit:** <unit-name>
**Reviewer:** independent-agent (session: <session-id>)
**Files reviewed:** <count>
**Verdict:** APPROVE | REQUEST_CHANGES | BLOCK

### Findings

| # | Category | Severity | File:Line | Finding | Suggestion |
|---|----------|----------|-----------|---------|------------|
| 1 | design-adherence | high | src/order.py:45 | Missing retry logic specified in NFR | Add exponential backoff per nfr-design §3.2 |
| 2 | security | medium | src/api/auth.py:12 | No rate limiting on login endpoint | Add rate limiter middleware |
| 3 | performance | low | src/query.py:78 | Loading all records, then filtering | Move filter to DB query |

### Summary
- Critical: 0
- High: 1
- Medium: 2
- Low: 3
- Informational: 1

### Recommendation
REQUEST_CHANGES — 1 high-severity finding (missing retry logic) must be addressed before proceeding.
```

## Self-Healing

After review findings are produced:
1. **Auto-fix** low/medium findings that have clear fixes (readability, simple performance)
2. **Design-check** high findings: is the design clear? If yes → fix code. If ambiguous → escalate.
3. **Re-review** after fixes (only the changed files)
4. If high/critical remain after 2 attempts → present to human

## Human Review Gate

`artefact-verification: "true"` — The human sees the final review report and approves/requests further changes. This mirrors a real PR approval flow.
