---
slug: production-readiness-review
phase: construction
execution: ALWAYS
condition: Always executes as the final construction gate — comprehensive review that validates the unit is shippable, not just compilable.
lead_agent: aidlc-architect-agent
support_agents:
  - aidlc-quality-agent
  - aidlc-devsecops-agent
  - aidlc-developer-agent
mode: inline
produces:
  - readiness-report
  - readiness-checklist
  - readiness-metrics
  - production-readiness-questions
consumes:
  - artifact: code-summary
    required: true
  - artifact: build-test-results
    required: true
  - artifact: static-analysis-report
    required: false
  - artifact: security-scan-report
    required: false
  - artifact: integration-verification-report
    required: false
  - artifact: frontend-verification-report
    required: false
  - artifact: coverage-report
    required: false
requires_stage:
  - code-generation
  - build-and-test
sensors:
  - required-sections
  - upstream-coverage
  - linter
  - type-check
scopes:
  - enterprise
  - feature
  - mvp
  - poc
  - bugfix
  - refactor
  - security-patch
  - workshop
inputs: All construction artifacts for the unit, generated code, prior gate results
outputs: aidlc-docs/construction/production-readiness-review/readiness-report.md, aidlc-docs/construction/production-readiness-review/readiness-checklist.md, aidlc-docs/construction/production-readiness-review/readiness-metrics.md, aidlc-docs/construction/production-readiness-review/production-readiness-questions.md
---

# Production Readiness Review

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This is the FINAL construction gate — the "is this actually shippable?" check that catches everything prior gates missed individually. It acts as the senior engineer who reviews the complete PR holistically, not just lint/test/security in isolation.

## Why This Stage Exists

Individual quality gates catch individual problems. But production-readiness requires holistic judgment:
- Static analysis passes, but the architecture is wrong for the load pattern
- Tests pass, but they test mocks — the real integration is untested
- Security scan is clean, but the auth flow has a logic gap
- Coverage is 90%, but the 10% uncovered is the critical error path
- All gates pass per-unit, but cross-unit contracts don't align
- Code compiles, but configuration for the target environment is missing

A human doing a real PR review catches these through experience and context. This stage encodes that review systematically.

## Steps

### Step 1: Load Agent Personas

Load aidlc-architect-agent persona from `agents/aidlc-architect-agent.md` and knowledge from `.claude/knowledge/aidlc-architect-agent/`.
Load supporting agents for security, quality, and implementation perspectives.

### Step 2: Load All Prior Gate Results

Read all available construction artifacts:
- Code generation summary and generated code
- Build and test results
- Static analysis report
- Security scan report
- Coverage report
- Integration verification report
- Frontend verification report
- Data migration plan (if exists)
- Backward compatibility report (if exists)

### Step 3: Language-Specific Review

Based on the detected language/framework, apply domain-specific review criteria:

**Python:**
- Type hints on all public functions (mypy strict compatibility)
- No mutable default arguments
- Context managers for resources (files, connections, locks)
- Async/await consistency (no mixing sync calls in async paths)
- No circular imports
- Proper exception hierarchy (not bare `except:`)

**TypeScript/JavaScript:**
- Strict null checks pass
- No `any` types in public interfaces
- Promise chains properly awaited (no floating promises)
- React: no memory leaks in useEffect cleanup
- Proper error boundaries around async components
- Bundle size impact assessed

**Java/Kotlin:**
- No resource leaks (streams, connections, locks closed in finally/try-with-resources)
- Thread safety annotations where shared state exists
- No checked exception swallowing
- Proper equals/hashCode contracts
- JPA: N+1 query patterns detected

**Go:**
- Error returns checked (not `_` discarded)
- Context propagation for cancellation
- No goroutine leaks (every goroutine has a termination path)
- Proper mutex usage (no lock held across I/O)

**Infrastructure (CDK/Terraform/CloudFormation):**
- No hardcoded account IDs or regions
- Proper tagging on all resources
- Encryption at rest enabled
- Deletion protection on stateful resources
- Least privilege IAM policies

### Step 4: Cross-Unit Contract Review

If multiple units exist:
- Verify API contracts match between producer and consumer units
- Verify event schemas match between publisher and subscriber
- Verify shared data model consistency across units
- Verify no circular dependencies between units
- Verify deployment order is safe (producer before consumer)

### Step 5: Configuration Completeness

Verify the system can actually start in a real environment:
- All referenced environment variables have defaults or are documented
- All connection strings/URLs have configuration points (not hardcoded)
- All secrets reference a secret store (not inline values)
- Health check endpoints exist and return meaningful status
- Graceful shutdown handlers exist for SIGTERM/SIGINT
- Liveness/readiness probes are distinguishable (ready = can serve, live = not stuck)

