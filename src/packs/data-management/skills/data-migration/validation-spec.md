# Data Migration — Validation Spec

## Pass Criteria

- Migration script exists in the configured migrations directory
- Rollback script/function exists (or documented reason it is not possible)
- Migration applied successfully to dev environment (tool exit code = 0)
- Post-migration schema introspection matches expected schema from functional-design
- Any destructive changes (DROP) received explicit human approval
- Migration plan document exists at expected path

## Fail Criteria

- Migration script does not exist or was not applied
- Migration ran but schema does not match functional-design (silent partial apply)
- Destructive change was applied without human approval
- Rollback script is absent and migration is marked as irreversible without documentation
- Migration was applied to production without staging validation first

## Validation Steps

1. Verify migration file exists in migrations directory with correct naming convention
2. Run the migration tool's status/info command: confirm migration is marked as applied
3. Introspect DB schema: verify all expected tables/columns/indexes exist
4. Run rollback against dev (optional, but strongly recommended): verify rollback restores prior state; re-apply
5. Verify `aidlc-docs/<intent>/construction/<unit>/data/migration-plan.md` exists and lists all schema changes
6. For any DROP operations: confirm human approval is documented in the plan
