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

Load aidlc-quality-agent persona from `agents/aidlc-quality-agent.md` and knowledge from `.codex/knowledge/aidlc-quality-agent/`.

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

### Step 8: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :globe_with_meridians:
- Summary of e2e-test-plan, e2e-test-results
- Review path: `<record>/construction/e2e-test/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .codex/tools/aidlc-orchestrate.ts report --stage e2e-test --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/construction/e2e-test/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/e2e-test/required-sections-<iso>.md`.

## Learn

While running this stage, maintain a running log in
`<record>/<phase>/<stage>/memory.md` (create on stage start if absent).
Append entries under four standard headings:

- **Interpretations** — choices made where the stage prose was ambiguous
- **Deviations** — places you intentionally departed from the stage prose, and why
- **Tradeoffs** — alternatives considered and why you picked what you did
- **Open questions** — anything to confirm before next run, or uncertain context

Format each entry with an ISO 8601 timestamp:
`- 2026-05-20T10:14:32Z — <summary>; <context>`

Before the approval gate, read memory.md and surface candidates as a
structured question. For each entry the user keeps, write to the appropriate
harness destination per `stage-protocol.md` §13 — never to this stage file:

- Prescriptive rule → a practice line under the routed heading in
  `aidlc/spaces/<active-space>/memory/project.md` (default) or `team.md` (promoted)
- Verification check → new manifest at `.codex/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
