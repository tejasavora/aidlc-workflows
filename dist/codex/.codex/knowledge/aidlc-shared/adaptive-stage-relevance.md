# Adaptive Stage Relevance

Every CONDITIONAL stage must self-assess its relevance BEFORE executing. If the stage is not relevant to this specific project, it should SKIP itself and log the reason. This prevents wasted effort on irrelevant verification.

## Relevance Check Protocol

At the START of every CONDITIONAL stage (before Step 1), execute:

```
RELEVANCE CHECK:
1. Read the project's actual content (requirements, architecture, generated code)
2. Evaluate: does this stage's purpose apply to THIS project?
3. If NO → emit STAGE_SKIPPED telemetry with reason → proceed to next stage
4. If YES → execute normally
```

## Per-Stage Relevance Criteria

### Data stages (data-migration, data-seeding, database-operations)
- **Relevant if:** project has ANY database/data store (check: schema files, ORM config, DB in architecture)
- **Skip if:** pure stateless service, CLI tool, library, static site with no persistence

### Frontend stages (frontend-verification, visual-regression)
- **Relevant if:** project has HTML templates, React/Vue/Angular components, or any rendered UI
- **Skip if:** pure API, CLI, library, backend service with no UI

### Container stages (container-orchestration checks in production-readiness)
- **Relevant if:** Dockerfile exists OR deployment target is ECS/EKS/Fargate
- **Skip if:** Lambda-only, static site, local script

### Multi-service stages (backward-compat, api-governance, contract-test)
- **Relevant if:** project exposes APIs consumed by OTHER services or external clients
- **Skip if:** standalone app, internal tool with no external consumers

### Security-intensive stages (DAST, access-control-review, supply-chain-security)
- **Relevant if:** project handles user data, financial data, PII, or is internet-facing
- **Skip if:** internal developer tool, prototype, offline utility

### Compliance stages (data-privacy, compliance-evidence, change-management)
- **Relevant if:** project declares compliance frameworks OR handles regulated data
- **Skip if:** internal tool, open-source library, dev utility

### HA/DR stages (ha-design, dr-design, dr-validation, chaos-engineering)
- **Relevant if:** availability targets > 99.9% OR production user-facing with SLA
- **Skip if:** internal tool, batch job, dev/staging only

### Performance stages (capacity-planning, performance-validation, load testing)
- **Relevant if:** NFRs specify latency/throughput targets OR expected traffic > 100 RPS
- **Skip if:** low-traffic internal tool, batch processor, CLI

## How to Determine Relevance

Read these sources (in priority order):
1. `aidlc-docs/inception/requirements-analysis/requirements.md` — what the project IS
2. Generated code in workspace — what actually exists
3. `aidlc-docs/construction/*/infrastructure-design/` — what infra is planned
4. `toolchain.yaml` (if exists) — what tools are configured

## Telemetry for Skipped Stages

When a stage skips itself:
```json
{
  "stage": "<slug>",
  "gate_outcome": "skipped_irrelevant",
  "skip_reason": "No database detected — project is a stateless Lambda API",
  "evidence": "No schema files, no ORM in dependencies, no DB in infrastructure-design",
  "duration_seconds": 2,
  "confidence_score": 1.0
}
```

This prevents the "75 stages for a hello world" problem while keeping the FULL capability available for enterprise scope projects that need everything.
