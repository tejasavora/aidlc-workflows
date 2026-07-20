---
trigger: model_decision
description: "AI-DLC V2 maintenance: tech-debt-assessment"
---


# Tech Debt Assessment

Produce a structured, quantified assessment of the project's technical debt. This is an advisory skill — it identifies and prioritises debt but does not auto-fix it. Fixes require deliberate human decision and are addressed through normal construction or maintenance workflows.

## Inputs

- All source code
- `aidlc-docs/<intent>/` — all design documents (to detect architecture drift)
- `aidlc-docs/<intent>/toolchain.yaml` → `maintenance.tech_debt` thresholds
- Test coverage data (from last quality-gates run, if available)
- Dependency data (from last dependency audit, if available)

## Execution

### Step 1: Human Clarification

Ask:
1. What is the scope? (full project, specific module, or specific concern)
2. Is this for prioritisation (what to fix next) or for a compliance report?
3. Are there known areas of concern to focus on?

### Step 2: Analyse Complexity Hotspots

For each source file:
- Calculate cyclomatic complexity per function
- Flag functions exceeding `tech_debt.complexity_threshold` (default: 10)
- Rank by: (complexity × call frequency) — highest risk functions first

Tools: `radon` (Python), `complexity-report` (JS), `gocyclo` (Go), `checkstyle` (Java), or equivalent.

### Step 3: Detect Coverage Gaps

Compare current test coverage against `tech_debt.coverage_floor` (default: 75%).
List: files/functions below floor, ordered by business criticality (inferred from story references in aidlc-docs).

### Step 4: Detect Architecture Drift

Compare current code structure against aidlc-docs design documents:
- Are there modules that were NOT in any functional-design? (undocumented growth)
- Are there design patterns specified in NFR-design that are not implemented? (drift)
- Are there coupling violations (modules that directly call others outside their bounded context)?

### Step 5: Identify Outdated Patterns

Scan for:
- Deprecated library APIs in use
- Anti-patterns (God objects, spaghetti dependencies, magic numbers, hardcoded config)
- Missing observability (functions with no logging, services with no metrics)
- Security-relevant patterns: missing input validation, direct SQL construction, etc.

### Step 6: Assess Dependency Staleness

For each dependency, calculate days since last update and flag those exceeding `staleness_days` (default: 180).
Separate from CVE concerns — this is about general currency.

### Step 7: Produce Prioritised Remediation Plan

Rank all findings by:
1. Security risk (highest priority)
2. Reliability risk (complexity × usage frequency)
3. Maintainability impact (coverage gaps, drift)
4. Operational risk (staleness, missing observability)

Output:
```markdown
## Tech Debt Assessment

**Date:** 2024-01-15
**Scope:** Full project

### Priority 1 — Security Risk
- [ ] `src/api/auth.py`: Direct SQL construction (SQL injection risk) — HIGH

### Priority 2 — Reliability Risk
- [ ] `src/services/order.py:process_order`: Cyclomatic complexity 18 — HIGH
- [ ] `src/services/payment.py`: 0% test coverage (critical path) — HIGH

### Priority 3 — Maintainability
- [ ] `src/utils/legacy_transformer.py`: No design document found (architecture drift)
- [ ] 3 modules coupling across bounded contexts

### Priority 4 — Operational
- [ ] `requests` library: 280 days since update (no CVE but outdated)

**Estimated remediation effort:** 12-15 story points
**Recommended: schedule as a dedicated sprint before next major release**
```

## Outputs

- `aidlc-docs/<intent>/maintenance/tech-debt-assessment-<date>.md`
- No code changes (advisory only)

## Artefact Verification

`artefact-verification: "true"` — Human reviews the assessment and decides which items to schedule for remediation. The output feeds into sprint planning or a dedicated tech-debt backlog, not into immediate auto-fixes.
