---
name: aidlc-data-discovery
description: |
  Discover and verify all data sources needed by the application. Maps existing databases,
  APIs, files. Verifies access, inspects schema, assesses quality. Determines if migration,
  federation, or new provisioning is needed.
metadata:
  phase: inception
  stage: data-discovery
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "true"
  plan-verification: "true"
  artefact-verification: "true"
  type: meta-skill
---

# Data Discovery

Maps all data sources required by the application. For each data entity identified in requirements, determines: where does the data live, can we access it, what's the schema, what's the quality, and what strategy do we need (use existing, migrate, create new, federate).

## When to Invoke

Called during application-design when data entities are identified. Can be re-invoked during construction if new data needs emerge.

## Execution

### Step 1: Identify Data Entities

From requirements and user stories, list all data entities:
- What data does the application read?
- What data does the application write?
- What data does the application transform?

### Step 2: For Each Entity — Ask Source

```
"Where does [entity] data currently live?"
Options:
A) It's new — doesn't exist yet, we'll create it
B) Existing database — [which one?]
C) External API — [which endpoint?]
D) File/S3 — [where?]
E) Multiple sources — [list them]
```

### Step 3: For Existing Sources — Verify

For each existing data source:

1. **Verify Access**
   - Can we connect? (network, auth, firewall)
   - Test: run a simple query / health check
   - If fail: diagnose (credentials? VPN? security group? IAM?)

2. **Inspect Schema**
   - Get table/collection structure
   - Map fields to what the application needs
   - Identify: missing fields, type mismatches, naming differences

3. **Assess Quality**
   - Sample data: check for nulls, duplicates, format issues
   - Volume: row count, data size
   - Freshness: when was it last updated?

4. **Determine Strategy**
   - USE_EXISTING: schema matches, access works, quality acceptable
   - MIGRATE: data needs to move (different DB, different schema)
   - FEDERATE: data stays at source, queried at runtime
   - TRANSFORM: data exists but needs ETL before use
   - SUPPLEMENT: exists partially, need to add fields/tables

### Step 4: For New Data — Design

For entities that don't exist yet:
1. Ask: "What type of data?" (relational, document, graph, key-value, time-series, blob)
2. Ask: "Expected volume?" (now and 12 months)
3. Ask: "Access patterns?" (read-heavy, write-heavy, scan, point lookup, search)
4. Recommend appropriate storage (but don't prescribe — present options)
5. Design schema based on access patterns

### Step 5: Test Data Strategy

For each data source, determine test data approach:
- Production snapshot (masked PII) → if available and allowed
- Synthetic generation → if production data unavailable
- Fixtures → for small, deterministic test scenarios
- None → if data is truly live-only (document risk)

## Outputs

- `aidlc-docs/<intent>/data/data-sources.md` — complete map of all sources
- `aidlc-docs/<intent>/data/data-strategy.md` — per-entity strategy (use/migrate/federate/create)
- `aidlc-docs/<intent>/data/schema-map.md` — field mappings between source and application
- `aidlc-docs/<intent>/data/test-data-plan.md` — how test data will be provided

## Human Review

Plan-verification AND artefact-verification both true — data decisions are critical and often involve access to production systems. Human must approve:
- Which sources to connect to
- Migration strategy (especially if destructive)
- Schema decisions for new storage
- Test data approach (especially if using production snapshots)
