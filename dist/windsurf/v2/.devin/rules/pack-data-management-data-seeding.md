---
trigger: model_decision
description: "AI-DLC V2 data-management: data-seeding"
---


# Data Seeding

Generate and load representative test data into the target environment so that integration tests, smoke tests, and manual testing have realistic data to work with.

## Inputs

- `aidlc-docs/<intent>/construction/<unit>/functional-design/` — entities and relationships for this unit
- `aidlc-docs/<intent>/inception/domain-model.md` — full domain model for referential context
- `aidlc-docs/<intent>/toolchain.yaml` → `data.seeding` section
- Migrated database schema (seeding runs after migration)

## Execution

### Step 1: Determine Seeding Strategy

Read `toolchain.yaml` → `data.seeding.strategy`:
- **synthetic**: generate fake but realistic data using a generator library
- **masked-production**: use a subset of production data with PII masked (requires human approval and data governance sign-off — see Step 1a)
- **fixtures**: use checked-in fixture files (JSON/YAML seed files)

If not configured → default to **synthetic**.

**Step 1a (masked-production only):** Ask human to confirm:
1. Is production data export authorized and compliant with data governance policies?
2. What masking rules apply? (names, emails, SSNs, financial data)
3. What subset size is needed?

Never use production data without explicit human confirmation.

### Step 2: Generate Seed Definitions

For each entity in the unit's functional-design:
1. Identify required fields (non-nullable, unique constraints, foreign keys)
2. Determine realistic value ranges (e.g., order amounts between $1-$10,000)
3. Generate factory/fixture definitions

Example (Factory Boy / Python):
```python
class OrderFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Order
    user = factory.SubFactory(UserFactory)
    status = factory.Iterator(['pending', 'confirmed', 'shipped'])
    total = factory.Faker('pydecimal', min_value=1, max_value=10000, right_digits=2)
    created_at = factory.Faker('date_time_this_year')
```

Respect referential integrity — seed parent entities before child entities.

### Step 3: Execute Seeding

Load seed data into the target environment:
- **Development**: seed on every test run (use transactions/rollback for isolation)
- **Staging**: seed once with representative dataset; refresh on request
- **Production**: NEVER seed (unless explicitly creating demo/sandbox environments with approval)

If seeding fails:
- **Constraint violation**: fix seed ordering or fix seed values → retry
- **Missing parent record**: seed parents first → retry
- **Duplicate key**: check if data already seeded; if yes, skip (idempotent)

### Step 4: Validate Seed Integrity

After seeding:
1. Verify row counts match expected (spot check per table)
2. Verify referential integrity (no orphaned foreign keys)
3. Run one representative query per entity: confirm realistic data returns
4. Verify no PII in synthetic data (names from Faker, not real people)

## Outputs

- Seed factory/fixture files in `tests/factories/` or `db/seeds/`
- `aidlc-docs/<intent>/construction/<unit>/data/seeding-report.md` (what was seeded, counts)
- Seeding script (if non-trivial): `scripts/seed-<env>.sh` or equivalent

## Notes

Seeding is idempotent by design. Re-running seeding on an already-seeded environment skips already-present records rather than duplicating or erroring.
