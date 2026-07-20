---
slug: frontend-verification
phase: construction
execution: CONDITIONAL
condition: Execute when the unit produces user-facing UI (HTML templates, React components, or any rendered frontend). Skip for pure API/library/CLI units with no UI.
lead_agent: aidlc-quality-agent
support_agents:
  - aidlc-design-agent
  - aidlc-developer-agent
mode: inline
produces:
  - frontend-verification-report
  - template-contract-violations
  - frontend-verification-questions
consumes:
  - artifact: code-summary
    required: true
  - artifact: mockups
    required: false
  - artifact: interaction-spec
    required: false
  - artifact: build-test-results
    required: true
requires_stage:
  - code-generation
  - build-and-test
workspace_requires: true
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - workshop
inputs: Generated frontend code, mockups/interaction-spec from refined-mockups, build results
outputs: aidlc-docs/construction/frontend-verification/frontend-verification-report.md, aidlc-docs/construction/frontend-verification/template-contract-violations.md, aidlc-docs/construction/frontend-verification/frontend-verification-questions.md
---

# Frontend Verification

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage ensures generated UI is production-grade — not just "renders 200 OK" but fully functional, interactive, and state-complete. It catches the class of bugs where code-generation produces templates that reference non-existent endpoints, pass wrong context, or implement only the happy-path state.

## The Problem This Stage Solves

AI code generation consistently produces frontend that:
1. References template variables the route never passes (breaks on first render)
2. Contains htmx/fetch targets pointing to endpoints that don't exist (breaks after first poll)
3. Implements only happy-path state (empty/loading/error states missing)
4. Generates WebSocket markup without wiring the backend event source
5. Mixes server-render and client-fetch strategies incoherently

This stage catches ALL of these before the code leaves Construction.

## Steps

### Step 1: Load Agent Personas

Load aidlc-quality-agent persona from `agents/aidlc-quality-agent.md` and knowledge from `.claude/knowledge/aidlc-quality-agent/`.
Load aidlc-design-agent for UX completeness assessment.

### Step 2: Load Prior Context

- Read code summary from `aidlc-docs/construction/*/code-generation/`
- Read interaction spec from `aidlc-docs/inception/refined-mockups/` (if exists)
- Read screen-data-map from inception wireframes (if exists)
- Read the actual generated templates/components in the workspace

### Step 3: Template-Contract Verification

For every template/component file in the generated code:

**3a. Extract template variable references:**
- Jinja2: every `{{ var }}`, `{% for item in collection %}`, `{% if condition %}`
- React/Vue: every prop reference, state variable, API call
- htmx: every `hx-get`, `hx-post`, `hx-put`, `hx-delete` URL

**3b. Extract route/handler context:**
- What the route actually passes to the template (context dict, props, API response)
- What endpoints are registered in the router

**3c. Verify contract match:**
- Every template variable has a matching key in the route context → PASS
- Every htmx/fetch URL resolves to a registered route → PASS
- Every htmx partial endpoint returns HTML (not JSON) → PASS
- Every WebSocket URL has a registered handler that emits events → PASS

**3d. Log violations** to `template-contract-violations.md`

### Step 4: State Completeness Verification

For each page/component, verify all states are implemented:

| State | How to Verify |
|-------|--------------|
| **Happy path** | Render with realistic fixture data → no errors, content visible |
| **Empty state** | Render with empty collections → meaningful message + CTA, not blank table |
| **Loading state** | Initial async fetch shows skeleton/spinner, not flash of empty |
| **Error state** | API returns 500 → error message shown, not raw JSON/stack trace |
| **Partial failure** | One data source fails, others work → degraded but not broken |

### Step 5: Interaction Completeness Verification

For each interactive element in the UI:

| Element | Verification |
|---------|-------------|
| Buttons | onClick/hx-post target exists and returns expected response |
| Forms | Submit action hits real endpoint, validation shows errors |
| Links | href resolves to existing route (no dead links) |
| Search/filter | Input triggers query that returns filtered results |
| Sort | Column headers trigger re-sort (server or client-side) |
| Pagination | Next/prev load correct page of data |
| WebSocket | Connection established, events render as expected |
| Real-time updates | Polling/WS data replaces correct DOM element |

### Step 6: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE contract violations OR missing states exist AND attempt < max_attempts:
  1. CLASSIFY each issue:
     - missing-endpoint: route referenced in template doesn't exist → CREATE the route
     - wrong-context: route passes different keys than template expects → FIX context dict
     - missing-state: empty/error/loading state not implemented → ADD template branch
     - wrong-content-type: htmx partial returns JSON instead of HTML → FIX response
     - dead-websocket: WS handler exists but never emits → WIRE to event source
     - dead-interaction: button/form has no backend handler → CREATE handler
  2. APPLY fixes:
     - For missing-endpoint: generate the route handler returning correct content type
     - For wrong-context: update route to build context matching template contract
     - For missing-state: add {% else %} / empty-state component with meaningful UX
     - For wrong-content-type: change response to render HTML fragment template
     - For dead-websocket: wire event bus subscription in WS handler
     - For dead-interaction: create backend action handler + wire frontend
  3. RE-VERIFY affected pages
  4. attempt += 1

IF issues remain after max_attempts:
  ESCALATE with specific broken interactions and suggested fixes
```

### Step 7: Cross-Cutting UX Verification

Verify cross-cutting concerns that affect all pages:
- [ ] No raw JSON strings visible in rendered HTML
- [ ] No template syntax errors (Jinja2 UndefinedError, React key warnings)
- [ ] No console errors in browser (if testable)
- [ ] All CSS class references resolve to actual styles (framework classes valid)
- [ ] All JS function calls have corresponding definitions
- [ ] Responsive layout doesn't break at common breakpoints
- [ ] Dark/light mode toggle works if designed
- [ ] Navigation between pages works (all nav links resolve)

### Step 8: Generate Report

Create `frontend-verification-report.md`:
- Pages verified (count, list)
- Template contract: violations found → fixed → remaining
- State coverage: per-page matrix (happy/empty/loading/error)
- Interaction coverage: per-page interactive elements verified
- Cross-cutting checks: pass/fail summary
- Issues auto-fixed vs. escalated
- UX completeness score: percentage of designed interactions that actually work

Create `template-contract-violations.md`:
- Per-page list of every violation found and its resolution
- This file serves as a regression reference for future changes

### Step 9: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :art:
- Summary of frontend-verification-report, template-contract-violations
- Review path: `<record>/construction/frontend-verification/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .claude/tools/aidlc-orchestrate.ts report --stage frontend-verification --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

The `required-sections` sensor validates the verification report contains all mandatory sections. Future: a dedicated `frontend-render` sensor that fires on Write/Edit to template files and verifies they render without errors.

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
- Verification check → new manifest at `.claude/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
