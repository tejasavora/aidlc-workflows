---
trigger: model_decision
description: "AI-DLC V2 quality-gates: e2e-test"
---


# E2E Test

Run full end-to-end tests against the application. This is a **pre-deploy** quality gate — it catches integration regressions before code reaches human review or deployment. Unlike `smoke-test` (which validates a deployed environment after the fact), E2E tests run in a controlled local/CI environment before deployment proceeds.

## Activation Condition

Only activates when `toolchain.yaml` → `quality.testing.e2e_dir` is populated. If this key is absent or empty, this skill is skipped silently.

## Inputs

- `aidlc-docs/<intent>/toolchain.yaml` → `quality.testing.e2e_dir` (test directory)
- `aidlc-docs/<intent>/toolchain.yaml` → `quality.testing.e2e_framework` (playwright/cypress/selenium/other)
- `aidlc-docs/<intent>/toolchain.yaml` → `quality.testing.e2e_command` (override command, optional)
- `aidlc-docs/<intent>/inception/stories.md` — critical user journeys (used to prioritize diagnosis)
- Prior gate reports: `build-and-test-report.md`, `coverage-report.md` (understand what unit-level tests already cover)

## Execution

### Step 1: Determine Framework and Command

Read `toolchain.yaml` → `quality.testing`:

```
e2e_dir: tests/e2e
e2e_framework: playwright          # playwright | cypress | selenium | custom
e2e_command: npx playwright test   # optional override
```

If `e2e_command` is set → use it directly. Otherwise derive from framework:

| Framework | Default Command |
|-----------|----------------|
| playwright | `npx playwright test` |
| cypress | `npx cypress run --headless` |
| selenium | `pytest tests/e2e/` or `mvn test -Psuite=e2e` |
| custom | Read `e2e_command` (required if framework is custom) |

If framework is unfamiliar → invoke `knowledge-acquisition` meta-skill to research the correct run command.

### Step 2: Run E2E Suite

Execute the E2E command. Capture:
- Total tests: pass count, fail count, skip count
- Per-test: name, status, duration, failure message (if any), screenshot/trace path (if available)
- Overall suite duration

Do NOT treat skipped tests as failures — they may be environment-gated.

### Step 3: Diagnose Failures

For each failing test, classify the root cause:

| Failure Type | Indicators | Action |
|---|---|---|
| **Flaky** | Test passes on immediate re-run; timing/animation-dependent assertions | Fix: add explicit waits, retry assertions, stabilize test |
| **Environment** | Port not open, service not started, missing seed data, wrong base URL | Fix: start services, seed data, correct config |
| **Real regression** | Consistent failure; assertion checks a real behavior that has changed | Escalate: present to human — this is a code defect |
| **Test bug** | Assertion is wrong relative to current design | Fix: update test to match functional-design (verify against design docs first) |

To classify:
1. Re-run the failing test in isolation (`--grep <test-name>` or equivalent)
2. Check if application is running and reachable
3. Check if required seed data exists
4. Compare assertion against `functional-design/` documents — is the assertion correct?
5. Check git blame on the test — has it passed recently? If yes and now fails → regression

### Step 4: Fix Flaky and Environment Issues

For **flaky** tests:
- Add explicit wait conditions (avoid `sleep`) using framework-native patterns:
  - Playwright: `await page.waitForSelector(...)`, `expect(locator).toBeVisible()`
  - Cypress: `cy.get(...).should(...)` retry-ability, increase timeout
  - Selenium: `WebDriverWait` with `expected_conditions`
- Re-run after fix to confirm stability

For **environment** issues:
- Start required services per `toolchain.yaml` → `ci_cd.local_env`
- Seed required data
- Re-run affected tests

### Step 5: Re-run and Confirm

After fixes:
1. Re-run full E2E suite (not just previously-failing tests — fixes must not introduce regressions)
2. Capture updated results
3. If all pass → proceed
4. If real regressions remain after 2 attempts → escalate

## Outputs

- `aidlc-docs/<intent>/quality/e2e-test-report.md`
  - Suite summary (pass/fail/skip counts, duration)
  - Per-test results table
  - Failure classifications and fixes applied
  - Screenshots/traces referenced by path (if generated)

## Human Review Gate

`artefact-verification: "true"` — E2E test results are presented to the human before the code-review skill proceeds. The human sees the full report including any failures classified as real regressions that could not be auto-fixed.

If real regressions exist: present them clearly as blocking issues. The human decides whether to proceed (acknowledge tech debt) or block code-review until the regression is fixed.

## Escalation

After max attempts:
- Present: which tests still fail, failure classification per test, what was tried
- Present: recommended fix for each regression (even if not applied)
- Human decides: fix before code-review, or proceed with acknowledged regressions in tech-debt backlog
