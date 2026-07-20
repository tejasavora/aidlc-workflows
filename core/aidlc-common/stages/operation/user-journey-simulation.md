---
slug: user-journey-simulation
phase: operation
execution: CONDITIONAL
condition: Execute when the system has user-facing interfaces (web, mobile, API) and user stories define multi-step workflows. Simulates REAL user behavior including mistakes, back-navigation, and edge cases.
lead_agent: aidlc-quality-agent
support_agents:
  - aidlc-design-agent
mode: inline
produces:
  - journey-simulation-report
  - ux-issues-found
  - user-journey-questions
consumes:
  - artifact: stories
    required: true
  - artifact: runtime-validation-report
    required: true
  - artifact: sandbox-endpoint
    required: false
requires_stage:
  - runtime-validation
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - workshop
inputs: User stories, deployed sandbox, runtime validation results
outputs: aidlc-docs/operation/user-journey-simulation/journey-simulation-report.md, aidlc-docs/operation/user-journey-simulation/ux-issues-found.md
---

# User Journey Simulation

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage simulates how a REAL USER (not a test script) interacts with the system. Real users don't follow happy paths — they make mistakes, go back, open multiple tabs, take coffee breaks mid-form, paste wrong data, and do things in unexpected order.

## Why This Stage Exists

runtime-validation verifies: "endpoint works when called correctly."
This stage verifies: "a confused human can actually accomplish their goal."

The difference:
- runtime-validation: POST /api/signup with valid body → 201 ✓
- user-journey: user types email wrong → sees error → fixes it → submits → gets confirmation → checks email → clicks link → lands on dashboard → it actually shows their data ✓

## Steps

### Step 1: Load Agent Personas

Load aidlc-quality-agent with user-empathy perspective. Think like a non-technical first-time user, not a developer.

### Step 2: Identify Critical Journeys

From user stories, identify the top 5-10 multi-step journeys:
- Onboarding (first-time user to productive state)
- Core workflow (the main thing users do repeatedly)
- Error recovery (what happens when things go wrong)
- Administrative (settings, billing, team management)
- Edge transitions (free→paid, single→team, basic→advanced)

### Step 3: Simulate Each Journey (Happy + Unhappy)

For each journey, simulate as three personas:

**Persona A: Rushed User (skips everything, clicks fast)**
- Skips all optional fields
- Hits submit immediately
- Doesn't read error messages — just clicks again
- Expected: system handles gracefully, doesn't create corrupt data

**Persona B: Confused User (does things wrong, goes back)**
- Enters wrong data, sees error, goes back
- Uses browser back button mid-flow
- Opens same page in two tabs
- Refreshes the page during submission
- Expected: no duplicate submissions, no lost state, helpful guidance

**Persona C: Adversarial User (tests boundaries)**
- Pastes text from different language/encoding
- Uploads wrong file types
- Exceeds character limits in every field
- Tries to access other users' data via URL manipulation
- Expected: validation catches all, no data corruption, no unauthorized access

### Step 4: State Persistence Verification

- Start a multi-step form → close browser → reopen → is progress saved?
- Log out mid-task → log back in → does it resume?
- Session timeout during task → what happens to unsaved data?
- Switch devices mid-journey → does it sync?

### Step 5: Multi-Tab / Concurrent Session Testing

- Same form open in two tabs → submit both → what happens?
- Edit same resource in two sessions → last writer wins? conflict resolution?
- Log out in tab 1 → tab 2 still shows content? Or proper redirect?

### Step 6: Network Degradation Simulation

- Slow network (3G speeds) → does UI show loading states? Or time out?
- Connection lost mid-submit → does it retry? Show error? Lose data?
- Offline mode (if designed) → does it queue actions?

### Step 7: Assess "Can the User Actually Succeed?"

For each journey: could a real non-technical user complete this without developer help?

Score each journey:
- 5: Effortless — user completes without hesitation
- 4: Minor friction — one confusing moment but self-recoverable
- 3: Moderate friction — user would google or ask for help once
- 2: Major friction — user would likely abandon or file a support ticket
- 1: Broken — user cannot complete the journey at all

### Step 8: Generate Report

Create `journey-simulation-report.md`:
- Journey success scores (1-5 per journey per persona)
- Mean score across all journeys
- Screenshots/descriptions of failure points
- State persistence test results
- Multi-tab/concurrent issues found
- Network degradation behavior

Create `ux-issues-found.md`:
- Per-issue: what happened, expected behavior, actual behavior, severity
- Grouped: blocking (user cannot proceed) vs friction (annoying but passable)

### Step 9: Self-Healing

For blocking issues (score 1-2):
- Fix navigation issues (add back buttons, breadcrumbs, clear CTAs)
- Fix state loss (add form persistence, session recovery)
- Fix error messaging (replace technical errors with human guidance)
- Redeploy and re-simulate

### Step 10: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :walking:
- Summary of journey-simulation-report, ux-issues-found
- Review path: `<record>/operation/user-journey-simulation/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun {{HARNESS_DIR}}/tools/aidlc-orchestrate.ts report --stage user-journey-simulation --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/user-journey-simulation/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/user-journey-simulation/required-sections-<iso>.md`.

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
- Verification check → new manifest at `{{HARNESS_DIR}}/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
