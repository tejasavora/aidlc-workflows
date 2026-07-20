---
slug: runtime-validation
phase: operation
execution: ALWAYS
condition: Always executes after deployment — verifies the deployed system actually works by exercising every path, not just checking health endpoints.
lead_agent: aidlc-quality-agent
support_agents:
  - aidlc-developer-agent
  - aidlc-operations-agent
mode: inline
produces:
  - runtime-validation-report
  - runtime-metrics
  - runtime-validation-questions
consumes:
  - artifact: deployment-log
    required: true
  - artifact: code-summary
    required: true
  - artifact: integration-verification-report
    required: false
  - artifact: frontend-verification-report
    required: false
requires_stage:
  - deployment-execution
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - security-patch
  - workshop
inputs: Deployed application, deployment log, code summary (for API inventory), design artifacts (for expected behavior)
outputs: aidlc-docs/operation/runtime-validation/runtime-validation-report.md, aidlc-docs/operation/runtime-validation/runtime-metrics.md, aidlc-docs/operation/runtime-validation/runtime-validation-questions.md
---

# Runtime Validation

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage does what a human does after deploying: start the system, hit every endpoint, click every button, send bad data, verify error messages make sense, confirm logs appear, check that metrics increment. It is the empirical "does it actually work" verification that no amount of static analysis can replace.

## Why This Stage Exists

The gap between "tests pass locally" and "it works in production" is where most production incidents originate:
- Environment variables missing or wrong → 500 errors
- Database connection string incorrect → app starts but every query fails
- Service-to-service auth token not configured → inter-service calls 403
- DNS not resolving → external API integrations fail silently
- TLS cert mismatch → HTTPS calls fail in staging but worked on localhost
- Queue/topic not created → events published to void
- Permissions wrong → S3 writes fail, DynamoDB reads denied

Static verification (integration-verification in Construction) catches mock/stub issues. Runtime validation catches **environment and configuration issues** that only manifest when the real system runs against real infrastructure.

## Steps

### Step 1: Load Agent Personas

Load aidlc-quality-agent persona from `agents/aidlc-quality-agent.md` and knowledge from `.codex/knowledge/aidlc-quality-agent/`.

### Step 2: Verify System Startup

Before testing anything, confirm the system is actually running:
1. Hit health check endpoint → expect 200 with status: healthy
2. Check readiness probe → expect 200 (ready to serve traffic)
3. Check all service instances are registered (load balancer targets healthy)
4. Verify no crash loops (container restart count = 0)
5. Verify startup logs show no errors (grep for ERROR/FATAL in recent logs)

If startup fails → immediate escalation (can't validate what doesn't run).

### Step 3: API Endpoint Exercising

For every API endpoint in the system (derived from code-summary + route registration):

**3a. Happy path:**
- Send valid request with realistic data
- Verify response status code matches design (200, 201, etc.)
- Verify response body matches expected schema
- Verify response latency is reasonable (< 1s for simple queries)
- Verify data was actually persisted (for write operations: read it back)

**3b. Error paths:**
- Send request with missing required fields → expect 400 with helpful message
- Send request with invalid data types → expect 400 (not 500)
- Send request without auth token → expect 401
- Send request with insufficient permissions → expect 403
- Request non-existent resource → expect 404
- Send duplicate creation request → expect 409 or idempotent 200

**3c. Edge cases:**
- Send request with maximum-size payload → should succeed or return 413
- Send request with unicode/special characters → should not crash
- Send concurrent identical requests → should not create duplicates
- Hit rate limit (if configured) → expect 429 with retry-after header

### Step 4: Integration Flow Verification

Test complete user journeys that span multiple services/components:
1. Identify critical paths from user stories (e.g., "user signs up → creates project → invites team → deploys app")
2. Execute each path end-to-end against the deployed system
3. Verify each step produces the expected side effects:
   - Database records created/updated
   - Events published (check queue/topic)
   - Emails/notifications sent (check outbox or mock service)
   - External API calls made (check audit log)
