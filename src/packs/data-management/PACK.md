---
name: data-management
description: |
  Database schema migration, test data seeding, and data quality validation.
  Activates whenever any data source is identified during requirements analysis.
  Runs alongside construction — migrations and seeding happen before unit tests
  can pass; data quality validates after each migration.
metadata:
  activation: always-when-data-source-identified
  phase: construction
  runs-after: functional-design
  configurable: true
---

# Data Management Extension Pack

## Activation

Activates when any of the following are identified in `aidlc-docs/<intent>/inception/`:
- A database or data store in the domain model or requirements
- Any story mentioning data persistence, queries, or migrations
- Any NFR mentioning data integrity, retention, or consistency

## Configuration (captured in toolchain.yaml under `data` section)

- **Migration tool**: auto-detected or user-specified (Alembic, Flyway, Prisma, Knex, Rails, Liquibase, any)
- **Seeding strategy**: synthetic (Faker/Factory Boy) or masked-production (subset)
- **Data generation tool**: auto-detected (Faker, Factory Boy, custom generators, any)
- **Quality tool**: auto-detected or user-specified (Great Expectations, Deequ, custom SQL checks, any)
- **Environments**: which environments need seeding (dev, staging; never production unless explicitly approved)
- **Zero-downtime**: whether migrations must be non-breaking (default: true for production targets)

Example toolchain.yaml data section:
```yaml
data:
  migration_tool: alembic
  zero_downtime: true
  seeding:
    strategy: synthetic
    tool: factory-boy
    environments: [dev, staging]
  quality:
    tool: great-expectations
    run_after: migration
```

## Execution Order

For each unit that introduces or modifies data:

1. `data-migration` — Design and execute schema migrations
2. `data-seeding` — Generate and load test data
3. `data-quality` — Validate data integrity and completeness

Skills 2 and 3 run per environment. Migrations run once (applied to all environments in sequence: dev → staging → production, with gates between).

## Relationship to Construction

`data-migration` is a prerequisite for `build-and-test` when integration tests require a database. The orchestrator invokes data-management skills before quality-gates when a unit includes data layer changes.
