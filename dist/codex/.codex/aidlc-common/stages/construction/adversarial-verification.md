---
slug: adversarial-verification
phase: construction
execution: CONDITIONAL
condition: Execute for enterprise and feature scopes after production-readiness-review. A SEPARATE perspective that tries to BREAK the system rather than verify it passes predefined tests.
lead_agent: aidlc-quality-agent
support_agents:
  - aidlc-devsecops-agent
  - aidlc-developer-agent
mode: inline
produces:
  - adversarial-report
  - exploit-attempts
  - adversarial-questions
consumes:
  - artifact: code-summary
    required: true
  - artifact: readiness-report
    required: true
  - artifact: codebase-snapshot
    required: false
requires_stage:
  - production-readiness-review
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
inputs: Generated code, production readiness report, codebase snapshot
outputs: aidlc-docs/construction/adversarial-verification/adversarial-report.md, aidlc-docs/construction/adversarial-verification/exploit-attempts.md
---

# Adversarial Verification

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage takes the OPPOSITE perspective from all other verification stages. Instead of asking "does it work?" it asks "can I BREAK it?" A separate agent (not the one that built it) actively tries to cause failures through unexpected inputs, race conditions, resource exhaustion, and abuse scenarios.

## Why This Stage Exists

All prior stages verify the system works FOR expected inputs. But production systems fail due to UNEXPECTED inputs:
- What happens if someone sends 10MB in a request body?
- What happens if 1000 concurrent requests hit the same endpoint?
- What happens if the database is 1ms from timeout on every query?
- What happens if a user submits a form with JavaScript in every field?
- What happens if the auth token is from a different environment?
- What happens if two users modify the same resource simultaneously?

Metrics can be gamed. Tests verify what you thought to test. Adversarial verification finds what you DIDN'T think of.

## Steps

### Step 1: Load Agent Personas

Load aidlc-quality-agent in ADVERSARIAL mode — the goal is to BREAK the system, not verify it works.

### Step 2: Attack Surface Mapping

From codebase-snapshot and code-summary, identify:
- Every input point (API params, headers, body, query strings, file uploads)
- Every state transition (create → update → delete sequences)
- Every boundary (auth → no-auth transition, admin → user, cross-tenant)
- Every async operation (race condition potential)
- Every resource (that can be exhausted — connections, memory, disk, queue depth)
- Every external dependency (that can be slow, unavailable, or return unexpected data)

### Step 3: Fuzz Testing

For each input point:
- Send oversized payloads (1 byte, 1KB, 1MB, 10MB, 100MB)
- Send wrong types (string where int expected, array where object expected)
- Send unicode edge cases (null bytes, RTL characters, emoji, zalgo text)
- Send common injection patterns (SQL, XSS, SSTI, command injection, path traversal)
- Send boundary values (0, -1, MAX_INT, empty string, null)
- Send deeply nested objects (100 levels deep — stack overflow risk)

Expected: system returns 400 with helpful error for invalid input, never 500 or crash.

### Step 4: Race Condition Testing

For each state-mutating endpoint:
- Send N identical requests simultaneously (N=10, 50, 100)
- Expected: exactly one succeeds (idempotency) OR all succeed without data corruption
- Check: no double-creation, no negative inventory, no orphaned records
- Check: optimistic locking returns 409 (not silent last-write-wins)

For each multi-step operation:
- Start step 1, then start step 1 again before step 2 completes
- Expected: one operation completes, other gets conflict or queued

### Step 5: Resource Exhaustion

- Open connections without closing (connection leak simulation)
- Send requests faster than rate limit allows (does rate limiting actually work?)
- Fill disk with log output (can the system handle log rotation failure?)
- Exhaust memory with large payload accumulation (streaming vs buffering check)
- Starve CPU with computationally expensive requests (regex DoS, deep JSON parsing)

Expected: system degrades gracefully (shed load, return 503) rather than crash.

### Step 6: Dependency Failure Simulation

- What happens if database returns error for every query?
- What happens if external API takes 30s to respond (timeout handling)?
- What happens if cache is unavailable (bypass to DB, not crash)?
- What happens if message queue is full (backpressure, not data loss)?
- What happens if DNS resolution fails (retry vs immediate failure)?

Expected: circuit breakers open, fallbacks activate, system continues serving (degraded).

### Step 7: Auth Boundary Testing

- Use expired tokens (should reject, not serve stale session)
- Use tokens from different environment (should reject)
- Access resources belonging to other users/tenants (should 403, not serve data)
- Escalate privileges (user token accessing admin endpoints)
- Replay old tokens after password change (should be invalidated)

### Step 8: Self-Healing on Discoveries

```
FOR each vulnerability/crash discovered:
  1. CLASSIFY severity: critical (crash/data leak) vs high (DoS) vs medium (error leak)
  2. For critical/high: FIX immediately
     - Add input validation at boundary
     - Add rate limiting
     - Add proper error handling (not stack trace)
     - Add optimistic locking for race conditions
  3. RE-TEST the specific attack vector
  4. IF still exploitable after 3 fix attempts → ESCALATE
```

### Step 9: Generate Report

Create `adversarial-report.md`:
- Attack vectors tested (count per category)
- Vulnerabilities found (by severity)
- Crashes triggered (with reproduction steps)
- Data leaks discovered (what leaked, to whom)
- Race conditions confirmed (with timeline)
- Resource exhaustion points (what resource, what threshold)
- Fixes applied vs escalated

Create `exploit-attempts.md`:
- Per-endpoint: what was tried, what broke, what held
- Reproduction steps for each finding
- Recommended hardening actions

### Step 10: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :crossed_swords:
- Summary of adversarial-report, exploit-attempts
- Review path: `<record>/construction/adversarial-verification/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .codex/tools/aidlc-orchestrate.ts report --stage adversarial-verification --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/construction/adversarial-verification/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/adversarial-verification/required-sections-<iso>.md`.

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
