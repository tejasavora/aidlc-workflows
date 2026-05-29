# Data Seeding — Validation Spec

## Pass Criteria

- Seed files/factories exist for all entities introduced in the current unit
- Seeding executed successfully in dev environment (no errors)
- Row counts match expected volumes
- Referential integrity verified (no orphaned foreign keys)
- Seeding is idempotent (re-running does not produce errors or duplicates)
- Production was not seeded (unless explicitly approved demo scenario)
- If masked-production strategy: human approval was documented

## Fail Criteria

- No seed data was generated (integration tests rely on empty database)
- Seeding produced constraint violations (referential integrity broken)
- PII or real user data present in synthetic seed records
- Production database was seeded without explicit approval
- Seeding is not idempotent (second run causes errors)

## Validation Steps

1. Verify seed factory/fixture files exist in `tests/factories/` or `db/seeds/`
2. Run seeding script on dev: confirm exit code 0 and expected row counts
3. Re-run seeding script: confirm it completes without errors (idempotency check)
4. Query one table per entity: spot-check that data is realistic (no empty strings, no `None` where not expected)
5. Run referential integrity check: `SELECT * FROM <child_table> WHERE parent_id NOT IN (SELECT id FROM <parent_table>)` should return 0 rows
6. If masked-production: confirm human approval is documented in seeding-report.md
