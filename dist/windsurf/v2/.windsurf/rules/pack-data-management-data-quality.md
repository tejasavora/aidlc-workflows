---
trigger: model_decision
description: "AI-DLC V2 data-management: data-quality"
---


# Data Quality

Validate that data in the database meets the quality rules defined by the domain model. Catch data problems before they surface as runtime errors or incorrect business logic.

## Inputs

- `aidlc-docs/<intent>/construction/<unit>/functional-design/` — entity definitions and business rules
- `aidlc-docs/<intent>/inception/domain-model.md` — field constraints and invariants
- `aidlc-docs/<intent>/toolchain.yaml` → `data.quality` section
- Populated database (after migration + seeding)

## Execution

### Step 1: Derive Quality Rules

From functional-design and domain model, extract rules:

| Rule Type | Example |
|-----------|---------|
| Completeness | `orders.user_id` must not be null |
| Uniqueness | `users.email` must be unique |
| Format | `users.email` must match email regex |
| Range | `orders.total` must be > 0 |
| Referential integrity | Every `orders.user_id` must exist in `users.id` |
| Business invariant | `order_items.quantity` must be >= 1 |
| Temporal consistency | `orders.shipped_at` must be >= `orders.created_at` if not null |

### Step 2: Generate Quality Checks

Based on configured tool, generate quality check definitions:

**Great Expectations:**
```python
suite.expect_column_values_to_not_be_null("user_id")
suite.expect_column_values_to_be_unique("email")
suite.expect_column_values_to_match_regex("email", r"^[^@]+@[^@]+\.[^@]+$")
suite.expect_column_values_to_be_between("total", 0, None, strict_min=True)
```

**Custom SQL checks:**
```sql
-- Completeness
SELECT COUNT(*) FROM orders WHERE user_id IS NULL;  -- expect: 0
-- Uniqueness
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;  -- expect: empty
```

**Deequ (Spark/Scala):**
```scala
Check(CheckLevel.Error, "order_checks")
  .isComplete("user_id")
  .isUnique("id")
  .isNonNegative("total")
```

### Step 3: Execute Checks

Run quality checks against the populated database.
Collect: rule name, pass/fail, failure count, sample failing rows.

### Step 4: Self-Healing Loop

For each failing check:

| Failure Type | Auto-fixable? | Action |
|-------------|:---:|--------|
| Missing required field in seed data | Yes | Update seed factory to always populate field |
| Format violation in seed data | Yes | Fix seed generator pattern |
| Referential integrity violation | Yes | Fix seed ordering (seed parent before child) |
| Business rule violated by code | No | Escalate — code is producing invalid data |
| True duplicate (code allows duplicates) | No | Escalate — missing unique constraint or uniqueness check in code |

Apply fix → re-seed → re-check → repeat.

### Step 5: Produce Quality Report

```markdown
## Data Quality Report — Unit: OrderService

**Rules checked:** 12
**Passed:** 11
**Failed:** 1

### Failures
| Rule | Table | Column | Violations | Sample |
|------|-------|--------|-----------|--------|
| format-email | users | email | 3 | "test@", "not-an-email" |

**Root cause:** Seed factory `UserFactory.email` allows empty domain.
**Fix applied:** Updated `Faker('email')` → validates format.
**Re-check result:** PASS
```

## Outputs

- Quality check definition files in `tests/data-quality/`
- `aidlc-docs/<intent>/construction/<unit>/data/quality-report.md`
- Updated seed factories (if seeding was the cause of failures)

## Escalation

If a quality failure cannot be fixed by correcting seed data (i.e., the application code is producing invalid data), escalate with:
- Which rule failed
- Evidence that the code is the source (not seed data)
- The business rule being violated
- Recommended code fix
