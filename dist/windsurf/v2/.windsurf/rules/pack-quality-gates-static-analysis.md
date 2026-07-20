---
trigger: model_decision
description: "AI-DLC V2 quality-gates: static-analysis"
---


# Static Analysis

Run the project's configured static analysis tool(s) against the code generated for this unit. Auto-fix what can be fixed. Escalate what cannot.

## Inputs

- Generated source code for the current unit (from code-generation stage)
- `aidlc-docs/<intent>/toolchain.yaml` → `quality.static_analysis` section
- `aidlc-docs/<intent>/construction/<unit>/functional-design/` (for design-reference checks)

## Execution

### Step 1: Determine Tool

Read `toolchain.yaml` → `quality.static_analysis.tool`. If not set, detect from project:
- `pyproject.toml` with `[tool.ruff]` → ruff
- `.eslintrc.*` or `eslint.config.*` → eslint
- `golangci-lint` in PATH or `.golangci.yml` → golangci-lint
- `.checkstyle.xml` → checkstyle
- None found → ask user (via knowledge-acquisition meta-skill if tool is unfamiliar)

### Step 2: Run Analysis

Execute the tool with the project's configuration. Capture output as structured findings.

Expected output format (normalize from any tool):
```json
[
  {
    "rule_id": "E501",
    "severity": "warning",
    "file": "src/handlers/order.py",
    "line": 42,
    "message": "Line too long (120 > 88 characters)",
    "fixable": true,
    "category": "style"
  }
]
```

Categories: `style`, `complexity`, `correctness`, `security`, `performance`, `dead-code`, `type-error`

### Step 3: Classify and Remediate

For each finding:

| Category | Auto-fixable? | Action |
|----------|:---:|--------|
| `style` | Yes | Apply tool's auto-fix (e.g., `ruff --fix`, `eslint --fix`) |
| `dead-code` | Yes | Remove unused imports/variables/functions |
| `complexity` | Maybe | If refactor is obvious, apply. If architectural, flag for design review. |
| `correctness` | Maybe | Simple fixes (missing return, wrong type) → fix. Logic errors → design review. |
| `security` | No | Always escalate to security-scan gate (don't auto-fix security issues) |
| `performance` | Maybe | Obvious (unnecessary loop, N+1) → fix. Architectural → design review. |
| `type-error` | Yes | Add/fix type annotations |

### Step 4: Design Review (if needed)

If any finding is classified as needing design review:
1. Read the relevant functional-design document
2. Check: does the design specify this behavior?
3. If design is silent → update design to address the issue, then fix code
4. If design contradicts the fix → flag for human review
5. Log the design change in audit trail

### Step 5: Re-run and Loop

After applying fixes:
1. Re-run the analysis tool
2. Count remaining findings
3. If 0 findings or only informational → PASS
4. If findings remain AND attempt < max → loop back to Step 3
5. If findings remain AND attempt >= max → ESCALATE

## Outputs

- `aidlc-docs/<intent>/construction/<unit>/quality/static-analysis-report.md`
  - Tool used, findings count, auto-fixes applied, remaining issues, attempts made
- Modified source files (fixes applied in-place)
- Updated design documents (if design-fix was needed)

## Escalation Format

When escalating to human:
```markdown
## Static Analysis Gate — Escalation

**Tool:** ruff (pyproject.toml config)
**Attempts:** 3/3
**Original findings:** 12
**Auto-fixed:** 9
**Remaining:** 3

### Remaining Issues
1. **src/services/order.py:89** — Function `process_order` has cyclomatic complexity 15 (threshold: 10). Refactoring requires architectural decision about order state machine.
2. **src/handlers/webhook.py:34** — Unreachable code after early return. But removing it changes behavior if exception handling is added later.
3. **src/models/product.py:12** — Circular import between product and inventory modules.

### What I've Tried
- Attempt 1: Extracted helper functions (reduced complexity from 15 to 12, still over threshold)
- Attempt 2: Tried splitting into sub-functions but the state dependencies prevent clean separation
- Attempt 3: No further obvious refactoring without changing the design

### Your Options
A) Increase complexity threshold to 15 for this function (pragmatic)
B) Redesign the order processing flow (I'll update functional-design first)
C) Skip this gate for now and create a tech-debt item
D) Other guidance
```
