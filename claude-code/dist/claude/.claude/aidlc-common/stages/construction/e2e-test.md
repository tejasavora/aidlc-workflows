---
slug: e2e-test
phase: construction
execution: CONDITIONAL
condition: Execute when user stories define end-to-end user journeys, or when scope is enterprise/feature/workshop. Skip for bugfix, refactor, poc.
lead_agent: aidlc-quality-agent
support_agents:
  - aidlc-developer-agent
mode: inline
produces:
  - e2e-test-plan
  - e2e-test-results
  - e2e-test-questions
consumes:
  - artifact: build-test-results
    required: true
  - artifact: code-summary
    required: true
  - artifact: stories
    required: false
requires_stage:
  - build-and-test
workspace_requires: true
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - workshop
inputs: Built application from build-and-test, user stories for journey definition
outputs: aidlc-docs/construction/e2e-test/e2e-test-plan.md, aidlc-docs/construction/e2e-test/e2e-test-results.md, aidlc-docs/construction/e2e-test/e2e-test-questions.md
---

# End-to-End Testing

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-quality-agent persona from `agents/aidlc-quality-agent.md` and knowledge from `.claude/knowledge/aidlc-quality-agent/`.

### Step 2: Load Prior Context

- Read user stories from `aidlc-docs/inception/user-stories/`
- Read code summary from `aidlc-docs/construction/*/code-generation/`
- Read build-and-test results from `aidlc-docs/construction/build-and-test/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What E2E test framework to use (Playwright, Cypress, Puppeteer, Selenium, httpx)?
- What are the critical user journeys (derive from stories if not specified)?
- What browser/environment targets are needed?
- What test data setup is required for E2E scenarios?

Follow stage-protocol.md question flow.

### Step 4: Design E2E Test Plan

Create `aidlc-docs/construction/e2e-test/e2e-test-plan.md`:
- Map user stories to E2E test scenarios (1 scenario per critical journey)
- Define test data prerequisites
- Define assertion points (page elements, API responses, state transitions)
- Define environment requirements (services that must be running)

### Step 5: Generate and Execute Tests

Write E2E test files and execute them:
1. Generate test code following the selected framework's patterns
2. Run tests against the built application
3. Collect results (pass/fail, screenshots on failure, timing)

### Step 6: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE E2E tests fail AND attempt < max_attempts:
  1. CLASSIFY failure:
     - test bug (wrong selector, timing issue, stale data) → fix test
     - application bug (feature not working as designed) → fix application code
     - environment issue (service not running, port conflict) → fix setup
  2. APPLY fix based on classification
  3. RE-RUN failed tests
  4. attempt += 1

IF tests still fail after max_attempts:
  ESCALATE: present failures with screenshots, expected vs actual, and
  diagnosis to user
```

### Step 7: Generate Results

Create `aidlc-docs/construction/e2e-test/e2e-test-results.md`:
- Test execution summary (pass/fail counts, duration)
- Coverage of user journeys (which stories are E2E-validated)
- Failures and their resolution (or escalation)
- Performance observations (page load times, API response times)

### Step 8: Update State

Mark e2e-test as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 9: Present Completion & Request Approval

Completion emoji: :globe_with_meridians:
Review path: `aidlc-docs/construction/e2e-test/`
Standard 2-option approval (Approve / Request Changes).
