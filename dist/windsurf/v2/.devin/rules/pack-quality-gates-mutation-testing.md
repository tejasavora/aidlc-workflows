---
trigger: model_decision
description: "AI-DLC V2 quality-gates: mutation-testing"
---


# Mutation Testing

Validate the quality of the test suite by verifying that tests can detect real code changes. Coverage tells you which lines are exercised — mutation testing tells you whether the tests would actually catch a bug.

## Activation Condition

Activates when `toolchain.yaml` → `quality.testing.mutation` section is configured. This skill is optional — it is not run by default. Teams opt in by adding the configuration.

```yaml
quality:
  testing:
    mutation:
      tool: mutmut           # mutmut | stryker | pit | custom
      threshold: 80          # minimum mutation score (%) to pass
      scope: src/services/   # optional: limit to a subdirectory
```

If this section is absent, the skill is silently skipped.

## Inputs

- `aidlc-docs/<intent>/toolchain.yaml` → `quality.testing.mutation`
- Source code under `scope` (or full project if scope not set)
- Test suite (already passing — do not run mutation testing against a failing test suite)
- Prior `build-and-test-report.md` — confirms tests are passing before mutation run

## Execution

### Step 1: Verify Tests Are Passing

Read `build-and-test-report.md` for the current unit. If tests are failing, do not run mutation testing — the results would be meaningless. Escalate if the prior gate was not clean.

### Step 2: Configure and Run Mutation Tool

**mutmut (Python):**
```bash
mutmut run --paths-to-mutate src/services/ --runner "pytest tests/" 2>&1 | tee mutmut-output.txt
mutmut results --json > mutmut-results.json
```

**Stryker (JavaScript/TypeScript):**
```json
// stryker.conf.json
{
  "mutate": ["src/services/**/*.ts"],
  "testRunner": "jest",
  "reporters": ["json", "clear-text"]
}
```
```bash
npx stryker run --reporter json > stryker-results.json
```

**PIT (Java):**
```bash
mvn org.pitest:pitest-maven:mutationCoverage -DtargetClasses="com.example.services.*" \
    -DoutputFormats=JSON > pit-results.json
```

**Custom:** read `mutation.command` from toolchain.yaml and execute it. Expect JSON output with `mutation_score`, `killed`, `survived`, and `timeout` counts.

If the tool is unfamiliar → invoke `knowledge-acquisition` meta-skill.

### Step 3: Parse Results and Calculate Score

Parse tool output to extract:
- `total_mutants`: all mutations introduced
- `killed`: caught by at least one test
- `survived`: NOT caught by any test (these are weaknesses)
- `timeout`: mutation caused test timeout (treated as killed)
- `no_coverage`: mutant was in a line not covered by any test (treated as survived)

```
mutation_score = (killed + timeout) / (total_mutants - compile_errors) × 100
```

### Step 4: Evaluate Against Threshold

If `mutation_score >= threshold` → PASS. Generate report and present to human.

If `mutation_score < threshold` → proceed to self-healing (Step 5).

### Step 5: Self-Healing — Generate Tests for Survived Mutants (Attempt 1)

For each survived mutant, generate a targeted test that would kill it:

1. Show the surviving mutant:
   ```
   Mutant: src/services/order.py:45 — changed `>` to `>=`
   Original: if quantity > 0:
   Mutant:   if quantity >= 0:
   Survived: no test checks the behaviour when quantity is exactly 0
   ```

2. Generate the missing test:
   ```python
   def test_order_rejects_zero_quantity():
       """Kill mutant: quantity >= 0 should not allow zero-quantity orders."""
       with pytest.raises(ValidationError):
           OrderService().create_order(product_id="P1", quantity=0)
   ```

3. Add the generated test to the test file alongside existing tests.

4. Re-run mutation testing (Attempt 2) to confirm the new tests kill the targeted mutants and the score meets the threshold.

### Step 6: Produce Mutation Testing Report

```markdown
## Mutation Testing Report

**Unit:** order-service
**Tool:** mutmut 2.4.x
**Scope:** src/services/order.py
**Threshold:** 80%

### Result: PASS (Attempt 2)

| Metric | Count |
|---|---|
| Total mutants | 47 |
| Killed | 41 |
| Survived | 4 |
| Timeout | 2 |
| Mutation score | **91.3%** |

### Survived Mutants (informational — above threshold, no action required)

| # | File | Line | Mutation | Why survived (analysis) |
|---|---|---|---|---|
| M-03 | order.py:89 | `!=` → `==` | Dead code path — only reachable via deprecated endpoint |
| M-11 | order.py:112 | removed `logger.info` | Logging-only mutation — acceptable to leave untested |

### Tests Generated (self-healing)

- `test_order_rejects_zero_quantity` — kills mutant at order.py:45
- `test_order_status_transition_invalid` — kills mutant at order.py:78
```

## Outputs

- `aidlc-docs/<intent>/quality/mutation-testing-report.md`
  - Mutation score, threshold, pass/fail
  - Survived mutants with analysis (even after passing)
  - List of tests generated during self-healing (if applicable)
- New test functions added to existing test files (self-healing only)

## Artefact Verification

`artefact-verification: "true"` — Mutation score and any generated tests are presented to the human before the construction gate closes. The human confirms:
- The mutation score meets the team's quality bar
- Any survived mutants above the threshold are understood (dead code, logging, etc.)
- Generated tests are correct and intentional
