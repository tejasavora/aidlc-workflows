---
name: aidlc-bug-triage
description: |
  Design-first bug fixing. Read ALL aidlc-docs, trace the bug to requirements/design,
  classify root cause (DESIGN_BUG / CODE_BUG / TEST_GAP / REQUIREMENT_GAP), fix at the
  root level, add regression test, verify fix. Never fix symptoms — fix roots.
metadata:
  phase: maintenance
  stage: bug-triage
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "true"
  plan-verification: "true"
  artefact-verification: "true"
  pack: maintenance
  max-attempts: 3
---

# Bug Triage

The most important maintenance skill. Fixes bugs at their root cause by reading all design documents first, classifying where the failure actually originated, and cascading the fix from design through code to tests.

## Core Principle

NEVER jump straight to editing code. Read the design first. The bug may be in the design, and fixing only the code will allow the bug to recur when code is regenerated or refactored.

## Inputs

- Bug report (description, steps to reproduce, expected vs. actual behaviour)
- ALL `aidlc-docs/<intent>/` documents (requirements, stories, design, NFR)
- Source code for the suspected unit(s)
- Test files for the suspected unit(s)

## Execution

### Step 1: Reproduce the Bug

Before investigating, reproduce the bug:
1. Run the failing test (if a test exists)
2. If no test: write a minimal reproduction test that demonstrates the failure
3. Confirm: the reproduction is consistent

If the bug cannot be reproduced → ask human for more information. Do not classify without reproduction.

### Step 2: Human Clarification

Before investigation, ask:
1. Which unit or feature does this bug relate to?
2. Is this a regression (was it working before) or a never-worked defect?
3. Is there a priority or deadline for this fix?
4. Any known related bugs or recent changes?

### Step 3: Trace Through Design Documents

Read documents in this order:
1. `aidlc-docs/<intent>/inception/requirements.md` — does the requirement cover this case?
2. `aidlc-docs/<intent>/inception/stories.md` — is there a story for this scenario?
3. `aidlc-docs/<intent>/construction/<unit>/functional-design/` — does the design describe correct behaviour for this input?
4. Source code — does the code match the design?
5. Test code — does the test check what the design says it should?

Record: where the failure originates in this chain.

### Step 4: Classify Root Cause

| Classification | Definition | Fix Target |
|---------------|------------|------------|
| `DESIGN_BUG` | Design does not handle this case. Code correctly implements (incomplete) design. | Fix design → cascade to code + test |
| `CODE_BUG` | Design handles it correctly. Code diverges from design. | Fix code to match design → update test if test was wrong |
| `TEST_GAP` | Design and code are both correct. No test covers this path. | Add test; no code change needed |
| `REQUIREMENT_GAP` | Neither design nor code covers it. Business requirement is missing. | Escalate to human — needs new story and design before fixing |

### Step 5: Plan the Fix

Present the classification and fix plan:
```markdown
## Bug Triage Report

**Bug:** Order total shows 0 when discount code is applied
**Reproduction:** ✓ (test added: test_order_total_with_discount)
**Classification:** CODE_BUG

**Trace:**
- requirements.md §3.2: "Discounts reduce the order total"
- stories.md USR-012: "User applies discount code at checkout"
- functional-design/checkout.md §4: "Total = subtotal × (1 - discount_rate)"
- checkout.py:89: `total = subtotal * discount_rate` (WRONG — subtracts instead of reduces)
- test_checkout.py: no test for discount scenario (TEST_GAP also)

**Fix plan:**
1. Fix `checkout.py:89`: `total = subtotal * (1 - discount_rate)`
2. Add test `test_order_total_with_discount` (already written in reproduction step)

Proceed? (yes / reclassify / more info)
```

### Step 6: Apply Fix

Apply the fix at the correct level:
- **DESIGN_BUG**: edit functional-design document first, then update code to match, then update tests
- **CODE_BUG**: edit code to match design; update test if it was also wrong
- **TEST_GAP**: add the test only; do not change code
- **REQUIREMENT_GAP**: do not fix; create issue/story and present to human

### Step 7: Verify Fix

1. Run the reproduction test — must pass
2. Run the full unit test suite — must not regress
3. Run quality-gates (static-analysis, security-scan) if code was changed
4. Confirm the regression test is committed alongside the fix

## Outputs

- `aidlc-docs/<intent>/maintenance/bug-<id>-report.md` (full triage trace)
- Fixed source files (if CODE_BUG or DESIGN_BUG)
- Fixed/updated design documents (if DESIGN_BUG)
- New regression test (always)

## Artefact Verification

`artefact-verification: "true"` — Human reviews the triage report and fix plan before any code is changed. Verification also happens after: human confirms the fix resolves the reported issue.