4. Verify the final state is consistent across all data stores

### Step 5: Frontend Runtime Verification (if UI exists)

If the deployed system has a UI:
1. Load each page → verify no JavaScript errors in console
2. Verify real data appears (not "Loading..." stuck forever)
3. Verify forms submit and show success/error feedback
4. Verify navigation between pages works
5. Verify WebSocket/polling connections establish and receive updates
6. Verify empty states render when no data exists
7. Verify responsive layout at key breakpoints

### Step 6: Observability Verification

Verify the monitoring layer works by triggering observable events:
1. Make a successful API call → verify metrics increment (request count, latency histogram)
2. Trigger an error → verify error metric increments + alarm state changes
3. Check logs → verify structured format, correlation IDs present, no PII leaked
4. If tracing enabled → verify trace spans appear for the request chain
5. Check dashboards → verify they show non-zero data after test traffic

### Step 7: Resilience Verification (lightweight)

Without full chaos engineering, verify basic resilience:
1. If a cached value exists → invalidate it → verify system still works (cache miss path)
2. If circuit breaker configured → verify it's in closed state (healthy)
3. If retry logic exists → verify timeout value is reasonable (not 30s default)
4. Verify graceful degradation: if optional service is unavailable, core path still works

### Step 8: Generate Runtime Metrics

Create `runtime-metrics.md` — empirical measurements from the deployed system:

```markdown
## Runtime Validation Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| System startup time | 4.2s | < 30s | PASS |
| Health check response | 200 OK, 12ms | < 500ms | PASS |
| API endpoints tested | 14/14 | 100% | PASS |
| Happy path success rate | 14/14 | 100% | PASS |
| Error path correct responses | 38/42 | >= 90% | PASS |
| Integration flows passing | 3/3 | 100% | PASS |
| UI pages loading | 6/6 | 100% | PASS |
| Observability verified | yes | required | PASS |
| P50 latency | 45ms | < 200ms | PASS |
| P99 latency | 312ms | < 1000ms | PASS |
| Error rate (during test) | 0% | < 1% | PASS |
| **Runtime Score** | **95%** | **>= 90%** | **PASS** |
```

These metrics feed into DORA tracking and longitudinal efficacy measurement.

### Step 9: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE critical runtime failures exist AND attempt < max_attempts:
  1. CLASSIFY each failure:
     - config-issue: wrong env var, missing secret → FIX configuration
     - missing-resource: queue/topic/table not created → CREATE via IaC
     - code-bug: endpoint returns wrong response → FIX and redeploy
     - permission-issue: IAM policy too restrictive → UPDATE policy
     - connection-issue: wrong URL, cert mismatch → FIX connection config
  2. APPLY fixes (may require redeployment for code changes)
  3. RE-VALIDATE affected paths
  4. attempt += 1

IF failures remain after max_attempts:
  ESCALATE with:
  - Failing endpoints/flows with exact error responses
  - Environment state (logs, config, permissions)
  - Suggested manual investigation steps
```

### Step 10: Generate Report

Create `runtime-validation-report.md`:
- Deployment verified: version, environment, timestamp
- Startup validation: healthy / degraded / failed
- API testing summary: endpoints hit, pass/fail counts
- Integration flows: critical paths exercised and results
- Frontend status: pages verified, interactions tested
- Observability: metrics flowing, logs structured, traces visible
- Issues found and auto-fixed
- Issues escalated
- Overall verdict: PRODUCTION READY / NEEDS ATTENTION / BLOCKED
- Comparison to prior deployment validation (if historical metrics exist)

### Step 11: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :rocket:
- Summary of runtime-validation-report, runtime-metrics
- Review path: `<record>/operation/runtime-validation/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .codex/tools/aidlc-orchestrate.ts report --stage runtime-validation --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/runtime-validation/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/runtime-validation/required-sections-<iso>.md`.

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
