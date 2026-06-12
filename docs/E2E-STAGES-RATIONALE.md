# E2E SDLC Stages — Rationale & Vision

## The Problem

AI-DLC v2 is a rigorous methodology engine. It ensures you **follow a thorough process**. But process rigor alone doesn't guarantee the output is production-ready. The gap shows up consistently in customer workshops and dry-runs:

> "Yes, it works. The code compiles, tests pass, and the architecture looks right. But when I actually try to use it — endpoints return mock data, the UI doesn't actually refresh, WebSocket is dead, the dashboard shows nothing. I still spent 2 days wiring everything up."

The root cause: AI-DLC v2's verification model is **analytical** (read the code, check the schema, lint it) when it should be **empirical** (run it, call it, click it, break it, prove it works).

## The Vision: Autonomous Production-Grade Output

The end state is a system that runs fully autonomously in a cloud sandbox, where a human interacts only through an approval interface, and the output is a production-ready, deployed, verified system — not a "demo-ready prototype that needs 2 more weeks of work."

To get there, the methodology must:

1. **Verify its own output empirically** — not just "does it compile" but "does it actually work"
2. **Self-heal when verification fails** — don't just report problems, fix them
3. **Measure its efficacy quantitatively** — so we can prove the methodology works and track improvement over time
4. **Bridge every gap a human would fill** — configuration, secrets, DNS, cross-service wiring, UI interactivity

## What These Stages Add

### The Last-Mile Problem (Construction)

| Stage | What It Catches | Why Upstream Misses It |
|-------|----------------|----------------------|
| `static-analysis` | Lint/format/complexity with auto-fix | Upstream sensors detect but don't fix |
| `security-scan` | SAST + SCA + secrets with remediation | No dedicated stage, just agent knowledge |
| `coverage-enforcement` | Coverage gaps with test generation | build-and-test produces instructions, not enforcement |
| `integration-verification` | Mock implementations, stub APIs, dead code paths | No verification that code is *real*, not placeholder |
| `frontend-verification` | Non-functional UI, broken htmx, missing states | No frontend-specific verification exists |
| `production-readiness-review` | Holistic "is this shippable" across all dimensions | Individual gates pass but holistic readiness unchecked |

### The Deployment Gap (Operation)

| Stage | What It Catches | Why Upstream Misses It |
|-------|----------------|----------------------|
| `environment-verification` | Missing secrets, wrong IAM, blocked ports, dead DNS | deployment-execution deploys but doesn't verify the environment itself |
| `runtime-validation` | Endpoints return wrong data, integrations fail, UI broken in real env | No stage exercises the deployed system end-to-end |
| `canary-analysis` | Metric-based deploy decisions | deployment-execution is binary pass/fail |
| `drift-detection` | IaC vs. actual state divergence | No equivalent |
| `release-management` | Versioning, changelog, tagging | No equivalent |
| `chaos-engineering` | System doesn't survive failures | Agent knowledge only, no execution stage |
| `dr-validation` | DR doesn't actually work within RTO/RPO | No equivalent |

### The Lifecycle Gap (Maintenance + Governance)

| Stage | What It Catches | Why Upstream Misses It |
|-------|----------------|----------------------|
| `bug-triage` | Symptom-fixing without root cause analysis | No post-deployment bug workflow |
| `dependency-update` | CVEs in dependencies, staleness | No equivalent |
| `tech-debt-assessment` | Accumulated complexity, coverage decay | No equivalent |
| `postmortem` | Recurring incidents from unlearned lessons | No equivalent |
| `dora-metrics` | Engineering effectiveness unmeasured | No equivalent |
| `compliance-evidence` | Audit readiness unknown | Compliance agent exists but no structured collection |
| `secrets-lifecycle` | Overdue rotation, hardcoded creds | No equivalent |

## Metrics & Efficacy Tracking

Every verification stage produces **quantitative metrics** — not just pass/fail, but numerical scores:

