# Skill Catalogue

Catalogue of AI-DLC skills. Each skill is a directory under `skills/<skill-name>/` and follows the [Agent Skills specification](https://agentskills.io/specification). The catalogue is the orchestrator's source when composing a workflow.

Skills are composable. Phases and stages are organising concepts the orchestrator uses to group and present skills — they are not a rigid pipeline. A customer can reorder, insert, or omit any skill when composing a workflow.

## Skill folder layout

```
skills/<skill-name>/
├── SKILL.md              ← frontmatter (name, description, AI-DLC metadata) + instructions
├── validation-spec.md    ← validation rules + upstream inputs for the validator
└── scripts/              ← optional; omit if no scripts
```

Generic builder and validator behaviour lives in `aidlc-common/protocols/aidlc-builder-protocol.md` and `aidlc-common/protocols/aidlc-validator-protocol.md`. Per-skill folders only hold what differs between skills.

## Frontmatter metadata

Every skill's `SKILL.md` frontmatter carries, under `metadata`, the fields the orchestrator reads:

- `phase` — `bootstrap`, `inception`, `construction`, or `operations`
- `stage` — organising tag (e.g. `requirements-analysis`, `user-stories`); multiple skills may share a stage when fan-out happens
- `per-unit` — `"true"` when the skill runs once per unit in the construction phase
- `human-clarification` — `"true"` (default) if the human answers clarification questions; `"false"` if the builder records the questions, picks its own recommended answers, and proceeds autonomously
- `plan-creation` — `"true"` (default) if the builder writes a plan file before execution; `"false"` if the skill skips planning entirely and goes from clarification straight to execution
- `plan-verification` — `"true"` (default) if the human approves the plan before execution. Ignored when `plan-creation: "false"`. Invalid combination: `plan-creation: "false"` with `plan-verification: "true"`.
- `artefact-verification` — `"true"` (default) if the human reviews artifacts after the validator passes

Values are strings per the agentskills.io spec. The orchestrator parses `"true"`/`"false"` as booleans.

## Flag semantics

- `human-clarification: "true"` (default) — the builder writes clarification questions, the orchestrator presents them to the human, the human answers in chat or in the file, then the orchestrator hands the answers back to the builder. `"false"` — the builder writes the questions, picks its own recommended answers in the file (recording rationale), transitions clarification straight from `pending` through `answered` to `complete` in one builder pass, and proceeds. The human is not consulted.
- `plan-creation: "true"` (default) — the builder writes a plan file as an explicit step. `"false"` — the skill skips the planning step entirely; state goes from `clarification:complete` directly to `execution:pending`. No plan file is produced.
- `plan-verification: "true"` (default) — human approves the plan before the builder executes. `"false"` — builder proceeds without plan approval. Ignored when `plan-creation: "false"`.
- `artefact-verification: "true"` (default) — human reviews artifacts after the validator passes. `"false"` — validator pass = skill complete; human is only consulted on halting condition.

Clarification is always *attempted* — the questions file always exists for traceability — but the `human-clarification` flag controls whether the human is in the loop.

## Naming convention

All skills we supply are prefixed `aidlc-` to distinguish them from customer-contributed or third-party skills. The `stage` tag is the bare unprefixed name (e.g. `requirements-analysis`) and remains the human-facing vocabulary.

## Available skills

Legend: ✅ implemented (folder exists under `skills/`), 🚧 not yet implemented.

Default flags (when not stated): `human-clarification: true`, `plan-creation: true`, `plan-verification: true`, `artefact-verification: true`.

### Bootstrap phase

The bootstrap phase runs once per intent. The orchestrator drives `intent-bootstrap` outside `process_checker` (it has to — the file `process_checker` reads doesn't exist yet). After `intent-bootstrap` completes, the intent skeleton exists with a stub `workflow.md` containing only the `workflow-composition` line. From there, `workflow-composition` runs through the standard loop and rewrites `workflow.md` with the chosen downstream skills. Bootstrap skills are never present in `workflow.md`.

Both bootstrap skills set `human-clarification: false` and `plan-creation: false` because their decisions follow rote patterns: question files are auto-answered with the builder's recommendations (recorded for audit), planning is skipped, and execution proceeds directly. `workflow-composition` keeps `artefact-verification: true` so the human still approves the composed workflow.

| Skill | Stage | Per-Unit | Human-Clar | Plan-Create | Plan-Verify | Artefact-Verify | Status |
|---|---|---|---|---|---|---|---|
| aidlc-intent-bootstrap       | intent-bootstrap       | No  | false | false | n/a   | false | ✅ |
| aidlc-workflow-composition   | workflow-composition   | No  | false | false | n/a   | true  | ✅ |

### Inception phase

| Skill | Stage | Per-Unit | Human-Clar | Plan-Create | Plan-Verify | Artefact-Verify | Status |
|---|---|---|---|---|---|---|---|
| aidlc-reverse-engineering    | reverse-engineering    | No  | true | true | true | true | ✅ |
| aidlc-requirements-analysis  | requirements-analysis  | No  | true | true | true | true | ✅ |
| aidlc-user-stories           | user-stories           | No  | true | true | true | true | ✅ |
| aidlc-wireframes             | wireframes             | No  | true | true | true | true | ✅ |
| aidlc-application-design     | application-design     | No  | true | true | true | true | ✅ |
| aidlc-units-generation       | units-generation       | No  | true | true | true | true | ✅ |

### Construction phase

| Skill | Stage | Per-Unit | Human-Clar | Plan-Create | Plan-Verify | Artefact-Verify | Status |
|---|---|---|---|---|---|---|---|
| aidlc-functional-design      | functional-design      | Yes | true | true | true | true | ✅ |
| aidlc-nfr-assessment         | nfr-assessment         | Yes | true | true | true | true | ✅ |
| aidlc-nfr-design             | nfr-design             | Yes | true | true | true | true | ✅ |
| aidlc-infrastructure-design  | infrastructure-design  | Yes | true | true | true | true | ✅ |
| aidlc-code-generation        | code-generation        | Yes | true | true | true | true | ✅ |
| ~~aidlc-build-and-test~~     | ~~build-and-test~~     | —   | —    | —    | —    | —    | Moved to quality-gates pack |

The orchestrator or the human may override flags per-intent when composing the workflow.

When a skill is implemented, flip its Status to ✅ and ensure the folder contains `SKILL.md` and `validation-spec.md` at minimum.

---

## Lenses

Lenses are a distinct skill type (`type: lens`) that apply a perspective across the entire lifecycle. Unlike stage skills, lenses do not run as discrete steps in the workflow. Instead, they are activated during workflow-composition and their definitions are injected into every builder and validator invocation for the duration of the intent.

A lens provides:
- **Principles and definitions** — generic guidance the builder applies in context of whatever stage it is executing
- **Validation rules** — generic rules the validator checks against whatever artifacts it is validating

Lenses are composable and additive. Multiple lenses can be active simultaneously — they are independent perspectives on the same artifacts.

### Lens folder layout

```
skills/<lens-name>/
├── SKILL.md              ← type: lens, purpose, definitions, principles, question guidance
└── validation-spec.md    ← validation rules applied at every stage
```

### Lens frontmatter metadata

- `type` — `"lens"` (distinguishes from stage skills)
- `applies-to` — `"all"` or a list of stages where the lens is relevant (e.g. `"requirements-analysis, application-design, code-generation"`)
- `default-activation` — `"true"` (active unless explicitly deactivated) or `"false"` (opt-in per intent)

### Activation

Lenses are activated or deactivated during `workflow-composition`. The activation decision is recorded in `intent-state.md` under a `## Active Lenses` section. Once activated, the lens's one-time clarification questions (from its Question Guidance) are asked as part of workflow-composition's clarification pass. Answers are stored in `bootstrap/workflow-composition/lens-<lens-name>-answers.md`.

### Runtime behaviour

- **Builder:** Before every builder invocation, the orchestrator includes each active lens's `SKILL.md` (definitions and principles) and its one-time answers. The builder interprets these in context of the current stage.
- **Validator:** Before every validator invocation, the orchestrator includes each active lens's `validation-spec.md`. The validator checks these rules alongside the stage skill's own validation-spec. Lens rule failures are real failures — same weight as stage-native rules.

Lens `validation-spec.md` files may organize rules into sections by stage applicability. The `### All Stages` section is checked everywhere; sections headed with a comma-separated stage list (e.g., `### application-design, functional-design, code-generation`) are checked only when the current stage matches. See `aidlc-common/protocols/aidlc-validator-protocol.md` for how the validator interprets sectional rules.

### Available lenses

| Lens | Applies To | Default Activation | Status |
|---|---|---|---|
| aidlc-owasp | all | true | ✅ |

---

## Extension Packs

Extension packs are bundles of capabilities that activate based on project needs. Unlike stage skills (which run as discrete workflow steps), pack skills run at specific trigger points — typically after code-generation (quality gates) or after all construction is complete (operations).

Packs are discovered in `packs/<pack-name>/` and configured during workflow-composition based on `toolchain.yaml` and user preferences.

### Pack activation

During `workflow-composition`, the orchestrator:
1. Reads `toolchain.yaml` (produced by `toolchain-discovery` meta-skill during bootstrap)
2. Determines which packs to activate based on configured tools and user preferences
3. Records activation in `intent-state.md` under `## Active Packs`
4. Pack skills are injected into the workflow at their designated trigger points

### Pack skill execution

Pack skills follow the same builder → validator loop as stage skills. Quality-gate pack skills additionally have **self-healing remediation loops** — they diagnose, fix, and re-validate up to `max-attempts` before escalating.

### Available packs

| Pack | Activation | Phase | Trigger Point | Status |
|------|-----------|-------|---------------|--------|
| quality-gates | always | construction | after code-generation (per unit) | ✅ |
| operations | when deploy targets configured | operations | after all construction complete | ✅ |
| resilience | user-triggered or NFR requires | operations | user-triggered post-deploy | ✅ |
| data-management | when data sources identified | construction | alongside functional/infra design | ✅ |
| maintenance | event-triggered | maintenance | bug report, dep alert, tech debt review | ✅ |
| governance | regulated environment | common | alongside all phases | ✅ |
| integration | external tools configured | common | after each stage completes | ✅ |
| well-architected | enterprise/production workloads | construction | after infrastructure-design | ✅ |

### Quality Gates Pack — `packs/quality-gates/`

Runs after code-generation for each unit. Always active.

| Skill | Stage | Per-Unit | Human-Clar | Artefact-Verify | Max-Attempts | Status |
|---|---|---|---|---|---|---|
| aidlc-static-analysis | static-analysis | Yes | false | false | 3 | ✅ |
| aidlc-security-scan | security-scan | Yes | false | true | 3 | ✅ |
| aidlc-build-and-test | build-and-test | Yes | false | true | 3 | ✅ |
| aidlc-coverage-enforcement | coverage-enforcement | Yes | false | false | 3 | ✅ |
| aidlc-e2e-test | e2e-test | No | false | true | 2 | ✅ |
| aidlc-backward-compat | backward-compat | Yes | false | true | 1 | ✅ |
| aidlc-visual-regression | visual-regression | No | false | true | 1 | ✅ |
| aidlc-mutation-testing | mutation-testing | Yes | false | true | 2 | ✅ |
| aidlc-contract-test | contract-test | No | true | true | 2 | ✅ |
| aidlc-code-review | code-review | Yes | false | true | 2 | ✅ |
| aidlc-dast | dast | No | false | true | 1 | ✅ |

### Operations Pack — `packs/operations/`

Runs after all construction and quality gates pass.

| Skill | Stage | Per-Unit | Human-Clar | Artefact-Verify | Max-Attempts | Status |
|---|---|---|---|---|---|---|
| aidlc-deployment-design | deployment-design | No | true | true | — | ✅ |
| aidlc-deploy | deploy | No | false | true | 3 | ✅ |
| aidlc-canary-analysis | canary-analysis | No | false | true | 1 | ✅ |
| aidlc-smoke-test | smoke-test | No | false | true | 3 | ✅ |
| aidlc-drift-detection | drift-detection | No | false | true | 1 | ✅ |
| aidlc-release-management | release-management | No | false | true | — | ✅ |
| aidlc-documentation-generation | documentation-generation | No | false | true | — | ✅ |

### Resilience Pack — `packs/resilience/`

User-triggered or when NFR targets include performance/load requirements.

| Skill | Stage | Per-Unit | Human-Clar | Artefact-Verify | Max-Attempts | Status |
|---|---|---|---|---|---|---|
| aidlc-load-test-design | load-test-design | No | true | true | — | ✅ |
| aidlc-load-test-execute | load-test-execute | No | false | true | 3 | ✅ |
| aidlc-chaos-engineering | chaos-engineering | No | false | true | — | ✅ |
| aidlc-dr-validation | dr-validation | No | false | true | 3 | ✅ |

### Data Management Pack — `packs/data-management/`

Active when data sources are identified during requirements.

| Skill | Stage | Per-Unit | Human-Clar | Artefact-Verify | Max-Attempts | Status |
|---|---|---|---|---|---|---|
| aidlc-data-migration | data-migration | No | true | true | 3 | ✅ |
| aidlc-data-seeding | data-seeding | No | true | false | 3 | ✅ |
| aidlc-data-quality | data-quality | No | false | false | 3 | ✅ |

### Maintenance Pack — `packs/maintenance/`

Event-triggered (bug reports, dependency alerts, tech debt reviews).

| Skill | Stage | Per-Unit | Human-Clar | Artefact-Verify | Max-Attempts | Status |
|---|---|---|---|---|---|---|
| aidlc-bug-triage | bug-triage | No | true | true | 3 | ✅ |
| aidlc-dependency-update | dependency-update | No | false | false | 3 | ✅ |
| aidlc-tech-debt-assessment | tech-debt-assessment | No | true | true | — | ✅ |
| aidlc-postmortem | postmortem | No | true | true | — | ✅ |

### Governance Pack — `packs/governance/`

Active in regulated environments.

| Skill | Stage | Per-Unit | Human-Clar | Artefact-Verify | Max-Attempts | Status |
|---|---|---|---|---|---|---|
| aidlc-audit-trail | audit-trail | No | false | false | — | ✅ |
| aidlc-compliance-evidence | compliance-evidence | No | true | true | — | ✅ |
| aidlc-change-approval | change-approval | No | false | true | — | ✅ |
| aidlc-dora-metrics | dora-metrics | No | true | true | — | ✅ |
| aidlc-secrets-lifecycle | secrets-lifecycle | No | true | true | 2 | ✅ |

### Integration Pack — `packs/integration/`

Active when external tools are configured.

| Skill | Stage | Per-Unit | Human-Clar | Artefact-Verify | Max-Attempts | Status |
|---|---|---|---|---|---|---|
| aidlc-task-sync | task-sync | No | true | false | — | ✅ |
| aidlc-documentation-sync | documentation-sync | No | true | false | — | ✅ |
| aidlc-notification | notification | No | true | false | — | ✅ |

### Well-Architected Pack — `packs/well-architected/`

Active for enterprise/production workloads. Runs after infrastructure-design.

| Skill | Stage | Per-Unit | Human-Clar | Artefact-Verify | Max-Attempts | Status |
|---|---|---|---|---|---|---|
| aidlc-ha-design | ha-design | No | true | true | — | ✅ |
| aidlc-dr-design | dr-design | No | true | true | — | ✅ |
| aidlc-cost-estimation | cost-estimation | No | true | true | — | ✅ |
| aidlc-sustainability-check | sustainability-check | No | false | true | — | ✅ |

---

## Meta-Skills

Meta-skills are invoked on-demand by other skills when they need specialized capabilities. They do not run as part of the normal workflow sequence — they are called when needed.

| Skill | Stage | Type | Purpose | Status |
|---|---|---|---|---|
| aidlc-knowledge-acquisition | knowledge-acquisition | meta-skill | Research unfamiliar tech via MCP before generating | ✅ |
| aidlc-toolchain-discovery | toolchain-discovery | meta-skill | Detect project tools → produce toolchain.yaml | ✅ |
| aidlc-data-discovery | data-discovery | meta-skill | Map data sources, verify access, determine strategy | ✅ |
