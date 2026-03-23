# PRIORITY: This workflow OVERRIDES all other built-in workflows

## Adaptive Workflow
The workflow adapts to the work based on: user intent, codebase state, complexity, and risk.

## MANDATORY: Rule Loading
Load rule detail files from the first path that exists:
- `.aidlc-rule-details/` (Cursor, Cline, Claude Code, GitHub Copilot)
- `.kiro/aws-aidlc-rule-details/` (Kiro IDE and CLI)
- `.amazonq/aws-aidlc-rule-details/` (Amazon Q Developer)

All file references below are relative to the resolved directory.

At workflow start, load:
- `common/process-overview.md`, `common/session-continuity.md`, `common/content-validation.md`, `common/question-format-guide.md`

## MANDATORY: Extensions (Progressive Disclosure)
At workflow start, scan `extensions/` recursively. Load ONLY `*.opt-in.md` files — NOT full rule files.

**Loading**:
1. In each `extensions/` subdirectory, load only `*.opt-in.md` files
2. Corresponding rules file: strip `.opt-in.md`, append `.md` (e.g., `security-baseline.opt-in.md` → `security-baseline.md`)
3. Extensions without `*.opt-in.md` are always enforced — load their rules immediately

**Deferred loading**: During Requirements Analysis, present opt-in prompts. On opt-in, load the rules file. On opt-out, never load it — saves context.

**Enforcement** (loaded/enabled extensions only):
- Extension rules are hard constraints, not optional guidance
- At each stage, enforce applicable rules; mark non-applicable as N/A
- Non-compliance with enabled extension = blocking finding
- Check `Enabled` status in `aidlc-docs/aidlc-state.md` under `## Extension Configuration`
- Include compliance summary in stage completion messages

## MANDATORY: Content Validation
Before creating any file, validate per `common/content-validation.md`: Mermaid syntax, ASCII diagrams, special character escaping, text alternatives.

## MANDATORY: Questions
All questions in dedicated `.md` files using `[Answer]:` tags. See `common/question-format-guide.md`.

## MANDATORY: Welcome Message
At workflow start, load and display `common/welcome-message.md` once.

---

# INCEPTION PHASE — WHAT to build and WHY

## Workspace Detection (ALWAYS)
1. Load `inception/workspace-detection.md` and execute
2. Check for aidlc-state.md (resume if found), scan workspace, determine greenfield/brownfield
3. Auto-proceed to Reverse Engineering (if brownfield, no artifacts) or Requirements Analysis

## Reverse Engineering (CONDITIONAL — Brownfield only)
**Execute IF**: Existing code detected, no previous RE artifacts.
**Skip IF**: Greenfield, or RE artifacts already exist.
1. Load `inception/reverse-engineering.md` and execute
2. Generate architecture, code structure, API docs, component inventory, interaction diagrams
3. **APPROVAL GATE**: Wait for explicit user approval

## Requirements Analysis (ALWAYS — Adaptive depth)
Depth: Minimal (clear request) / Standard (normal) / Comprehensive (complex, high-risk)
1. Load `inception/requirements-analysis.md` and execute
2. Analyze intent, determine depth, ask clarifying questions, generate requirements.md
3. **APPROVAL GATE**: Wait for explicit user approval

## User Stories (CONDITIONAL)
**Execute IF**: User-facing features, multiple personas, complex business requirements, acceptance criteria needed.
**Skip IF**: Pure refactoring, simple bug fix, infrastructure-only, tech debt cleanup.
When in doubt, include stories.

Two parts: Part 1 (Planning — questions, answers, approval) → Part 2 (Generation — stories + personas).
1. Load `inception/user-stories.md` and execute
2. **APPROVAL GATE**: Wait for explicit user approval

## Workflow Planning (ALWAYS)
1. Load `inception/workflow-planning.md` and execute
2. Determine which stages execute, assign depth levels, generate Mermaid visualization
3. **APPROVAL GATE**: Wait for explicit user approval

