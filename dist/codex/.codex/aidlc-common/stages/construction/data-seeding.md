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

Load aidlc-developer-agent persona from `agents/aidlc-developer-agent.md` and knowledge from `.codex/knowledge/aidlc-developer-agent/`.

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

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :seedling:
- Summary of seed-data-plan, seed-scripts
- Review path: `<record>/construction/data-seeding/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .codex/tools/aidlc-orchestrate.ts report --stage data-seeding --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/construction/data-seeding/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/data-seeding/required-sections-<iso>.md`.

## Learn

While running this stage, maintain a running log in
`<record>/<phase>/<stage>/memory.md` (create on stage start if absent).
Append entries under four standard headings:

- **Interpretations** — choices made where the stage prose was ambiguous
- **Deviations** — places you intentionally departed from the stage prose, and why
- **Tradeoffs** — alternatives considered and why you picked what you did
- **Open questions** — anything to confirm before next run, or uncertain context

Format each entry with an ISO 8601 timestamp:
`- 2026-05-20T10:14:32Z — <summary>; <context>`

Before the approval gate, read memory.md and surface candidates as a
structured question. For each entry the user keeps, write to the appropriate
harness destination per `stage-protocol.md` §13 — never to this stage file:

- Prescriptive rule → a practice line under the routed heading in
  `aidlc/spaces/<active-space>/memory/project.md` (default) or `team.md` (promoted)
- Verification check → new manifest at `.codex/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
