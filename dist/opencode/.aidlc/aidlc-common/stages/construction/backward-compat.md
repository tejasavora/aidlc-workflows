---
slug: backward-compat
phase: construction
execution: CONDITIONAL
condition: Execute when the project exposes APIs, SDKs, or shared schemas consumed by other services or clients. Skip for standalone applications with no external consumers.
lead_agent: aidlc-architect-agent
support_agents:
  - aidlc-developer-agent
mode: inline
produces:
  - backward-compat-report
  - backward-compat-questions
consumes:
  - artifact: code-summary
    required: true
  - artifact: business-logic-model
    required: false
requires_stage:
  - code-generation
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
inputs: Generated code from code-generation, existing API specifications (if brownfield)
outputs: aidlc-docs/construction/backward-compat/backward-compat-report.md, aidlc-docs/construction/backward-compat/backward-compat-questions.md
---

# Backward Compatibility Validation

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-architect-agent persona from `agents/aidlc-architect-agent.md` and knowledge from `.claude/knowledge/aidlc-architect-agent/`.

### Step 2: Load Prior Context

- Read API specifications from `aidlc-docs/construction/*/functional-design/`
- Read code summary from `aidlc-docs/construction/*/code-generation/`
- If brownfield: read existing API schemas, OpenAPI specs, protobuf definitions, database schemas

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What API versioning strategy is used (URL path, header, query param)?
- What external consumers exist (other services, mobile apps, third-party integrations)?
- What is the deprecation policy (sunset period, communication)?
- Are there schema registries or contract repositories?

Follow stage-protocol.md question flow.

### Step 4: Detect Breaking Changes

Compare current code against baseline (git diff, schema diff, OpenAPI diff):
- **API surface**: removed endpoints, changed request/response shapes, new required fields
- **Database schema**: column removals, type changes, constraint additions
- **Event schemas**: changed event payloads, removed event types
- **SDK/library**: removed public methods, changed signatures, type narrowing

### Step 5: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE breaking changes detected AND attempt < max_attempts:
  1. CLASSIFY each break:
     - auto-fixable: add default value for new required field, keep old
       endpoint as alias, add schema migration step
     - needs-design-review: fundamental shape change, removed capability
     - acceptable-break: documented in migration guide with sunset timeline
  2. AUTO-FIX auto-fixable breaks (backward-compatible wrappers, aliases,
     default values, dual-write patterns)
  3. For needs-design-review: propose alternatives that preserve compatibility
  4. RE-CHECK compatibility
  5. attempt += 1

IF breaking changes remain after max_attempts:
  ESCALATE: present breaking changes with consumer impact assessment,
  migration guide draft, and sunset timeline proposal to user
```

### Step 6: Generate Report

Create `aidlc-docs/construction/backward-compat/backward-compat-report.md`:
- Compatibility check methodology and tools used
- Breaking changes found and classification
- Auto-remediated changes (what compatibility shims were added)
- Remaining breaks with migration guide and sunset timeline
- Consumer impact matrix

### Step 7: Update State

Mark backward-compat as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :link:
Review path: `aidlc-docs/construction/backward-compat/`
Standard 2-option approval (Approve / Request Changes).