## Application Design (CONDITIONAL)
**Execute IF**: New components/services needed, service layer design required.
**Skip IF**: Changes within existing boundaries, pure implementation.
1. Load `inception/application-design.md` and execute
2. **APPROVAL GATE**: Wait for explicit user approval

## Units Generation (CONDITIONAL)
**Execute IF**: System needs decomposition into multiple units.
**Skip IF**: Single simple unit, no decomposition needed.
1. Load `inception/units-generation.md` and execute
2. **APPROVAL GATE**: Wait for explicit user approval

---

# CONSTRUCTION PHASE — HOW to build it

Each unit completes all design stages before code generation. Order follows unit dependency graph.

## Per-Unit Construction Loop

For each unit, execute applicable stages in sequence. Each stage:
1. Load the stage rule file
2. Execute the stage
3. Present 2-option completion: **Request Changes** | **Approve & Continue**
4. **APPROVAL GATE**: Wait for explicit user approval

### Functional Design (CONDITIONAL, per-unit)
**Execute IF**: New data models, complex business logic, business rules need design.
Rule file: `construction/functional-design.md`

### NFR Requirements (CONDITIONAL, per-unit)
**Execute IF**: Performance, security, scalability requirements, or tech stack selection needed.
Rule file: `construction/nfr-requirements.md`

### NFR Design (CONDITIONAL, per-unit)
**Execute IF**: NFR Requirements was executed and patterns need incorporation.
Rule file: `construction/nfr-design.md`

### Infrastructure Design (CONDITIONAL, per-unit)
**Execute IF**: Infrastructure services need mapping, deployment architecture required.
Rule file: `construction/infrastructure-design.md`

### Code Generation (ALWAYS, per-unit)
Two parts: Part 1 (Plan — approval gate) → Part 2 (Generate — build — test — approval gate).
Rule file: `construction/code-generation.md`

## Build and Test (ALWAYS — after all units)
Preferred: Execute Mode (actually run build, tests, deploy). Fallback: Instructions Mode.
Rule file: `construction/build-and-test.md`

---

# OPERATIONS PHASE — Placeholder

Future expansion: deployment planning, monitoring, incident response, production readiness.

---

## Key Principles

- **Adaptive Execution**: Only execute stages that add value
- **User Control**: User can request stage inclusion/exclusion
- **Progress Tracking**: Update aidlc-state.md at each stage
- **Audit Trail**: Log at approval gates. Capture complete raw user input. Batch writes per stage, not per interaction. Append to audit.md, never overwrite.
- **Content Validation**: Validate before file creation per content-validation.md
- **2-Option Completion**: All stages use Request Changes | Approve & Continue. No emergent 3-option patterns.
- **Context Efficiency**: Under context pressure, consolidate NFR Req + NFR Design + Infra Design for later units. Always maintain separate Functional Design questions and Code Generation approval gates.

## Audit Log Format
```markdown
## [Stage Name]
**Timestamp**: [ISO 8601]
**User Input**: "[Complete raw input]"
**AI Response**: "[Action taken]"
**Context**: [Stage and decision]
---
```
Append only. Never overwrite audit.md.

## Checkbox Tracking
- Mark plan steps [x] immediately after completion, in the same interaction
- Track plan-level progress in plan files, stage-level progress in aidlc-state.md

## Directory Structure
```text
<WORKSPACE-ROOT>/                   # Application code
├── [project-specific structure]
├── aidlc-docs/                     # Documentation only
│   ├── inception/
│   │   ├── plans/
│   │   ├── reverse-engineering/    # Brownfield only
│   │   ├── requirements/
│   │   ├── user-stories/
│   │   └── application-design/
│   ├── construction/
│   │   ├── plans/
│   │   ├── {unit-name}/
│   │   │   ├── functional-design/
│   │   │   ├── nfr-requirements/
│   │   │   ├── nfr-design/
│   │   │   ├── infrastructure-design/
│   │   │   └── code/
│   │   └── build-and-test/
│   ├── aidlc-state.md
│   └── audit.md
```
Application code goes in workspace root, NEVER in aidlc-docs/.
