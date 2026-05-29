---
name: aidlc-data-migration
description: |
  Design and execute schema migrations. Generates migration scripts for any tool
  (Alembic, Flyway, Prisma, Knex, Rails, any). Supports zero-downtime migrations.
  Self-healing: migration fails → rollback → diagnose → fix script → retry.
metadata:
  phase: construction
  stage: data-migration
  per-unit: "true"
  human-clarification: "true"
  plan-creation: "true"
  plan-verification: "true"
  artefact-verification: "true"
  pack: data-management
  max-attempts: 3
---

# Data Migration

Design and execute database schema migrations for the current unit. Ensures schema changes are safe, reversible (where possible), and zero-downtime compatible.

## Inputs

- `aidlc-docs/<intent>/construction/<unit>/functional-design/` — data model changes for this unit
- `aidlc-docs/<intent>/inception/domain-model.md` — overall domain model
- `aidlc-docs/<intent>/toolchain.yaml` → `data.migration_tool`, `data.zero_downtime`
- Current database schema (introspect from running dev DB or read existing migrations)

## Execution

### Step 1: Analyse Schema Changes

Compare target schema (from functional-design) against current schema:
- New tables, columns, indexes
- Modified columns (type changes, nullable changes)
- Renamed entities (require special zero-downtime handling)
- Dropped tables/columns (ALWAYS flag for human review)

### Step 2: Human Clarification

Before writing migrations, ask:
1. Are any columns being renamed? (requires two-step migration: add new → migrate data → drop old)
2. Are any columns being made non-nullable? (requires backfill for existing rows)
3. Are any existing tables being dropped? (requires human confirmation — data loss risk)
4. Should production use zero-downtime migration pattern? (expand-contract or feature-flag driven)

Drops and destructive changes ALWAYS require explicit human approval.

### Step 3: Plan Migration

Present the migration plan before generating any scripts:
```markdown
## Migration Plan — Unit: OrderService

**Changes:**
- CREATE TABLE order_preferences (reversible ✓)
- ADD COLUMN orders.priority INTEGER NULL DEFAULT 0 (reversible ✓)
- ADD INDEX idx_orders_status_priority ON orders(status, priority) (reversible ✓)

**Zero-downtime strategy:** Expand-contract
- Phase 1 (this migration): Add new column + index as nullable
- Phase 2 (after deploy): Backfill existing rows, add NOT NULL constraint

**Rollback plan:** DROP INDEX, DROP COLUMN, DROP TABLE (all reversible)

Proceed? (yes / modify / ask-questions)
```

### Step 4: Generate Migration Scripts

Generate migration scripts using the configured tool:
- **Alembic**: `migrations/versions/<timestamp>_<slug>.py` with `upgrade()` and `downgrade()`
- **Flyway**: `db/migration/V<version>__<slug>.sql` with rollback in `U<version>__<slug>.sql`
- **Prisma**: update `schema.prisma`, then `npx prisma migrate dev --name <slug>`
- **Knex**: `knex migrate:make <slug>` then fill `up()` and `down()`
- **Rails**: `rails generate migration <name>` then fill migration body
- **Raw SQL**: `migrations/<timestamp>_<slug>.sql` + `migrations/<timestamp>_<slug>.rollback.sql`

### Step 5: Execute Migration

Apply migration to development environment:
1. Run the migration tool's apply command
2. Verify: schema matches expected state (introspect DB after migration)
3. If migration fails → identify error, rollback, fix script, retry

### Step 6: Self-Healing Loop

If migration fails:
- **Syntax error**: fix and retry
- **Constraint violation**: migration needs a backfill step first → add it, retry
- **Lock timeout**: split into smaller transactions → retry
- **Type incompatibility**: cannot auto-fix → escalate with analysis

## Outputs

- Migration script file(s) in configured migrations directory
- Rollback script file(s) (separate file or downgrade function)
- `aidlc-docs/<intent>/construction/<unit>/data/migration-plan.md`
- Updated schema documentation (ERD fragment or table definitions)

## Artefact Verification

`artefact-verification: "true"` — Human reviews the migration plan (Step 3) and the executed migration result before the unit's tests can run. Any destructive change requires explicit human sign-off.
