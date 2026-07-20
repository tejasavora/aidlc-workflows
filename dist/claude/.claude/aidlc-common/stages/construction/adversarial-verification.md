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

### Step 10: Update State

Mark adversarial-verification as `[x]` completed.

### Step 11: Present Completion & Request Approval

Completion emoji: :crossed_swords:
Standard 2-option approval.
