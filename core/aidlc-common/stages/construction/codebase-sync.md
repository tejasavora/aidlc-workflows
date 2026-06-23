---
slug: codebase-sync
phase: construction
execution: CONDITIONAL
condition: Execute after each Bolt (group of increments) completes code-generation. Reads the actual generated code and updates the running context so subsequent stages are aware of what EXISTS, not just what was DESIGNED.
lead_agent: aidlc-developer-agent
support_agents:
  - aidlc-architect-agent
mode: inline
produces:
  - codebase-snapshot
  - drift-report
  - codebase-sync-questions
consumes:
  - artifact: code-summary
    required: true
requires_stage:
  - code-generation
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - workshop
inputs: Generated code in workspace, design artifacts, prior codebase-snapshot (if exists)
outputs: aidlc-docs/construction/codebase-sync/codebase-snapshot.md, aidlc-docs/construction/codebase-sync/drift-report.md
---

# Codebase Awareness Sync

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage reads the ACTUAL generated code and produces a snapshot that subsequent stages use as ground truth. It bridges the gap between "what the design says" and "what actually exists in the codebase." Without this, later stages generate code based on design docs that may not reflect reality (code-generation made implementation choices not in the design).

## Why This Stage Exists

Code-generation makes hundreds of micro-decisions not in the design:
- Chose a specific library (Express vs Fastify, SQLAlchemy vs raw SQL)
- Named files and functions differently than the design implied
- Added helper utilities not in the architecture
- Structured directories in a specific way
- Used specific patterns (middleware, decorators, hooks) not specified

Subsequent stages (security-scan, integration-verification, e2e-test) need to know WHAT ACTUALLY EXISTS to verify it correctly.

## Steps

### Step 1: Scan Generated Codebase

Read the workspace and produce a structured inventory:
- File tree (all source files, organized by module/service)
- Dependency manifest (package.json, requirements.txt, go.mod — actual deps installed)
- Entry points (main files, route registrations, handler mappings)
- API surface (all registered routes with their handlers)
- Database models/entities (as actually defined, not as designed)
- Configuration files (what env vars, what config structure)
- Test files (what tests exist, what they cover)

### Step 2: Compare Against Design

Check for drift between design artifacts and actual code:
- Routes in code vs routes in functional-design API spec
- Entities in code vs entities in functional-design entities.yaml
- Architecture in code (actual imports, actual layers) vs application-design
- Dependencies actually used vs what NFR-design specified

### Step 3: Generate Codebase Snapshot

Create `codebase-snapshot.md`:
```markdown
## Generated Codebase Snapshot

### Technology Choices Made
- Framework: Express 4.18 (not specified in design — agent chose)
- ORM: Prisma (specified in NFR-design)
- Test framework: Vitest (detected from package.json)
- Auth: jose library for JWT (agent chose over jsonwebtoken)

### API Surface (actual routes registered)
| Method | Path | Handler | File |
|--------|------|---------|------|
| POST | /api/auth/signup | authController.signup | src/controllers/auth.ts:12 |
| ... | ... | ... | ... |

### Data Models (actual schema)
- User: {id, email, passwordHash, createdAt, updatedAt}
- Project: {id, name, ownerId, createdAt}

### File Structure
src/
├── controllers/ (6 files)
├── services/ (4 files)
├── models/ (3 files)
├── middleware/ (2 files)
├── routes/ (1 file — central router)
└── utils/ (3 files)

### Patterns Used
- Controller → Service → Model (3-layer)
- Middleware for auth, validation, error handling
- Central error handler (no per-route try/catch)

### Configuration
- Required env vars: DATABASE_URL, JWT_SECRET, PORT
- Config file: src/config.ts (reads from process.env)
```

### Step 4: Flag Drift

Create `drift-report.md` if design-vs-code deviations found:
- Document each deviation
- Classify: intentional (better implementation choice) vs accidental (missed requirement)
- For accidental: flag for resolution in next iteration

### Step 5: Update State

Mark codebase-sync as `[x]` completed.

### Step 6: Present Completion & Request Approval

Completion emoji: :mag_right:
Standard 2-option approval.

## How Downstream Stages Use This

- `security-scan`: reads actual file paths and frameworks to select correct SAST rules
- `integration-verification`: reads actual API surface to verify all routes are real
- `frontend-verification`: reads actual route registrations to verify htmx targets exist
- `e2e-test`: reads actual API surface to generate correct test requests
- `production-readiness-review`: reads actual patterns to apply language-specific checks
