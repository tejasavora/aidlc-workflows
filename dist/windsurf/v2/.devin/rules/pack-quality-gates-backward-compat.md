---
trigger: model_decision
description: "AI-DLC V2 quality-gates: backward-compat"
---


# Backward Compatibility

Detect breaking changes in API contracts before code is merged. Breaking changes that are not intentional should be caught here — before consumers are affected in production.

## Activation Condition

Activates when BOTH conditions are true:
1. `api-contracts.md` or an OpenAPI/protobuf/GraphQL spec file exists in `aidlc-docs/<intent>/construction/<unit>/`
2. The spec file has changed in the current branch (detected via git diff against the base branch or previous commit)

If no spec file exists, or the spec has not changed, this skill is silently skipped.

## Inputs

- `aidlc-docs/<intent>/construction/<unit>/api-contracts.md` — current API contract document
- API spec files (if present): `.yaml`/`.json` OpenAPI, `.proto` protobuf, `.graphql` GraphQL
- `aidlc-docs/<intent>/toolchain.yaml` → `quality.compat` section:
  ```yaml
  compat:
    tool: openapi-diff       # openapi-diff | buf | graphql-inspector | custom | auto
    spec_file: openapi.yaml  # path to spec file relative to project root
    breaking_policy: block   # block | warn (default: block)
  ```
- Git history: previous committed version of the spec file (via `git show HEAD:path/to/spec`)

## Execution

### Step 1: Identify Spec Files

Locate all API specification files that have changed:
```bash
git diff --name-only HEAD~1 HEAD -- "**/*.yaml" "**/*.json" "**/*.proto" "**/*.graphql"
```

Also include `api-contracts.md` if it has changed. Deduplicate if both spec file and contracts doc reference the same API.

If `toolchain.yaml` → `compat.spec_file` is set, use that as the primary spec.

### Step 2: Extract Previous Version

Retrieve the previous committed version of each changed spec file:
```bash
git show HEAD~1:path/to/openapi.yaml > /tmp/openapi-prev.yaml
# or for the base branch
git show origin/main:path/to/openapi.yaml > /tmp/openapi-prev.yaml
```

If no previous version exists (new file) → this is a first-time spec publication, no breaking changes possible. Record as ADDITION and skip comparison.

### Step 3: Run Comparison Tool

Select and run the appropriate comparison tool:

**openapi-diff (OpenAPI/Swagger):**
```bash
openapi-diff /tmp/openapi-prev.yaml openapi.yaml --fail-on-incompatible --json > compat-result.json
```

**buf (protobuf):**
```bash
buf breaking --against .git#branch=main --format json > compat-result.json
```

**graphql-inspector (GraphQL):**
```bash
graphql-inspector diff /tmp/schema-prev.graphql schema.graphql --format json > compat-result.json
```

**Custom / toolchain-configured:**
Read `compat.command` from toolchain.yaml and execute it. Expect JSON output with at least `breaking: []` and `changes: []` arrays.

**auto (no tool configured):**
Perform structural diff of `api-contracts.md` using text diffing. Flag removed sections, removed fields, changed types, and new required fields heuristically. Note: auto mode is best-effort — recommend configuring a proper tool.

If the tool is unfamiliar → invoke `knowledge-acquisition` meta-skill.

### Step 4: Categorise Changes

Parse the comparison output and categorise every change:

| Category | Examples | Policy |
|---|---|---|
| **BREAKING** | Removed endpoint, removed field, changed field type, narrowed enum, new required field, changed method (GET→POST) | Block or warn per `breaking_policy` |
| **DEPRECATION** | Field marked deprecated, endpoint marked sunset | Warn always |
| **ADDITION** | New endpoint, new optional field, new enum value | Always allowed |
| **DOCUMENTATION** | Description-only change, example change | Always allowed |

Breaking changes require a business decision — they CANNOT be auto-fixed. Removing a field may break existing consumers. Adding a required field will break existing producers.

### Step 5: Produce Backward Compatibility Report

```markdown
## Backward Compatibility Report

**Unit:** order-service
**Spec file:** openapi.yaml
**Comparison:** HEAD~1 → HEAD
**Tool:** openapi-diff 2.1.0
**Breaking policy:** block

### Summary

| Category | Count |
|---|---|
| BREAKING | 2 |
| DEPRECATION | 1 |
| ADDITION | 3 |

### Breaking Changes (action required)

#### BC-001 — BREAKING: Removed field `discount_code` from `POST /orders` request body
- **Before:** `discount_code: string (optional)`
- **After:** field absent
- **Impact:** Clients sending `discount_code` will have it silently ignored or may receive validation errors depending on server strictness
- **Decision required:** Is this intentional? If yes → update API version, notify consumers. If no → restore the field.

#### BC-002 — BREAKING: New required field `customer_id` added to `POST /orders` request body
- **Before:** `customer_id` was absent
- **After:** `customer_id: string (required)`
- **Impact:** Existing clients not sending `customer_id` will receive 400 validation errors
- **Decision required:** Make optional with a default, or proceed as a breaking change with version bump.

### Deprecations

#### DEP-001 — DEPRECATION: `GET /orders/legacy` marked deprecated (sunset: 2024-06-01)
- Consumers should migrate to `GET /orders` before sunset date.

### Additions (safe)

- `GET /orders/{id}/items` — new endpoint added
- `status_history` optional field added to `GET /orders/{id}` response
- `PROCESSING` added to `OrderStatus` enum
```

## Outputs

- `aidlc-docs/<intent>/construction/<unit>/backward-compat-report.md`
  - Categorised changes table (BREAKING, DEPRECATION, ADDITION)
  - Full detail per breaking change with impact assessment and decision options

## No Auto-Fix Policy

`max-attempts: 1` — Breaking changes are business decisions, not bugs to auto-fix. The possible responses are:
- Restore the removed/changed element (if the break was accidental)
- Bump the API major version (if the break is intentional)
- Add deprecation notice and sunset date (if migration time is needed)
- Accept the break with explicit consumer notification and coordinated release

All of these require human judgment. The skill presents findings — it does not decide.

## Artefact Verification

`artefact-verification: "true"` — The backward compatibility report is presented to the human before construction proceeds. The human acknowledges each breaking change as either intentional (with a version strategy) or accidental (triggering a fix).