- **Production Readiness Score** (from `production-readiness-review`): percentage of shippability criteria met
- **Runtime Validation Score** (from `runtime-validation`): percentage of endpoints/flows working in deployed env  
- **Environment Health Score** (from `environment-verification`): percentage of infra checks passing
- **Coverage Score** (from `coverage-enforcement`): line + branch percentages
- **Security Score** (from `security-scan`): findings by severity
- **Integration Score** (from `integration-verification`): real vs. stub implementation percentage
- **Frontend Score** (from `frontend-verification`): functional interactions vs. total designed interactions
- **DORA Metrics** (from `dora-metrics`): deployment frequency, lead time, change failure rate, MTTR

These metrics are:
1. **Collected per workflow run** — stored in `aidlc-docs/` artifacts
2. **Comparable across runs** — same metric names, same thresholds
3. **Trendable over time** — did methodology changes improve output quality?
4. **Demonstrable to stakeholders** — prove the system works empirically, not anecdotally

## Design Principles

### 1. Empirical Over Analytical

Every verification stage **actually runs something** — not just reads code and judges it:
- `runtime-validation` hits real endpoints and checks real responses
- `environment-verification` queries real AWS APIs and checks real state
- `frontend-verification` renders real pages and checks for real errors
- `chaos-engineering` injects real faults and measures real recovery

### 2. Self-Healing Over Reporting

When a verification finds a problem, the first response is to **fix it**, not escalate:
- Missing endpoint? Create it.
- Wrong env var? Fix the config.
- Stub implementation? Replace with real logic from the design spec.
- Missing test? Generate it.

Escalation happens only after `max_attempts` exhausted — the default is to fix, not to report.

### 3. Contract-First Verification

The methodology produces design artifacts (functional-design, screen-data-map, API contracts). Verification stages **verify code against those contracts**:
- Does the template use the exact variables the route provides? (template contract)
- Does the API response match the schema in functional-design? (API contract)
- Does the event payload match what subscribers expect? (event contract)

This closes the loop: design → code → verify-against-design.

### 4. Per-Stage Metrics for Longitudinal Tracking

Every verification stage emits structured metrics in a consistent format. This enables:
- Comparing Run A vs. Run B (did a methodology change help?)
- Tracking quality trends across projects (is the methodology improving?)
- Identifying weak points (which verification consistently finds the most issues?)
- Demonstrating ROI (quantitative proof the methodology produces better output)

## Autonomous Execution Model

For the cloud sandbox vision:

```
User ──► Approval Interface ──► AI-DLC Engine (cloud)
                                     │
                                     ├─ Ideation (research, feasibility)
                                     ├─ Inception (requirements, design)
                                     ├─ Construction (code + verify + self-heal)
                                     │     └─ Loop: generate → verify → fix → re-verify
                                     ├─ Operation (deploy + validate + monitor)
                                     │     └─ Loop: deploy → environment-check → runtime-test → fix → re-deploy
                                     └─ Governance (metrics + compliance)
                                           └─ Continuous: measure, compare, report
```

The key insight: **verification stages are what make autonomous execution trustworthy**. Without them, autonomous execution is "fire and forget." With them, the system proves its own correctness at every step — and the metrics prove it over time.

## Relationship to Upstream v2

These stages are **purely additive** — they don't modify any existing upstream stage. They plug into the stage graph via standard `requires_stage` dependencies and activate via the `scopes` array in the scope-grid. The engine's `aidlc-graph compile` picks them up automatically.

New phases (maintenance, governance) need the `phase:` enum extended in the engine's `stage-schema.ts` — this is the only change that requires upstream coordination beyond adding files.

## Stage Count Summary

| Phase | Upstream | Our Extension | Total |
|-------|:--------:|:-------------:|:-----:|
| Initialization | 3 | 0 | 3 |
| Ideation | 7 | 0 | 7 |
| Inception | 8 | 0 | 8 |
| Construction | 7 | 14 | 21 |
| Operation | 7 | 8 | 15 |
| Maintenance | 0 | 4 | 4 |
| Governance | 0 | 3 | 3 |
| **Total** | **32** | **29** | **61** |
