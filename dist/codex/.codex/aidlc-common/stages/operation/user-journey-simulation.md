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

### Step 10: Update State

Mark user-journey-simulation as `[x]` completed.

### Step 11: Present Completion & Request Approval

Completion emoji: :walking:
Standard 2-option approval.
