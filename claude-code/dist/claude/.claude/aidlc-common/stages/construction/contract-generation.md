---
slug: contract-generation
phase: construction
execution: ALWAYS
condition: Always executes BEFORE code-generation. Produces the executable tests that define "done" for each increment. Code-generation then targets these contracts instead of generating speculatively.
lead_agent: aidlc-quality-agent
support_agents:
  - aidlc-developer-agent
  - aidlc-architect-agent
mode: inline
for_each: unit-of-work
produces:
  - acceptance-tests
  - api-contract-tests
  - integration-fixtures
  - done-definition
  - contract-generation-questions
consumes:
  - artifact: business-logic-model
    required: true
  - artifact: business-rules
    required: true
  - artifact: requirements
    required: true
  - artifact: stories
    required: false
  - artifact: unit-of-work
    required: true
requires_stage:
  - functional-design
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - poc
  - bugfix
  - refactor
  - security-patch
  - workshop
inputs: Functional design (API specs, business rules, entities), user stories, unit definition
outputs: aidlc-docs/construction/{unit-name}/contract-generation/acceptance-tests.md, aidlc-docs/construction/{unit-name}/contract-generation/api-contract-tests.md, aidlc-docs/construction/{unit-name}/contract-generation/integration-fixtures.md, aidlc-docs/construction/{unit-name}/contract-generation/done-definition.md
---

# Contract Generation

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage is the KEY DIFFERENTIATOR of V3 execution: define the verification BEFORE generating code. The contracts produced here become the truth against which all generated code is verified. Code-generation's job becomes "make these tests pass" rather than "write code that looks correct."

## Why Contracts Before Code

Industry data shows:
- 43% of AI-generated code requires production debugging (Lightrun 2025)
- AI-generated PRs contain 1.7x more issues than human PRs (CodeRabbit 2025)
- 67% of developers spend more time debugging AI code than they saved (Harness 2025)

Root cause: AI generates speculatively — it produces plausible-looking code without a verifiable target. Contract-first inverts this: the TARGET is defined first (tests), then generation is constrained to satisfying that target.

## Steps

### Step 1: Load Agent Personas

Load aidlc-quality-agent persona from `agents/aidlc-quality-agent.md` and knowledge from `.claude/knowledge/aidlc-quality-agent/`.

### Step 2: Load Design Artifacts

- Read functional design from `aidlc-docs/construction/{unit-name}/functional-design/`
- Read user stories from `aidlc-docs/inception/user-stories/`
- Read API specifications (if produced during functional-design)
- Read data models/entities

### Step 3: Generate Acceptance Tests

From user stories, produce high-level acceptance tests in executable format:

```
For each user story:
  Given [precondition from story]
  When [action from story]
  Then [expected outcome with SPECIFIC values, not vague assertions]
```

Rules:
- Each test MUST be executable (not prose descriptions)
- Each test MUST have specific expected values (not "should work")
- Each test MUST be independent (no test depends on another running first)
- Cover: happy path + at least 2 error paths per story
- Use the project's test framework (detect from existing code or ask)

### Step 4: Generate API Contract Tests

From functional design and API specifications, produce per-endpoint tests:

```yaml
For each API endpoint:
  - Request: exact method, URL, headers, body (with realistic test data)
  - Expected response: exact status code, response body shape, specific field values
  - Error cases: missing fields (400), unauthorized (401), not found (404), conflict (409)
  - Edge cases: empty collections, maximum payload, special characters
```

Rules:
- Use REALISTIC test data (not "test123" or "foo bar" — use domain-appropriate data)
- Test the SHAPE of the response (every field that the frontend/consumer will use)
- Include authentication in tests (valid token, expired token, no token)
- For mutations: verify side effects (DB state changed, event emitted)

### Step 5: Generate Integration Fixtures

For dependencies that the unit needs but that may not exist during test:
- Database: fixture data that satisfies foreign key constraints
- External APIs: recorded responses (contract-level mocks, not implementation mocks)
- Event bus: expected event schemas for publish/subscribe verification
- File system: test files with known content

Rules:
- Mock at the BOUNDARY (HTTP client, DB connection) not internally
- Fixtures represent the CONTRACT of the dependency, not its implementation
- Every fixture has a comment explaining what real data it represents

### Step 6: Define "Done"

Create `done-definition.md` — the checklist that must ALL pass for this unit to be complete:

```yaml
unit: {unit-name}
done_when:
  contracts:
    - all acceptance tests pass
    - all API contract tests pass
    - all integration tests pass with fixtures
  deployment:
    - application starts without errors
    - health check returns 200
    - all endpoints reachable from outside the container
  runtime:
    - each endpoint returns correct response shape with real data
    - error responses are helpful (not stack traces)
    - empty states render correctly (not broken UI)
  quality:
    - zero critical/high security findings
    - coverage >= 80% line (from contracts alone, before any additional tests)
```

### Step 7: Validate Contracts Are Testable

Before approving, verify:
- [ ] Every test can actually be run (dependencies are available or mocked)
- [ ] No test requires manual steps (fully automated)
- [ ] Tests are deterministic (same input → same result, no time/random dependencies)
- [ ] Tests run in < 60 seconds total (fast feedback)
- [ ] Tests don't depend on execution order

### Step 8: Update State

Mark contract-generation as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 9: Present Completion & Request Approval

Completion emoji: :dart:
Review path: `aidlc-docs/construction/{unit-name}/contract-generation/`
Standard 2-option approval (Approve / Request Changes).

**Human value at this gate:** The contracts define what "done" means. Reviewing contracts is FAR easier than reviewing code — they're just expected behaviors stated as specific test cases. If the contracts are wrong, everything built against them will be wrong. This is the most important approval gate in the workflow.

## Sensors

The `required-sections` sensor validates that all contract artifacts contain the mandatory sections. Future: a `contract-completeness` sensor that verifies every requirement has at least one contract test.

## Relationship to Code Generation

After this stage completes, code-generation receives the contracts as input alongside the design artifacts. Code-generation's Step 2 (planning) MUST reference the contracts. Code-generation's verification becomes: "do the contracts pass?" not "does the code look correct?"

The self-healing loop in subsequent stages changes from "fix what looks wrong" to "regenerate until contracts pass." Contracts are the TRUTH. If code doesn't satisfy the contract, the code is wrong (not the contract — contracts are immutable during Phase 3).
