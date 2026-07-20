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

Load aidlc-developer-agent persona from `agents/aidlc-developer-agent.md` and knowledge from `.claude/knowledge/aidlc-developer-agent/`.

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

### Step 7: Update State

Mark data-migration as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :card_file_box:
Review path: `aidlc-docs/construction/{unit-name}/data-migration/`
Standard 2-option approval (Approve / Request Changes).
