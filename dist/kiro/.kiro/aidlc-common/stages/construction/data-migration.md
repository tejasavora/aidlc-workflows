---
slug: data-migration
phase: construction
execution: CONDITIONAL
condition: Execute when functional design introduces or modifies database schemas, or when existing data must be restructured. Skip if no data persistence is involved.
lead_agent: aidlc-developer-agent
support_agents:
  - aidlc-architect-agent
mode: inline
for_each: unit-of-work
produces:
  - migration-plan
  - migration-scripts
  - data-migration-questions
consumes:
  - artifact: business-logic-model
    required: true
  - artifact: domain-entities
    required: true
  - artifact: code-summary
    required: false
requires_stage:
  - functional-design
workspace_requires: true
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - workshop
inputs: Domain entities and business logic model from functional-design, existing schema (if brownfield)
outputs: aidlc-docs/construction/{unit-name}/data-migration/migration-plan.md, aidlc-docs/construction/{unit-name}/data-migration/migration-scripts.md, aidlc-docs/construction/{unit-name}/data-migration/data-migration-questions.md
---

# Data Migration

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-developer-agent persona from `agents/aidlc-developer-agent.md` and knowledge from `.kiro/knowledge/aidlc-developer-agent/`.

### Step 2: Load Prior Context

- Read domain entities from `aidlc-docs/construction/*/functional-design/`
- Read existing database schema (if brownfield)
- Read NFR requirements for data integrity and availability constraints

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What database system is in use (PostgreSQL, MySQL, DynamoDB, MongoDB, etc.)?
- What migration tool to use (Alembic, Flyway, Prisma Migrate, Knex, Liquibase)?
- What is the zero-downtime requirement (can the app be offline during migration)?
- What is the data volume (affects migration strategy for large tables)?
- Are there foreign key constraints or cross-service data dependencies?

Follow stage-protocol.md question flow.

### Step 4: Design Migration Plan

Create `migration-plan.md`:
- Schema diff (current → target)
- Migration strategy (expand-contract for zero-downtime, direct for offline-ok)
- Ordering (dependency-aware: referenced tables before referencing tables)
- Rollback plan (down migration for each up migration)
- Data transformation logic (if reshaping existing data)
- Estimated execution time and lock impact

### Step 5: Generate Migration Scripts

Create migration files using the detected/chosen tool:
- Forward migrations (up)
- Rollback migrations (down)
- Data transformation scripts (if needed)
- Seed data updates (if schema changes affect seed data)

For zero-downtime migrations, use expand-contract pattern:
1. ADD new columns/tables (nullable or with defaults)
2. DUAL-WRITE application code (write to both old and new)
3. BACKFILL existing data
4. SWITCH reads to new schema
5. DROP old columns/tables (separate migration, after verification)

### Step 6: Validate Migrations

- Run migrations against a test database
- Verify rollback works cleanly
- Check for data integrity (foreign keys, constraints, not-null)
- Verify application code works with both pre- and post-migration schema (for expand-contract)

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :card_file_box:
- Summary of migration-plan, migration-scripts
- Review path: `<record>/construction/data-migration/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .kiro/tools/aidlc-orchestrate.ts report --stage data-migration --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/construction/data-migration/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/data-migration/required-sections-<iso>.md`.

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
- Verification check → new manifest at `.kiro/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