### Step 5b: Container Orchestration Readiness (if containerized)

- Liveness probe: simple (TCP/HTTP to /health), does NOT check dependencies
- Readiness probe: checks dependencies (DB reachable, cache connected)
- Startup probe: generous timeout for slow-starting apps (prevents restart loops)
- Resource requests set (guaranteed CPU/memory for scheduling)
- Resource limits set (prevent noisy-neighbor, OOMKill threshold)
- Pod disruption budget defined (minAvailable during rolling updates)
- Pre-stop hook: sleep 5s + drain in-flight requests before SIGTERM
- Graceful shutdown: stop accepting new requests → finish in-flight → close connections → exit

### Step 6: Error Path Review

Verify error handling is production-grade, not just present:
- External API calls: retry with backoff, circuit breaker, timeout, fallback
- Database operations: connection pool exhaustion handling, transaction timeout
- File I/O: permission errors, disk full, concurrent access
- Network: DNS resolution failure, TLS cert issues, connection refused
- User input: validation returns helpful messages, not stack traces
- Partial failure: system degrades gracefully (serves cached, disables feature) not catastrophically

### Step 7: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE critical readiness issues exist AND attempt < max_attempts:
  1. CLASSIFY each issue:
     - code-fix: missing error handling, resource leak, type issue → FIX directly
     - config-fix: missing env var, hardcoded value, no health check → ADD config
     - design-fix: architectural mismatch, wrong pattern for scale → READ design, propose change
     - documentation: missing API docs, undocumented env vars → ADD documentation
     - test-gap: critical path untested → ADD test
  2. APPLY fixes
  3. RE-REVIEW affected areas
  4. attempt += 1

IF issues remain after max_attempts:
  ESCALATE with prioritized list: blockers vs. risks vs. improvements
```

### Step 8: Generate Readiness Metrics

Create `readiness-metrics.md` — quantitative assessment:

```markdown
## Readiness Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Test coverage (line) | 87% | >= 80% | PASS |
| Test coverage (branch) | 72% | >= 70% | PASS |
| Critical error paths tested | 8/10 | 100% | WARN |
| API endpoints with error handling | 12/12 | 100% | PASS |
| Environment variables documented | 15/15 | 100% | PASS |
| Secrets externalized | 3/3 | 100% | PASS |
| Cross-unit contracts verified | 4/4 | 100% | PASS |
| Health check endpoints | 2/2 | >= 1 | PASS |
| Graceful shutdown | yes | required | PASS |
| Resource cleanup verified | yes | required | PASS |
| Security scan critical findings | 0 | 0 | PASS |
| Static analysis errors | 0 | 0 | PASS |
| **Overall Readiness** | **92%** | **>= 85%** | **PASS** |
```

These metrics are collected for longitudinal tracking — comparing readiness scores across workflow runs reveals whether methodology changes improve output quality.

### Step 9: Generate Readiness Checklist

Create `readiness-checklist.md` — the checklist a human would run:

```markdown
## Production Readiness Checklist

### Code Quality
- [x] All tests pass
- [x] No lint errors
- [x] No type errors
- [x] Coverage thresholds met
- [x] No security vulnerabilities (critical/high)

### Operational Readiness
- [x] Health check endpoint exists
- [x] Graceful shutdown implemented
- [x] Environment variables documented
- [x] Secrets in secret store (not code)
- [ ] Logging structured (JSON with correlation IDs)

### Error Handling
- [x] External calls have timeouts
- [x] Retries with exponential backoff
- [x] Circuit breakers on critical dependencies
- [x] No silent exception swallowing
- [ ] Fallback behavior for degraded mode

### Deployment
- [x] Database migrations are reversible
- [x] No breaking API changes (or versioned)
- [x] Feature flags for risky changes
- [x] Rollback procedure documented
```

### Step 10: Generate Readiness Report

Create `readiness-report.md`:
- Executive summary: READY / READY WITH RISKS / NOT READY
- Language-specific findings (grouped by severity)
- Cross-unit contract status
- Configuration completeness
- Error path coverage assessment
- Metrics summary
- Risks accepted (items that are known gaps with mitigation)
- Comparison to prior runs (if metrics from previous workflows available)

### Step 11: Update State

Mark production-readiness-review as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 12: Present Completion & Request Approval

Completion emoji: :white_check_mark:
Review path: `aidlc-docs/construction/production-readiness-review/`
Standard 2-option approval (Approve / Request Changes).

## Sensors

All four sensors fire on this stage — it is the integration point that verifies the cumulative output of all prior construction stages.
