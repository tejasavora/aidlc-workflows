---
slug: integration-verification
phase: construction
execution: ALWAYS
condition: Always executes after code generation — verifies that all APIs work end-to-end, all integrations are wired, all data flows are real (not mocked), and all contracts are honored.
lead_agent: aidlc-quality-agent
support_agents:
  - aidlc-developer-agent
  - aidlc-architect-agent
mode: inline
produces:
  - integration-verification-report
  - contract-violations
  - integration-verification-questions
consumes:
  - artifact: code-summary
    required: true
  - artifact: build-test-results
    required: true
  - artifact: business-logic-model
    required: false
consumes:
  - artifact: code-summary
    required: true
  - artifact: build-test-results
    required: true
requires_stage:
  - code-generation
  - build-and-test
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - poc
  - bugfix
  - workshop
inputs: Generated code from code-generation, design artifacts from functional-design, build results
outputs: aidlc-docs/construction/integration-verification/integration-verification-report.md, aidlc-docs/construction/integration-verification/contract-violations.md, aidlc-docs/construction/integration-verification/integration-verification-questions.md
---

# Integration Verification

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage ensures generated code is PRODUCTION-COMPLETE — not just compilable, not just "tests pass with mocks," but actually functional end-to-end. It catches the class of bugs where code-generation produces endpoints that return hardcoded data, services that call unimplemented methods, and integrations that are stubbed out.

## The Problem This Stage Solves

AI code generation consistently produces backend code that:
1. API endpoints return mock/hardcoded data instead of querying real data sources
2. Service methods are declared but contain `pass`, `TODO`, or `NotImplementedError`
3. Database queries are placeholder `SELECT 1` instead of real queries against the schema
4. Event handlers are registered but never fire (no publisher wired)
5. External service integrations use hardcoded responses instead of real HTTP calls
6. Configuration is referenced but never loaded from environment/files
7. Error paths are declared but throw generic exceptions without recovery logic
8. Inter-service contracts (gRPC, REST, events) don't match between producer and consumer

## Steps

### Step 1: Load Agent Personas

Load aidlc-quality-agent persona from `agents/aidlc-quality-agent.md` and knowledge from `.claude/knowledge/aidlc-quality-agent/`.

### Step 2: Load Prior Context

- Read code summary from `aidlc-docs/construction/*/code-generation/`
- Read functional design from `aidlc-docs/construction/*/functional-design/`
- Read the actual generated code in the workspace
- Read API contracts (if produced during design)

### Step 3: API Completeness Scan

For every API endpoint/route in the generated code:

**3a. Verify real implementation exists:**
- Route handler calls a real service method (not a stub)
- Service method contains real business logic (not `pass` or `TODO`)
- Database queries match the schema produced by data-migration
- Response shape matches what consumers expect (OpenAPI spec, TypeScript types)

**3b. Verify data flow is real:**
- GET endpoints query real data sources (DB, cache, external API)
- POST endpoints persist data to real storage
- Event-driven endpoints publish/subscribe to real event bus
- WebSocket endpoints wire to real event sources

**3c. Flag mock/placeholder patterns:**
- `return {"status": "ok"}` without actual logic
- `# TODO: implement`
- `raise NotImplementedError`
- Hardcoded arrays/dicts where DB queries should be
- `time.sleep()` simulating async work
- Commented-out real implementation with simplified stub active

### Step 4: Contract Verification

For every inter-component contract:

| Contract Type | Verification |
|--------------|-------------|
| REST API | Request/response shapes match between caller and handler |
| Database | Queries reference columns/tables that exist in migrations |
| Events | Published event schema matches subscriber's expected schema |
| gRPC/Proto | Client stub matches server implementation |
| Config | Referenced env vars have defaults or .env.example entries |
| File I/O | Referenced file paths exist or are created by the code |

### Step 5: Dependency Wiring Verification

Verify the dependency injection / wiring is complete:
- Every constructor parameter has a provider/factory that creates it
- Every service imported by a handler is actually instantiated in the app setup
- Database connections are created and passed to repositories
- Event bus is created and handlers are registered
- Cache clients are initialized with real connection config
- External HTTP clients have base URLs and auth configured

### Step 6: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE incomplete implementations OR broken contracts exist AND attempt < max_attempts:
  1. CLASSIFY each issue:
     - stub-implementation: method exists but returns mock data
       → IMPLEMENT real logic from functional-design spec
     - missing-wiring: component exists but isn't connected to the app
       → WIRE into dependency injection / app setup
     - schema-mismatch: caller sends X but handler expects Y
       → FIX to match the contract (prefer fixing caller to match design)
     - missing-query: endpoint should read DB but has hardcoded data
       → WRITE real query matching schema from data-migration
     - dead-event: publisher never fires or subscriber never handles
       → WIRE event bus connection between publisher and subscriber
     - missing-config: code references env var that's never set
       → ADD to .env.example with sensible default + document
  2. APPLY fixes
  3. RE-VERIFY affected components
  4. attempt += 1

IF issues remain after max_attempts:
  ESCALATE with specific incomplete implementations and what they need
```

### Step 7: Smoke-Run Verification

If the application can be started (has an entry point):
1. Start the application
2. Hit each API endpoint with a valid request
3. Verify non-trivial response (not empty, not mock, not error)
4. Verify database state changes for write operations
5. Verify event flow for event-driven operations

If the application cannot be started (missing infrastructure):
- Document what's needed (DB, external service, credentials)
- Verify as much as possible statically

### Step 8: Generate Report

Create `integration-verification-report.md`:
- Components verified (services, endpoints, event handlers, queries)
- Implementation completeness: real vs. stub (per component)
- Contract compliance: matched vs. mismatched
- Wiring status: connected vs. orphaned
- Smoke-run results (if executed): which endpoints work, which fail
- Issues auto-fixed vs. escalated
- Production-readiness score: percentage of components fully implemented

Create `contract-violations.md`:
- Per-contract list of violations found and resolution
- Serves as regression reference

### Step 9: Update State

Mark integration-verification as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 10: Present Completion & Request Approval

Completion emoji: :electric_plug:
Review path: `aidlc-docs/construction/integration-verification/`
Standard 2-option approval (Approve / Request Changes).

## Sensors

The `required-sections` sensor validates the verification report contains all mandatory sections.
