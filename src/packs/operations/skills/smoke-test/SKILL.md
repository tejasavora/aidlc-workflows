---
name: aidlc-smoke-test
description: |
  Post-deploy validation of critical paths against the deployed environment.
  Self-healing: fail → diagnose → rollback if catastrophic → fix → redeploy → re-test.
  Runs after every deployment. Blocks promotion to next environment on failure.
metadata:
  phase: operations
  stage: smoke-test
  per-unit: "false"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: operations
  max-attempts: 3
---

# Smoke Test

Run a focused set of critical-path tests against the deployed environment to validate the deployment did not break core functionality. These are not exhaustive — they cover the highest-priority user journeys from requirements.

## Inputs

- `aidlc-docs/<intent>/inception/stories.md` — source for critical paths (top-priority stories)
- `aidlc-docs/<intent>/operations/deployment-design.md` — environment URLs and endpoints
- `aidlc-docs/<intent>/toolchain.yaml` → `deployment.environments[<env>].smoke_test` (if configured)
- Deployed environment base URL (passed by orchestrator)

## Execution

### Step 1: Derive Critical Paths

If smoke tests are not pre-configured, derive from requirements:
1. Read top-5 highest-priority stories (by priority label or order)
2. Identify the single most important API call or user action per story
3. These become the smoke test scenarios (max 10 per deployment)

Example for an e-commerce system:
- Health endpoint returns 200
- User can authenticate (POST /auth/login)
- Product list is reachable (GET /products)
- Order can be created (POST /orders)
- Order status is queryable (GET /orders/{id})

### Step 2: Execute Smoke Tests

Run each scenario against the deployed environment URL:
- Use `curl`, `httpie`, or the project's test framework (if configured with smoke test tag)
- Expected: HTTP 2xx for successful scenarios, correct response shape
- Timeout per test: 10s (configurable)
- Do NOT run tests that modify production data unless explicitly isolated

Capture per test: status, response time, response body (summary), pass/fail.

### Step 3: Diagnose Failures

For each failing test:
1. Check deployment logs for errors at the time of the request
2. Check if the failure is environment-specific (config, connectivity, data state)
3. Classify:
   - **Deployment regression**: was passing before this deploy → trigger rollback
   - **Environment config**: wrong env var, missing secret, wrong URL → fix config → redeploy
   - **Data state**: test assumes seeded data that doesn't exist → run data seeding
   - **Known flaky**: test is unreliable → document, re-run once

### Step 4: Rollback Trigger

If any critical-path test fails due to a deployment regression:
1. Immediately trigger rollback per `rollback-runbook.md`
2. Verify rollback restored passing state
3. Present failure to human with: which test failed, what the regression was, deployment diff

Do NOT wait for max-attempts before rollback on regression failures. Rollback first, diagnose after.

### Step 5: Fix and Re-test

For non-regression failures (config, data state):
1. Apply fix
2. Re-deploy (invoke `deploy` skill)
3. Re-run smoke tests
4. Repeat up to max-attempts

## Outputs

- `aidlc-docs/<intent>/operations/<env>/smoke-test-report.md`
  - Per-test results, response times, any failures and their diagnoses
- Rollback report (if rollback was triggered)

## Artefact Verification

`artefact-verification: "true"` — Smoke test results are presented to human before promotion to next environment. For non-production this can be automated per `auto_promote: true`. For production it is always shown.
