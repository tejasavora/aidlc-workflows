# Data Discovery — Validation Spec

## Pass Criteria

- All data entities from requirements are mapped to a source
- Each source has: access verification status, schema documentation, quality assessment
- Strategy is defined for each entity (use/migrate/federate/create)
- Test data plan exists
- Human approved the data strategy

## Fail Criteria

- Data entities exist in requirements but are not mapped to any source
- Access was not verified (assumed to work)
- Schema was not inspected (assumed to match)
- No test data strategy defined
- Strategy involves destructive migration without explicit human approval

## Validation Steps

1. Cross-reference: all entities in requirements.md appear in data-sources.md
2. For each source: verify access-status field is "verified" or "failed-with-plan"
3. For each entity: strategy field is set (use_existing/migrate/federate/create/supplement)
4. Verify test-data-plan.md exists and covers all entities
5. Verify human approval in audit trail for the data strategy
