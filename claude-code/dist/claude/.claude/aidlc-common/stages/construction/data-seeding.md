---
slug: data-seeding
phase: construction
execution: CONDITIONAL
condition: Execute when integration tests or E2E tests require realistic test data, or when development environments need populated databases. Skip if no data layer or unit tests are sufficient.
lead_agent: aidlc-developer-agent
support_agents:
  - aidlc-quality-agent
mode: inline
produces:
  - seed-data-plan
  - seed-scripts
  - data-seeding-questions
consumes:
  - artifact: migration-plan
    required: false
  - artifact: domain-entities
    required: true
  - artifact: stories
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
inputs: Domain entities from functional-design, migration scripts (if data-migration ran), user stories for scenario context
outputs: aidlc-docs/construction/data-seeding/seed-data-plan.md, aidlc-docs/construction/data-seeding/seed-scripts.md, aidlc-docs/construction/data-seeding/data-seeding-questions.md
---

# Data Seeding

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-developer-agent persona from `agents/aidlc-developer-agent.md` and knowledge from `.claude/knowledge/aidlc-developer-agent/`.

### Step 2: Load Prior Context

- Read domain entities from `aidlc-docs/construction/*/functional-design/`
- Read migration plan from `aidlc-docs/construction/*/data-migration/` (if exists)
- Read user stories for realistic scenario data

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What seeding strategy to use (synthetic via Faker/Factory Boy, masked production subset, fixture files)?
- What data volumes are needed per environment (dev: minimal, staging: realistic, load-test: large)?
- Are there data relationships that must be consistent (user → orders → products)?
- Are there compliance constraints on test data (no real PII, HIPAA-safe)?

Follow stage-protocol.md question flow.

### Step 4: Design Seed Data Plan

Create `seed-data-plan.md`:
- Entity relationship map (which entities need seeding, in what order)
- Volume targets per environment
- Data generation strategy per entity (synthetic, template, random within constraints)
- Referential integrity plan (how related records link together)
- Idempotency approach (seeds can re-run without duplicating data)

### Step 5: Generate Seed Scripts

Create seed scripts using the appropriate tool:
- Python: Factory Boy, Faker, custom fixtures
- TypeScript: @faker-js/faker, Prisma seed, custom
- Java: DataFaker, test containers
- Go: gofakeit, custom generators

Scripts must be:
- Idempotent (safe to re-run)
- Environment-aware (different volumes per env)
- Relationship-aware (create dependencies before dependents)
- Deterministic when needed (fixed seed for reproducible test data)

### Step 6: Validate Seeds

- Run seed scripts against test database
- Verify referential integrity (no orphaned records)
- Verify data volumes match plan
- Verify application can read seeded data without errors

### Step 7: Update State

Mark data-seeding as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :seedling:
Review path: `aidlc-docs/construction/data-seeding/`
Standard 2-option approval (Approve / Request Changes).
