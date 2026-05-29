---
name: aidlc-documentation-generation
description: |
  Auto-generate API documentation (OpenAPI/AsyncAPI), Architecture Decision Records,
  and an updated README. Verify generated docs match implementation. Publish to
  configured destination. Tool-agnostic.
metadata:
  phase: operations
  stage: documentation-generation
  per-unit: "false"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: operations
  max-attempts: 2
---

# Documentation Generation

Generate and publish comprehensive documentation after a successful release. Covers API specs, architecture decisions, and developer-facing README updates.

## Inputs

- All source code (to extract API shapes and docstrings)
- `aidlc-docs/<intent>/construction/` — all functional-design and NFR-design documents
- `aidlc-docs/<intent>/inception/` — requirements, stories, domain model
- `aidlc-docs/<intent>/toolchain.yaml` → `deployment.docs_output`
- Existing `README.md` (to update, not replace)

## Execution

### Step 1: API Documentation

Detect API type and generate spec:

**REST APIs:**
- If annotations exist (FastAPI, Swagger decorators, Spring, NestJS): extract and generate OpenAPI 3.x JSON/YAML
- If no annotations: generate OpenAPI spec from route definitions + functional-design
- Tool: FastAPI built-in, `drf-spectacular`, `swagger-jsdoc`, SpringDoc, any

**Async/Event-Driven APIs:**
- Generate AsyncAPI 2.x spec from event schema definitions
- Cover: channels, message schemas, bindings

**GraphQL:**
- Introspect schema or read `.graphql` files → generate SDL documentation

Output: `docs/api/openapi.yaml` (or equivalent)

### Step 2: Architecture Decision Records

For each significant design decision made during construction:
1. Check `aidlc-docs/<intent>/construction/` for design choices that should be captured as ADRs
2. Look for: database choices, framework selections, integration patterns, security decisions, NFR tradeoffs
3. Generate one ADR per decision:

```markdown
# ADR-001: Use PostgreSQL with read replicas for order service

**Status:** Accepted
**Date:** 2024-01-15

## Context
Order service requires high read throughput for order history queries with <200ms SLA.

## Decision
Use PostgreSQL 15 with 2 read replicas routed by the connection pool.

## Consequences
- Read queries scale horizontally
- Write queries are single-primary (acceptable for order write patterns)
- Adds operational complexity (replica lag monitoring required)
```

Output: `docs/adr/ADR-NNN-<slug>.md`

### Step 3: README Update

Read existing `README.md` and update (do not replace) these sections:
- **Installation**: verify steps still accurate, update any changed commands
- **Configuration**: add any new environment variables from construction
- **API Reference**: link to generated OpenAPI docs or summarize key endpoints
- **Architecture**: update architecture diagram if new components were added (Mermaid preferred)
- **Changelog**: link to latest `CHANGELOG.md`

Do NOT overwrite: Contributing, License, or project overview sections.

### Step 4: Publish Docs

Based on `toolchain.yaml` → `deployment.docs_output`:
- **GitHub Pages**: commit to `gh-pages` branch or `docs/` folder per Pages config
- **S3 + CloudFront**: `aws s3 sync docs/ s3://bucket/docs/`
- **Confluence**: push via Confluence API (use `documentation-sync` from integration pack if available)
- **GitBook**: push to configured GitBook repository
- **Local only**: leave in `docs/` folder — no push needed

### Step 5: Verify Docs Match Implementation

Spot-check generated docs against actual code:
- Pick 3 API endpoints: verify OpenAPI spec matches actual route signatures and response shapes
- Pick 1 ADR: verify the decision described is actually implemented as described
- Verify README installation steps are still accurate (no broken commands)

## Outputs

- `docs/api/openapi.yaml` (or language-equivalent)
- `docs/adr/ADR-NNN-*.md` files
- Updated `README.md`
- Published docs at configured destination
- `aidlc-docs/<intent>/operations/documentation-report.md` (what was generated, where published)

## Artefact Verification

`artefact-verification: "true"` — Human reviews the documentation report to confirm docs are accurate and complete before the workflow is considered done. Focus verification on: does the OpenAPI spec correctly reflect the API? Are ADRs capturing real decisions?
