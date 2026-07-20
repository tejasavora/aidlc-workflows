---
slug: tech-debt-assessment
phase: operation
execution: CONDITIONAL
condition: Execute on-demand when the team wants a structured assessment of accumulated technical debt, or on a scheduled cadence (monthly/quarterly).
lead_agent: aidlc-architect-agent
support_agents:
  - aidlc-quality-agent
  - aidlc-developer-agent
mode: inline
produces:
  - tech-debt-inventory
  - remediation-roadmap
  - tech-debt-questions
consumes:
  - artifact: code-summary
    required: false
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
inputs: Existing codebase, test coverage data, dependency analysis, complexity metrics
outputs: aidlc-docs/maintenance/tech-debt-assessment/tech-debt-inventory.md, aidlc-docs/maintenance/tech-debt-assessment/remediation-roadmap.md, aidlc-docs/maintenance/tech-debt-assessment/tech-debt-questions.md
---

# Technical Debt Assessment

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-architect-agent persona from `agents/aidlc-architect-agent.md` and knowledge from `.claude/knowledge/aidlc-architect-agent/`.

### Step 2: Gather Metrics

Analyze the codebase across multiple dimensions:
- **Complexity**: cyclomatic complexity, cognitive complexity per function/file
- **Coverage**: test coverage gaps (files below threshold)
- **Staleness**: dependencies behind by major versions, deprecated API usage
- **Duplication**: code clones (similar blocks across files)
- **Coupling**: import graphs, circular dependencies, God objects
- **Documentation**: undocumented public APIs, stale README sections
- **Build health**: build time trends, flaky tests, warning count

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What areas of the codebase cause the most development friction?
- Are there known architectural decisions that need revisiting?
- What is the team's appetite for refactoring (sprint allocation percentage)?
- Are there upcoming features that would benefit from debt reduction first?

Follow stage-protocol.md question flow.

### Step 4: Generate Tech Debt Inventory

Create `tech-debt-inventory.md`:

For each debt item:
| ID | Category | Location | Severity | Effort | Impact | Priority |
|----|----------|----------|----------|--------|--------|----------|

Categories: complexity, coverage, staleness, duplication, coupling, documentation, architecture

Severity: high (blocks feature work), medium (slows development), low (cosmetic/preference)
Effort: T-shirt size (S/M/L/XL)
Impact: what improves if fixed (velocity, reliability, onboarding, security)

### Step 5: Generate Remediation Roadmap

Create `remediation-roadmap.md`:
- Quick wins (high impact, low effort) → do in next sprint
- Strategic investments (high impact, high effort) → plan as dedicated sprints
- Opportunistic (medium impact, low effort) → do alongside feature work
- Deferred (low impact) → revisit next assessment

For each recommended action:
- What to change (specific refactoring, upgrade, rewrite)
- Prerequisites (what must happen first)
- Risk assessment (what could break)
- Definition of done (measurable outcome)
- Estimated effort and timeline

### Step 6: Update State

Mark tech-debt-assessment as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :wrench:
Review path: `aidlc-docs/maintenance/tech-debt-assessment/`
Standard 2-option approval (Approve / Request Changes).
