# AI-DLC V2 — 78-Stage Methodology

Contract-first, self-healing, independent reviewer, evidence before claims.
This project uses the AI-DLC v2 methodology for structured, agent-driven development.

## Quick Start
Run `/aidlc` to start or resume. The orchestrator guides you through intent capture,
workflow composition, and skill execution.

## Lifecycle
Ideation → Inception → Construction → Operation → Maintenance → Governance

## Key Constraints
- Never skip stages. Never produce placeholders. Evidence before claims.
- One unit per session for code-generation stages.
- Quality gates run after every code generation with self-healing loops.


---

# Builder Protocol

Execution protocol for the builder. This file is packaged with every builder alongside the skill's `SKILL.md` and `validation-spec.md`.

---

## 1. Inputs

The builder receives from the orchestrator:

- Input file paths (one or more)
- Path to `aidlc-common/conventions/aidlc-folder-structure.md`
- Active lens files (zero or more): each active lens's `SKILL.md` (definitions and principles) and its one-time answers file

Each invocation may also include:
- Answered question file path (after clarification)
- Approved plan file path (after plan approval)
- Validation report path (after failed validation)

The builder is stateless. Each invocation is independent. All state is in the files on disk.

## 2. Protocol

The builder reads the active skill's `SKILL.md` frontmatter to determine the flow. The two flags that affect builder behaviour are:

- `human-clarification` (default `"true"`) — when `"false"`, the builder writes the question file with both questions AND its own recommended answers filled in, then transitions clarification straight from `pending` through `awaiting-human → answered → complete` in a single pass, and proceeds. The orchestrator does not present questions to the human. The questions file still exists for traceability.
- `plan-creation` (default `"true"`) — when `"false"`, the builder skips the planning step entirely. State goes from `clarification:complete` directly to `execution:pending`, then to `execution:complete`. No plan file is produced.

Apply these flags consistently across all invocation paths below.

### 2.1 Invocation with Input Files

1. Read the skill's `SKILL.md` (including frontmatter flags) and `validation-spec.md`.
2. Read all input files at the provided paths.
3. Determine output paths from `aidlc-common/conventions/aidlc-folder-structure.md`.
4. Assess whether clarification is needed based on available context and the validation-spec.

**If clarification is needed and `human-clarification: "true"`:**
- Generate clarifying questions using `aidlc-common/conventions/aidlc-question-format.md`.
- Write questions to the question file. Leave `[Answer]:` blank.
- Transition state to `clarification : awaiting-human`.
- Return to the orchestrator: status `clarification-needed`, question file path.
- Stop.

**If clarification is needed and `human-clarification: "false"`:**
- Generate clarifying questions in the same format, but **fill in your recommended answer** for each question on the `[Answer]:` line. Capture brief reasoning beside each answer (the existing Recommendation field already holds rationale).
- Write the file. Update state through `pending → awaiting-human → answered → complete` in this single pass (the orchestrator is not consulted).
- Continue to planning (or execution, if `plan-creation: "false"`).

**If no clarification is needed:**
- Transition clarification straight to `complete` (or skip clarification rows entirely if no question file is produced — but produce the question file with a brief note explaining why no questions were needed if the skill convention requires it).
- Continue to planning (or execution, if `plan-creation: "false"`).

### 2.2 Invocation with Answered Questions

1. Read the answered question file.
2. Analyse answers for ambiguities (vague responses, contradictions, undefined terms).

**If ambiguities found:**
- Write follow-up questions to the question file.
- Return to the orchestrator: status `clarification-needed`, question file path.
- Stop.

**If answers are clear:**
- Proceed to Planning.

### 2.3 Planning

Skip this step entirely when the skill's `plan-creation: "false"` — go straight to Execution and let `execution:pending → execution:complete` be the next transition. Otherwise:

1. Create a plan with checkboxes in the plan file.
2. Transition state to `planning : awaiting-human` (regardless of `plan-verification` — the orchestrator handles that flag).
3. Return to the orchestrator: status `plan-ready`, plan file path.
4. Stop.

### 2.4 Invocation to Execute

1. Execute the plan. Generate artifacts as defined in the skill's `SKILL.md`.
2. Mark plan checkboxes as complete.
3. Do NOT self-validate against `validation-spec.md` and do NOT run anything in the skill's `scripts/` directory. Scripts are exclusively for the validator. Your job is to produce artifacts; validation is the validator's job.
4. Update the state file Artifacts column with bare filenames only (e.g., `requirements.md`, not `inception/requirements-analysis/requirements.md`).
5. Return to the orchestrator: status `complete`, artifact filenames.

### 2.5 Invocation After Failed Validation

1. Read the validation report at the provided path.
2. Read the current artifacts.
3. Fix the issues identified.
4. Rewrite artifacts.
5. Return to the orchestrator: status `complete`, updated artifact paths, question file path.

---

## 3. Rules (apply to every skill)

1. Read `validation-spec.md` before assessing clarification — it informs what questions to ask and what standards to build toward.
2. Do not interact with the human directly. All human communication is routed through the orchestrator.
3. Do not read the validator protocol.
4. **Scope-by-phase.** Do not ask about or design for concerns that belong to a later skill:
   - **Inception-phase skills** (requirements-analysis, user-stories, application-design): do not ask about tech stack, frameworks, databases, protocols, infrastructure, or deployment. Those belong to construction (nfr-assessment and beyond).
   - **application-design**: describe logical behaviour only — no language, framework, database, protocol, broker, or vendor specifics.
   - **functional-design**: technology-agnostic domain/business logic only.
5. **Gap handling.** If you discover a requirement or capability not covered by the inputs, raise it as a follow-up question. Do not silently add functionality beyond what is documented upstream.
6. **Brownfield context.** When a skill's prerequisites mention brownfield, accept brownfield context from any available source: RE-kb, reverse-engineering artifacts, org-level knowledge base, or LLM analysis of the existing codebase. Do not restate this in the skill's `SKILL.md`.
7. **Lens application.** When active lens files are provided, read each lens's SKILL.md to understand its principles and definitions. Apply the lens's perspective to the current stage's artifacts — interpret the generic principles in context of whatever you are currently producing. Lens guidance is additive: it does not override the stage skill's instructions but augments them with additional considerations. If a lens principle conflicts with the stage skill's instructions, flag the conflict as a clarification question rather than silently resolving it.

## 4. State File Responsibilities

The builder writes the following state transitions to `intent-state.md` (subject to the per-skill flags above):

- `clarification:pending → clarification:awaiting-human` (after generating questions, when `human-clarification: "true"`)
- `clarification:awaiting-human → clarification:follow-up` (after generating follow-up questions)
- `clarification:answered → clarification:complete` (after confirming answers are clear, when `human-clarification: "true"`)
- `clarification:pending → clarification:awaiting-human → clarification:answered → clarification:complete` in a single pass (when `human-clarification: "false"`; the builder fills its own answers)
- `planning:pending → planning:awaiting-human` (after generating plan, only when `plan-creation: "true"`)
- `execution:pending → execution:complete` (after generating artifacts)

When `plan-creation: "false"`, the builder skips planning entirely; the state row never has a `planning` step.

The builder does NOT write human-response transitions (`awaiting-human → answered`, `awaiting-human → approved`). Those are written by the orchestrator — except in the `human-clarification: "false"` case, where the builder writes the full clarification path itself because no human is in the loop.

See `aidlc-common/conventions/aidlc-state-schema.md` for the state file format, valid states, and transitions.


---

# Orchestrator Protocol

You are the AI-DLC workflow orchestrator. You compose adaptive workflows from the catalogue and execute them skill by skill, coordinating the builder and validator sub-agents while `process_checker` enforces correctness at every step.

**Path convention.** All framework paths in this document (`skills/...`, `aidlc-common/...`) are relative to the AI-DLC install root: `.kiro/` for Kiro, `.claude/` for Claude, etc. Paths under `aidlc-docs/...` live in the user's project, not the install root.

Inputs: human intent, `skills/aidlc-orchestrator/CATALOGUE.md`, `aidlc-common/conventions/aidlc-folder-structure.md`, and `aidlc-docs/aidlc-state.md` if it exists.

## 1. Workflow

The orchestrator runs in two phases:

- **Bootstrap pre-loop** — runs `intent-bootstrap` and `workflow-composition`. Until they finish, `workflow.md` does not exist (or contains only a stub) and the standard loop cannot run.
- **Standard skill loop** — once `workflow.md` is composed, drive every remaining skill through §3.

### 1.1 Bootstrap pre-loop

0. Display the welcome banner.
1. **Capture the prompt verbatim.** Do not generate a slug, pick an intent number, or seed any directory. All of that is `intent-bootstrap`'s job.
2. **Run `intent-bootstrap` outside `process_checker`.** Drive its clarification → planning → execution → validation cycle directly: invoke the builder, present questions if the flag requires it, invoke the builder for execution, invoke the validator. Trust the validator's PASS/FAIL report. `process_checker` cannot run yet — its preconditions (state file, audit file, `workflow.md`) are exactly what `intent-bootstrap` creates. On validator FAIL, run the standard fix loop. On PASS, the intent skeleton exists; proceed.
3. **Run `workflow-composition` through the standard loop in §3.** Run `process_checker` for the first time using `<intent_dir_path>/state/process-checkpoint.json`. It reads the stub `workflow.md` and initialises the checkpoint with `workflow-composition` at `step: setup`. When `workflow-composition` finishes its execution step, it rewrites `workflow.md` with the chosen downstream skills. `process_checker` re-reads `workflow.md` on the next invocation and the standard loop picks up the first downstream skill.

### 1.2 Standard skill loop

Once `workflow-composition` has rewritten `workflow.md`, drive every remaining skill through §3.

## 2. Conventions When Speaking to the Human

When referring to a skill in chat or audit output, use its `stage` and `phase` from the catalogue (e.g. "user stories stage", "inception phase"). Use skill names only for internal reasoning, state files, sub-agent invocations, and as disambiguators when one stage maps to multiple skills.

When referring to sub-agents in prose, use the form `<stage>-builder` / `<stage>-validator`. Append the skill name only when one stage maps to multiple skills (e.g. `build-security-test-builder`). The actual `invokeSubAgent` call still uses `aidlc-builder-agent` / `aidlc-validator-agent` — the friendly name is display-only.

Workflow composition itself — the rules for selecting and ordering skills — lives in `skills/aidlc-workflow-composition/SKILL.md`. Run that skill rather than reasoning about composition in this protocol.

## 3. Skill Execution

### Loop pattern

```
for each skill in workflow:
  read skill flags from SKILL.md frontmatter

  invoke builder (clarification)
  process_checker(clarification)
  if human-clarification:
    present questions, wait for answers
    invoke builder (review answers)
    process_checker(clarification)

  if plan-creation:
    invoke builder (planning)
    process_checker(planning)
    if plan-verification:
      present plan, wait for approval
      process_checker(planning)

  invoke builder (execution)
  process_checker(execution)

  invoke validator
  process_checker(validation)
  if fail and retries left → loop back to execution
  if fail and no retries → halt, present to human

  if artefact-verification:
    present artifacts, wait for approval
    process_checker(verification)
  else:
    write `— : complete` to intent-state.md

  process_checker(skill-complete)
  → next skill
```

### Invoking the builder

Use `invokeSubAgent` with name `aidlc-builder-agent`. Include in the prompt:

- `aidlc-common/protocols/aidlc-builder-protocol.md`
- `skills/<skill-name>/SKILL.md`
- `skills/<skill-name>/validation-spec.md`
- `aidlc-common/conventions/aidlc-folder-structure.md`
- Current step (clarification, planning, execution, or fix)
- Input file paths
- Intent directory path (for `intent-bootstrap`'s first invocation, pass the workspace root and intent statement instead — see §1.1)
- Answered question file path — for clarification-answered invocations
- Approved plan file path — for execution invocations
- Validation report path — for fix invocations
- Active lens files — for each lens listed in `intent-state.md` under `## Active Lenses`: include `skills/<lens-name>/SKILL.md` and the lens answers file (if it exists)

### Invoking the validator

Use `invokeSubAgent` with name `aidlc-validator-agent`. Include in the prompt:

- `aidlc-common/protocols/aidlc-validator-protocol.md`
- `skills/<skill-name>/validation-spec.md`
- Artifact paths (from builder output or state)
- Answered question file path
- Skill output directory path
- Skill scripts directory path (`skills/<skill-name>/scripts/`) if it exists
- Active lens validation specs — for each lens listed in `intent-state.md` under `## Active Lenses`: include `skills/<lens-name>/validation-spec.md`

### process_checker contract

After every sub-agent invocation, run:

```
node aidlc-common/scripts/aidlc-process-checker.js --from-state <intent-dir>/state/process-checkpoint.json
```

First run reads `workflow.md` to initialise; subsequent runs read the checkpoint. After each run, read the checkpoint:

```json
{
  "current": { "skill": "...", "step": "...", "status": "..." },
  "next": { "step": "..." },
  "error": null
}
```

- `error` null → proceed with `next.step`.
- `error` not null → follow `error.action` to fix, then re-run `process_checker`.

On Kiro, a hook reminds you to run `process_checker` after every sub-agent call.

**Exception — `intent-bootstrap`.** Runs entirely outside `process_checker` per §1.1. From `workflow-composition` onwards, `process_checker` runs after every step.

**Enforcement — you MUST NOT:**
- Advance to the next step without PASS from `process_checker` (except the §1.1 bootstrap exception).
- Invoke builder or validator for a subsequent step if `process_checker` has not returned PASS for the current step.
- Treat a FAIL as acceptable without re-doing the failed step.
- Skip running `process_checker` because the previous step "looked correct".
- Substitute your own judgment for `process_checker`'s result.

On FAIL: read `error.action`, re-invoke the responsible agent, re-run `process_checker`. Loop until PASS or the attempt limit is reached.

## 4. State Write Responsibilities

| Actor | Writes to `intent-state.md` |
|---|---|
| Builder | clarification states, planning states, execution states |
| Validator | validation states |
| Orchestrator | human-response transitions and skill completion: `awaiting-human → answered`, `awaiting-human → approved`, `awaiting-human → rejected`, `verification → approved`, `— → complete` (after verification approval, or directly from `validation : pass` when `artefact-verification: "false"`) |
| process_checker | never writes `intent-state.md` — only its own checkpoint |

State file format, valid states, and transitions: `aidlc-common/conventions/aidlc-state-schema.md`.

`intent-state.md` is created by `intent-bootstrap` during its execution step, not by the orchestrator. Once it exists, the table above applies.

## 5. Construction Phase

Construction skills with `per-unit: "true"` run once per unit. Differences from inception:

- Workflow lines include `--unit <unit-name>`.
- Artifacts live at `construction/<unit>/<skill>/` instead of `inception/<skill>/`.
- State key is `<skill>:<unit>` (e.g., `aidlc-functional-design:auth-service`).
- `process_checker` takes phase + unit args: `construction <unit-name>`.

The §3 flow is identical — just scoped to one unit at a time.

## 5.1 Scoped Skills

Skills that run multiple times within the same phase use `--scope <scope-name>` (e.g., reverse-engineering per repo). Differences from unscoped inception:

- Workflow lines include `--scope <scope-name>`.
- Artifacts live at `inception/<skill>/<scope>/` instead of `inception/<skill>/`.
- State key is `<skill>:<scope>` (e.g., `reverse-engineering:payments-api`).

The §3 flow is identical — just scoped to one instance at a time.

## 6. Lenses

Lenses are skills with `type: lens` that apply a perspective across the entire lifecycle. They do not run as discrete steps — they augment every builder and validator invocation.

### Activation

Lenses are activated during `workflow-composition`. The orchestrator reads the `## Active Lenses` table in `intent-state.md` to determine which lenses are active. `workflow-composition` writes this table during its execution step.

### Injection

For every builder and validator invocation in the §3 loop:

1. Read `intent-state.md` → `## Active Lenses` table.
2. For each active lens where the current stage is in the lens's `applies-to` list (or `applies-to` is `"all"`):
   - **Builder:** include `skills/<lens-name>/SKILL.md` and the lens answers file.
   - **Validator:** include `skills/<lens-name>/validation-spec.md`.

### Lens applicability

If a lens's `applies-to` field lists specific stages, only inject it when the current skill's `stage` matches one of those stages. If `applies-to` is `"all"`, inject it for every skill.

### Exception

Lenses are NOT injected during the bootstrap pre-loop (§1.1). They take effect from the first downstream skill onwards — after `workflow-composition` has activated them.

## 7. See Also

- `aidlc-common/protocols/aidlc-builder-protocol.md` — builder behaviour
- `aidlc-common/protocols/aidlc-validator-protocol.md` — validator behaviour
- `aidlc-common/conventions/aidlc-state-schema.md` — state format, valid states, transitions, attempt counter
- `aidlc-common/conventions/aidlc-folder-structure.md` — directory layout
- `aidlc-common/conventions/aidlc-workflow-format.md` — `workflow.md` syntax
- `aidlc-common/conventions/aidlc-question-format.md` — clarification question format
- `skills/aidlc-orchestrator/CATALOGUE.md` — available skills and their flags
- `skills/aidlc-workflow-composition/SKILL.md` — composition rules, presentation, and examples

---

## Welcome banner

```
AI-DLC Workflow 2.0 Initiated

Humans codify the judgement.
AI orchestrates and self-verifies — deterministically.
Marching towards Autonomous Development.
```


---

# Validator Protocol

Execution protocol for the validator. This file is the single source of truth for validator behaviour. It is packaged alongside the skill's `validation-spec.md`.

---

## 1. Inputs

The validator receives from the orchestrator:

- Artifact paths to validate
- Answered question file path
- Upstream artifact paths (for traceability checks) — listed in the skill's `validation-spec.md` "Inputs" section
- Skill output directory path
- Skill scripts directory path (may be absent if the skill has no scripts)
- Active lens validation specs (zero or more): each active lens's `validation-spec.md`

## 2. Protocol

1. Read `validation-spec.md` (including its "Inputs" section).
2. Read all artifacts at the provided paths.
3. Read all upstream artifacts listed in `validation-spec.md`.
4. Read the answered question file.
5. Run every script in the skill's `scripts/` directory **exactly once**. Capture output and exit code of each. If the directory is absent or empty, record "no scripts". If any script fails, the overall validation status MUST be `fail` regardless of your other findings — but do not stop; run the remaining scripts first.
6. Validate:
   - **Spec compliance** — every rule in `validation-spec.md` is checked against the artifacts.
   - **Lens compliance** — lens `validation-spec.md` files may organize rules into sections by stage applicability. The validator checks:
     - All rules under the `### All Stages` section (always checked when the lens is active).
     - All rules under any section header whose comma-separated stage list includes the current skill's stage (e.g., if the current stage is `application-design` and a section is headed `### application-design, functional-design, code-generation`, check those rules).
     - Rules in sections whose stage list does NOT include the current stage are skipped entirely — they are not checked and not reported.
     - Lens rule failures within applicable sections carry the same weight as stage-native rule failures.
   - **Script results** — fold the exit codes captured in step 5 into the findings. Do not re-run the scripts.
   - **Clarification consistency** — artifacts are consistent with the answers in the question file.
   - **Completeness** — gaps the spec may not have anticipated (missing coverage, unstated assumptions, logical inconsistencies).
7. Write a validation report to the skill output folder.
8. Return to the orchestrator: status `pass` or `fail`, validation report path.

## 3. Validation Report Format

The report has two parts.

### 3.1 Human-Readable Section

Write in whatever markdown format is natural. Include:

- **Status:** `pass` or `fail`
- **Rules checked:** list of validation-spec rules with pass/fail per rule
- **Lens rules checked:** for each active lens, list of lens validation-spec rules with pass/fail per rule
- **Scripts invoked:** list of every script in `scripts/` with exit code and output
- **Findings:** for each failure, the rule violated (or script that failed), the artifact and section where the violation occurs, and a description of the issue. For lens rule failures, prefix with the lens name (e.g., `[owasp] Rule 3: ...`)
- **Recommendations:** suggested fixes (the validator does not fix, only recommends)

### 3.2 Machine-Readable Block

At the very end of the report, append a plain-text block with fixed delimiters. This block is parsed by `process_checker`. Format is exact — no markdown, no extra whitespace, no variations.

```
---PROCESS-CHECK-DATA---
STATUS: PASS
TOOLS: verify-structure.sh,check-coverage.py
RULES: 1,2,3,4,5
LENS-RULES: owasp:1,2,3,4,5;accessibility:1,2,3
---END-PROCESS-CHECK-DATA---
```

Rules:
- `STATUS` must be exactly `PASS` or `FAIL` (uppercase)
- `TOOLS` is a comma-separated list of script filenames that were executed. If no scripts exist, use `TOOLS: none`. (The field is named `TOOLS` for backward compatibility with process_checker; it holds the `scripts/` filenames.)
- `RULES` is a comma-separated list of rule numbers from `validation-spec.md` that were checked
- `LENS-RULES` is a semicolon-separated list of `<lens-name>:<comma-separated rule numbers>` for each active lens. Rule numbers are reported as the union of all applicable sections (`All Stages` + matching stage sections), numbered sequentially across applicable sections. For example, if "All Stages" has 4 rules and the matching stage section has 3 rules, report `owasp:1,2,3,4,5,6,7`. Rules from non-applicable sections are excluded from the count entirely. If no lenses are active, use `LENS-RULES: none`.
- Delimiters must appear exactly as shown
- This block must be the last thing in the file

## 4. Rules (apply to every skill)

1. Never fix artifacts. Validate and report only.
2. Do not interact with the human directly.
3. Do not read the builder protocol or the skill's `SKILL.md`. You do not know how artifacts were produced, only whether they meet the spec.
4. Do not carry context from previous validation runs.

## 5. State File Responsibilities

The validator writes the following state transitions to `intent-state.md`:

- `validation:pending → validation:pass` (after all checks pass)
- `validation:pending → validation:fail` (after one or more checks fail)

The validator does NOT write any other state transitions.

See `aidlc-common/conventions/aidlc-state-schema.md` for state file format.


---

# AI-DLC Folder Structure

```
org-ai-kb/
│
├── re-kb/
│   ├── <repo-a>/
│   │   ├── summary.md                     tech stack, purpose, ownership (RE-generated)
│   │   ├── architecture.md                (RE-generated)
│   │   ├── integration-map.md             (RE-generated)
│   │   ├── intent-history.md              which intents touched this repo (last entry = latest)
│   │   └── engineering/
│   │       ├── intent-<nnn>/
│   │       │   ├── domain-entities.md
│   │       │   ├── business-rules.md
│   │       │   ├── nfr-design.md
│   │       │   ├── infrastructure-design.md
│   │       │   └── deployment-architecture.md
│   │       └── intent-<nnn>/
│   │           └── ...
│   ├── <repo-b>/
│   │   └── ...
│   └── <repo-n>/
│       └── ...
│
└── aidlc-docs/
    └── intent-<nnn>-<intent-name>/
        │
        ├── intent-prompt.md                 raw user prompt (seeded by orchestrator)
        ├── intent.md                        structured intent (produced by intent-bootstrap)
        ├── workflow.md                      approved workflow (seeded by orchestrator, appended by workflow-composition)
        │
        ├── state/
        │   ├── intent-state.md             overall intent + inception progress
        │   ├── process-checkpoint.json     process_checker's own state
        │   ├── <unit-name>-state.md
        │   └── <unit-name>-state.md
        │
        ├── audit/
        │   ├── intent-audit.md
        │   ├── <unit-name>-audit.md
        │   └── <unit-name>-audit.md
        │
        ├── bootstrap/
        │   ├── intent-bootstrap/                (artifacts produced by the intent-bootstrap skill)
        │   │   ├── intent-bootstrap-questions.md
        │   │   ├── intent-bootstrap-plan.md
        │   │   └── bootstrap-context.md
        │   └── workflow-composition/            (artifacts produced by the workflow-composition skill)
        │       ├── workflow-composition-questions.md
        │       ├── workflow-composition-plan.md
        │       ├── workflow-rationale.md
        │       └── lens-<lens-name>-answers.md  (one per activated lens; one-time clarification answers)
        │
        ├── inception/
        │   ├── reverse-engineering/            (one subdirectory per repo, always scoped)
        │   │   └── <repo-name>/
        │   │       ├── reverse-engineering-questions.md
        │   │       ├── reverse-engineering-plan.md
        │   │       ├── components.md
        │   │       ├── component-methods.md
        │   │       ├── component-dependencies.md
        │   │       ├── services.md
        │   │       ├── cross-cutting.md
        │   │       ├── data-models.md             (if persistence)
        │   │       ├── api-contracts.md           (if APIs)
        │   │       ├── event-catalog.md           (if event-driven)
        │   │       ├── external-dependencies.md   (if external integrations)
        │   │       ├── technology-stack.md
        │   │       ├── code-structure.md
        │   │       ├── code-quality-assessment.md
        │   │       └── chunks/                    (for medium/large codebases)
        │   │           └── <chunk-name>.md
        │   ├── requirements-analysis/          (artifacts produced by the requirements-analysis skill)
        │   │   ├── requirements-analysis-questions.md
        │   │   ├── requirements-analysis-plan.md
        │   │   └── requirements.md
        │   ├── user-stories/                   (artifacts produced by the user-stories skill)
        │   │   ├── user-stories-questions.md
        │   │   ├── user-stories-plan.md
        │   │   ├── stories.md
        │   │   └── personas.md
        │   ├── wireframes/                     (artifacts produced by the wireframes skill, if UI intent)
        │   │   ├── wireframes-questions.md
        │   │   ├── wireframes-plan.md
        │   │   ├── screen-data-map.md
        │   │   ├── screen-structure.md
        │   │   ├── wireframe-guidance.md
        │   │   └── screens/                    (visual files — SVG or HTML per screen)
        │   │       └── <screen-name>.svg|html
        │   ├── application-design/             (artifacts produced by the application-design skill)
        │   │   ├── application-design-questions.md
        │   │   ├── application-design-plan.md
        │   │   ├── components.md
        │   │   ├── component-methods.md
        │   │   ├── component-dependencies.md
        │   │   ├── services.md
        │   │   ├── cross-cutting.md
        │   │   ├── data-models.md                 (if persistence)
        │   │   ├── api-contracts.md               (if system exposes APIs)
        │   │   ├── event-catalog.md               (if event-driven)
        │   │   └── external-dependencies.md       (if external integrations)
        │   └── units-generation/                (artifacts produced by the units-generation skill)
        │       ├── units-generation-questions.md
        │       ├── units-generation-plan.md
        │       ├── units-of-work.md
        │       ├── units-of-work-dependency.md
        │       └── units-of-work-story-map.md
        │
        ├── construction/
        │   ├── <unit-name>/                     (one subdirectory per unit; per-unit skills write here)
        │   │   ├── unit-summary.md
        │   │   ├── adr.md
        │   │   ├── functional-design/
        │   │   │   ├── functional-design-questions.md
        │   │   │   ├── functional-design-plan.md
        │   │   │   ├── business-logic-model.md
        │   │   │   ├── domain-entities.md
        │   │   │   └── business-rules.md
        │   │   ├── nfr-assessment/
        │   │   │   ├── nfr-assessment-questions.md
        │   │   │   ├── nfr-assessment-plan.md
        │   │   │   ├── nfr-requirements.md
        │   │   │   └── tech-stack-decisions.md
        │   │   ├── nfr-design/
        │   │   │   ├── nfr-design-questions.md
        │   │   │   ├── nfr-design-plan.md
        │   │   │   ├── nfr-design-patterns.md
        │   │   │   └── logical-components.md
        │   │   ├── infrastructure-design/
        │   │   │   ├── infrastructure-design-questions.md
        │   │   │   ├── infrastructure-design-plan.md
        │   │   │   ├── infrastructure-design.md
        │   │   │   └── deployment-architecture.md
        │   │   ├── code-generation/
        │   │   │   ├── code-generation-questions.md
        │   │   │   ├── code-generation-plan.md
        │   │   │   └── CODE_SUMMARY.md
        │   │   └── ...
        │   ├── <unit-name>/
        │   │   └── ...
        │   └── build-and-test/
        │
        └── operations/
            └── (skills to be defined)
```

## Document Lifecycle

There are two categories of documents in RE-kb.

**Category 1: Reverse-engineering documents** live flat at `re-kb/<repo>/`. Generated when a repo is first onboarded via reverse engineering. They describe the repo as it exists today.

**Category 2: Engineering documents** are generated during construction and live under `re-kb/<repo>/engineering/intent-<nnn>/`. During construction they reside in `aidlc-docs/intent-<nnn>/construction/<unit>/`. After the unit is deployed, they are moved to `re-kb/<repo>/engineering/intent-<nnn>/`. Each intent gets its own folder.

`intent-history.md` tracks which intents touched the repo in order. The last entry is the latest state.

## Design Knowledge Split

The intent folder captures the story of how work was done — the questions asked, plans made, decisions recorded, and progress tracked. Once an intent is complete, this folder becomes an immutable historical record. It answers "what happened and why."

The RE-kb captures the current truth about each repository — its domain model, business rules, non-functional design, infrastructure, and how it integrates with other systems. Unlike the intent folder, RE-kb documents are living. They are never overwritten, only extended — although old decisions may become void over time, which may lead to removal of outdated sections.

## Workspace Setup

During construction, each unit team opens:

```
<workspace>/
├── org-ai-kb/                      (cloned — shared across teams)
└── <target-repo>/                  (the code being worked on)
```


---

# Question Format

## File format

All questions for a clarification round are saved to the question file at once. Each question uses this format:

```
### Q<n>: <question text>

a) Option A
b) Option B
c) Option C
d) Other

**Trade Offs:** <explain the trade-offs between options, if applicable>

**Recommendation:** <AI's recommended option with brief reasoning>

[Answer]:
```

## Chat presentation

- Present questions one at a time in chat, using the same format above.
- If two questions are closely related, present them together.
- Show progress: "Q1 of N", "Q2 of N", etc.
- Wait for the human's answer before presenting the next question.
- The human may choose to answer in chat or go to the question file and answer all at once.
- Trade Offs and Recommendation sections are optional per question — include them when the choice has meaningful implications, skip for straightforward questions.


---

# State Schema

Single source of truth for the `intent-state.md` file format and the state machine it tracks.

## File format

```markdown
# Intent State

intent: <intent-name>
created: <timestamp>
updated: <timestamp>

## Active Packs

| Pack | Activated | Config |
|---|---|---|
| <pack-name> | <timestamp> | <config-reference or —> |

## Active Lenses

| Lens | Activated | Answers |
|---|---|---|
| <lens-name> | <timestamp> | <answers-file-path or —> |

## Workflow Progress

| Skill | Step | Status | Attempt | Artifacts |
|---|---|---|---|---|
| <skill-name> | <step> | <status> | <n> | <comma-separated bare filenames or —> |
```

## Active Packs section

The `## Active Packs` table records which extension packs are active for this intent. It is written by `workflow-composition` during its execution step. Each row contains:

- **Pack** — the pack name (e.g., `quality-gates`)
- **Activated** — timestamp when the pack was activated
- **Config** — path to pack-specific configuration (typically `toolchain.yaml` section), or `—`

Format:

```markdown
## Active Packs

| Pack | Activated | Config |
|---|---|---|
| quality-gates | <timestamp> | toolchain.yaml#quality |
| operations | <timestamp> | toolchain.yaml#ci_cd |
| governance | <timestamp> | — |
```

The orchestrator reads this table to determine which pack skills to inject at their trigger points.

## Active Lenses section

The `## Active Lenses` table records which lenses are active for this intent. It is written by `workflow-composition` during its execution step. Each row contains:

- **Lens** — the lens name (e.g., `owasp`)
- **Activated** — timestamp when the lens was activated
- **Answers** — path to the lens's one-time clarification answers file (relative to intent root), or `—` if no questions were asked

The orchestrator reads this table to determine which lens SKILL.md and validation-spec.md files to inject into builder and validator invocations.

## Rules

### 1. One row per skill

Each skill has exactly one row. When updating state, find the existing row for the skill name and replace the values in that row. Do NOT add a new row — duplicate rows break script parsing.

### 2. State key

- Inception skills: Skill column contains the skill name (e.g., `requirements-analysis`).
- Construction skills (per-unit): Skill column contains `<skill-name>:<unit-name>` (e.g., `functional-design:auth-service`).
- Scoped skills: Skill column contains `<skill-name>:<scope-name>` (e.g., `reverse-engineering:payments-api`).

### 3. Artifacts column

Bare filenames only — not full paths (e.g., `requirements.md`, not `inception/requirements-analysis/requirements.md`).

`process_checker` resolves them relative to:
- inception: `inception/<skill>/`
- inception (scoped): `inception/<skill>/<scope>/`
- construction: `construction/<unit>/<skill>/`

Comma-separated, or `—` if none.

### 4. Write responsibilities

See `aidlc-common/protocols/aidlc-orchestrator-protocol.md` — "State write responsibilities".

## Script parsing contract

Scripts parse the table using patterns like:

```bash
grep "<skill-name>" intent-state.md | awk -F'|' '{print $3, $4}'
```

Preserve the exact column layout.

---

## Valid states

| Step | Status | Meaning |
|---|---|---|
| — | not-started | Skill has not begun |
| clarification | pending | Builder needs to generate questions |
| clarification | awaiting-human | Questions written, waiting for answers |
| clarification | answered | Human answered, reviewing for ambiguity |
| clarification | follow-up | Ambiguous answers, follow-up questions generated |
| clarification | complete | Answers clear, ready to plan |
| planning | pending | Builder needs to create plan |
| planning | awaiting-human | Plan written, waiting for approval |
| planning | revision-requested | Human requested changes |
| planning | approved | Plan approved, ready to execute |
| execution | pending | Builder needs to generate artifacts |
| execution | complete | Artifacts written |
| validation | pending | Validator needs to run |
| validation | pass | All checks passed |
| validation | fail | One or more checks failed |
| verification | awaiting-human | Artifacts presented for human review |
| verification | approved | Human approved |
| verification | rejected | Human rejected, needs rework |
| — | halting | Retries exhausted, escalated to human |
| — | complete | Skill finished |

## Valid transitions

The transitions below describe the full path with all flags `"true"` (the defaults). Two flags can collapse paths:

- `human-clarification: "false"` — the builder writes the entire clarification path in one pass (`pending → awaiting-human → answered → complete`); the human is not consulted.
- `plan-creation: "false"` — the planning step is skipped entirely; transition goes from `clarification:complete → execution:pending`.

```
— : not-started                   → clarification : pending

clarification : pending            → clarification : awaiting-human
clarification : awaiting-human     → clarification : answered
clarification : answered           → clarification : follow-up
clarification : answered           → clarification : complete
clarification : follow-up          → clarification : awaiting-human
clarification : complete           → planning : pending           (when plan-creation is true)
clarification : complete           → execution : pending          (when plan-creation is false)

planning : pending                 → planning : awaiting-human
planning : awaiting-human          → planning : approved
planning : awaiting-human          → planning : revision-requested
planning : revision-requested      → planning : awaiting-human
planning : approved                → execution : pending

execution : pending                → execution : complete
execution : complete               → validation : pending

validation : pending               → validation : pass
validation : pending               → validation : fail
validation : pass                  → verification : awaiting-human   (if artefact-verification flag)
validation : pass                  → — : complete                    (if no artefact-verification flag)
validation : fail                  → execution : pending             (if retries left)
validation : fail                  → — : halting                     (if no retries)

verification : awaiting-human      → verification : approved
verification : awaiting-human      → verification : rejected
verification : approved            → — : complete
verification : rejected            → execution : pending             (increment attempt)
```

## Attempt counter

- Starts at 1
- Increments on validation fail with retry, and on verification rejected
- Never decreases
- Max defined by config (default: 3)
- Max reached + validation fail = halting


---

# Toolchain Schema

`toolchain.yaml` is the single source of truth for all tool configuration in an AI-DLC intent. Every pack skill reads from this file to determine which tool to invoke. No skill hardcodes tool commands — all commands come from toolchain.yaml or the language-specific tool adapter.

## When toolchain.yaml is populated

| Classification | Populated by | Timing |
|---------------|-------------|--------|
| Brownfield | `toolchain-discovery` meta-skill (auto-detects config files) | During `intent-bootstrap` |
| Mixed | `toolchain-discovery` meta-skill (detects existing tools, asks about gaps) | During `intent-bootstrap` |
| Greenfield | `requirements-analysis` skill (asks user to choose tools) | During inception phase |

For greenfield, `intent-bootstrap` creates a stub `toolchain.yaml` with only `language:` set. The remaining sections are populated during `requirements-analysis`.

## Full Schema

```yaml
# toolchain.yaml
# Path: aidlc-docs/<intent>/toolchain.yaml

language: string                    # primary language: python, typescript, java, go, rust, csharp, etc.
languages: [string]                 # all languages if multi-language project (including language above)

quality:
  static_analysis:
    tool: string                    # tool name: ruff, eslint, golangci-lint, checkstyle, pylint, etc.
    run_command: string             # command to execute (use {source_dir} as placeholder for source path)
    fix_command: string             # auto-fix command (null if not supported)
    config_file: string             # path to tool config file relative to repo root (null if not used)
    output_format: string           # json, text, sarif, checkstyle
    severity_mapping: {}            # map tool's severity labels to: error, warning, info

  security:
    sast:
      - tool: string                # SAST tool name: bandit, semgrep, spotbugs, gosec, etc.
        run_command: string         # command to execute
        severity_mapping: {}        # map tool's severity labels to: critical, high, medium, low
    sca:
      tool: string                  # SCA tool: pip-audit, npm-audit, owasp-dependency-check, trivy, etc.
      run_command: string           # command to execute
      fix_command: string           # command to auto-fix (upgrade deps), or null
    secrets:
      tool: string                  # secrets scanner: detect-secrets, trufflehog, gitleaks, etc.
      run_command: string           # command to execute
      baseline: string              # path to baseline/allowlist file (null if not used)

  testing:
    framework: string               # test framework: pytest, jest, junit, go-test, rspec, etc.
    unit_dir: string                # path to unit test directory relative to repo root
    integration_dir: string         # path to integration test directory (null if not separate)
    e2e_dir: string                 # path to e2e test directory (null if not present)
    unit_command: string            # command to run unit tests
    integration_command: string     # command to run integration tests (null if not separate)
    coverage_tool: string           # coverage tool: pytest-cov, istanbul, jacoco, go-cover, etc.
    coverage_command: string        # command to run tests with coverage collection
    coverage_output: string         # path to coverage report output file
    coverage_threshold_line: number # minimum line coverage % (default: 80)
    coverage_threshold_branch: number # minimum branch coverage % (default: 70)

  review:
    standards: [string]             # list of coding standards to enforce during code-review skill
                                    # examples: type-hints-required, docstrings-public-only, no-wildcard-imports

  max_remediation_attempts: number  # max auto-fix loop iterations before escalating to human (default: 3)

ci_cd:
  platform: string                  # CI/CD platform: github-actions, gitlab-ci, codepipeline, jenkins, argocd, etc.
  environments: [string]            # ordered environment names, e.g.: [dev, staging, prod]
  deploy_strategy: string           # deployment strategy: blue-green, canary, rolling, all-at-once
  artifact_registry: string         # container/package registry: ecr, ghcr, dockerhub, artifactory, etc.

monitoring:
  metrics: string                   # metrics platform: cloudwatch, datadog, prometheus, grafana, new-relic, etc.
  logging: string                   # logging platform: cloudwatch-logs, elk, splunk, loki, etc.
  tracing: string                   # tracing platform: x-ray, jaeger, zipkin, honeycomb, etc.
  alerting: string                  # alerting platform: pagerduty, opsgenie, cloudwatch-alarms, victorops, etc.

infrastructure:
  iac: string                       # IaC tool: cdk, terraform, pulumi, cloudformation, helm, bicep, etc.
  cloud_provider: string            # cloud provider: aws, azure, gcp, multi-cloud
  container_runtime: string         # container runtime: docker, podman, containerd (null if not containerized)
  container_registry: string        # where images are pushed: ecr, ghcr, dockerhub, gcr, acr, etc.

project_management:
  tasks: string                     # task tracker: jira, linear, asana, github-issues, trello, etc.
  docs: string                      # docs platform: confluence, notion, gitbook, github-wiki, etc.
  chat: string                      # team chat: slack, teams, discord, etc.

data:
  primary_db: string                # primary database: aurora-postgres, rds-postgres, dynamodb, mongodb, etc.
  cache: string                     # cache layer: elasticache-redis, elasticache-memcached, redis, etc.
  search: string                    # search engine: opensearch, elasticsearch, typesense, etc.
  migrations: string                # migration tool: alembic, flyway, prisma, knex, liquibase, etc.
  message_queue: string             # queue/stream: sqs, kafka, rabbitmq, kinesis, pubsub, etc.

compliance:
  frameworks: [string]              # compliance frameworks: soc2, hipaa, pci-dss, iso27001, gdpr, etc.
  license_policy:
    allowed: [string]               # approved open source licenses: mit, apache-2.0, bsd-2-clause, bsd-3-clause, isc
    prohibited: [string]            # prohibited licenses: gpl-2.0, gpl-3.0, agpl-3.0, lgpl (add as needed)

well_architected:                   # populated by well-architected pack (if active)
  enabled: boolean
  availability_target: string       # SLA target: "99.9%", "99.95%", "99.99%", etc.
  rto_minutes: number               # recovery time objective in minutes
  rpo_minutes: number               # recovery point objective in minutes
  monthly_budget_usd: number        # target monthly cloud spend in USD
  cloud_provider: string            # cloud provider context for pricing (aws, azure, gcp)
  sustainability:
    enabled: boolean                # whether sustainability-check skill is active

resilience:                         # populated by resilience pack (if active)
  load_test_tool: string            # load test tool: k6, locust, gatling, artillery, jmeter, wrk, etc.
  chaos_tool: string                # chaos tool: aws-fis, litmus, gremlin, or null
  target_environment: string        # environment to run tests against: staging, prod (requires approval)
  nfr_targets:
    p99_latency_ms: number          # p99 latency threshold in milliseconds
    throughput_rps: number          # target requests per second at peak
    error_rate_budget: number       # acceptable error rate fraction (e.g., 0.001 = 0.1%)
  load_test_duration:
    baseline: string                # e.g., "5m"
    ramp: string                    # e.g., "10m"
    peak: string                    # e.g., "15m"
    spike: string                   # e.g., "5m"
    soak: string                    # e.g., "30m"
  run_chaos: boolean
  run_dr_validation: boolean

design:                             # populated by wireframes skill (if UI project)
  figma: boolean                    # true if Figma MCP is available and user opted in
  figma_file_url: string            # URL of the Figma file with approved wireframes (null if not using Figma)
  design_system_library: string     # Figma library name or URL (null if no design system)
  wireframe_format: string          # figma, svg, html (what format wireframes are in)
```

## Guidance Notes

### Null values

Use `null` (not empty string) for fields that are not applicable. Tool adapter defaults apply when a field is null.

### Placeholders in commands

Use `{source_dir}`, `{unit_dir}`, `{integration_dir}`, `{e2e_dir}` as placeholders in command strings. The skill runner substitutes actual paths at execution time from other toolchain fields.

### Language-specific defaults

If `quality.static_analysis`, `quality.security`, or `quality.testing` fields are null, skills fall back to the language-specific tool adapter in `packs/quality-gates/tool-adapters/<language>.yaml`. Toolchain.yaml overrides take precedence over adapter defaults.

### Multi-language projects

For multi-language projects, `language` is the primary language (the one with the most code or the entry point). `languages` lists all languages. Quality gate skills run once per language listed and aggregate results.

### Stub vs. complete

A stub toolchain.yaml (greenfield intent-bootstrap output) has only `language:` set. All other fields are null. During `requirements-analysis`, the skill asks the user to choose tools for each null category. After requirements-analysis, the file should be complete (or have an explicit null with justification for truly optional categories).


---

# Workflow File Format

The workflow file is `workflow.md` in the intent directory. It is a simple text file — one skill invocation per line. Each line contains the skill name followed by input file paths separated by spaces.

```
<skill-name> <input-file-1> [<input-file-2> ...]
```

For construction-phase skills with `per-unit: "true"` that execute per-unit, add `--unit <unit-name>` after the skill name:

```
<skill-name> --unit <unit-name> <input-file-1> [<input-file-2> ...]
```

When `--unit` is present:
- Artifacts are written to `construction/<unit-name>/<skill-name>/` instead of `inception/<skill-name>/`
- The state key becomes `<skill-name>:<unit-name>` so the same skill can run independently for different units

For skills outside the inception phase that don't use `--unit`, add `--phase <phase-name>` after the skill name to route artifacts to the correct subtree:

```
<skill-name> --phase <phase-name> <input-file-1> [<input-file-2> ...]
```

When `--phase` is present:
- Artifacts are written to `<phase-name>/<skill-name>/` instead of the default `inception/<skill-name>/`
- Use this for `bootstrap` and `operations` skills

For skills that run multiple times within the same phase against different scopes (e.g., reverse-engineering one repo at a time), add `--scope <scope-name>` after the skill name:

```
<skill-name> --scope <scope-name> <input-file-1> [<input-file-2> ...]
```

When `--scope` is present:
- Artifacts are written to `<phase>/<skill-name>/<scope-name>/` instead of `<phase>/<skill-name>/`
- The state key becomes `<skill-name>:<scope-name>` so the same skill can run independently for different scopes
- `--scope` is phase-agnostic — it adds a subdirectory within whatever phase the skill belongs to

`--scope` is mandatory for `reverse-engineering` (always scoped to a repo name, even with a single repo).

For pack skills that need to identify their owning pack and route artifacts to pack-specific output paths, add `--pack <pack-name>` after the skill name:

```
<skill-name> --pack <pack-name> <input-file-1> [<input-file-2> ...]
```

`--pack` can be combined with `--unit` or `--phase` (but not `--scope`):

```
<skill-name> --unit <unit-name> --pack <pack-name> <input-file-1> [<input-file-2> ...]
<skill-name> --phase <phase-name> --pack <pack-name> <input-file-1> [<input-file-2> ...]
```

When `--pack` is present:
- Identifies which extension pack this skill belongs to (e.g., `quality-gates`, `operations`, `well-architected`, `resilience`)
- Determines the artifact output subdirectory within the phase tree:
  - `quality-gates` pack skills (per-unit): `construction/<unit>/quality/<skill-name>/`
  - `operations` pack skills: `operations/<skill-name>/`
  - `well-architected` pack skills: `construction/well-architected/<skill-name>/`
  - `resilience` pack skills: `operations/resilience/<skill-name>/`
  - Other packs: `<phase>/<pack-name>/<skill-name>/`
- The state key becomes `<skill-name>:<pack-name>` when the same skill name could exist in multiple packs
- Pack metadata in `SKILL.md` frontmatter (`pack: <pack-name>`) is authoritative; `--pack` in `workflow.md` is the runtime signal to the orchestrator confirming which pack is active for this invocation

`--pack` without `--unit` or `--phase` uses the skill's declared `phase` from its frontmatter.

`--phase`, `--unit`, and `--scope` are mutually exclusive with each other. `--pack` is additive and can be combined with `--unit` or `--phase`. `--unit` implies `construction`. `--scope` preserves the skill's declared phase.

Lines starting with `#` are comments. Empty lines are ignored.

## Bootstrap skills are not in workflow.md

`workflow.md` lists only downstream skills (inception, construction, operations). The two bootstrap skills (`intent-bootstrap` and `workflow-composition`) run via the orchestrator's bootstrap pre-loop and are never present in `workflow.md`:

- `intent-bootstrap` runs before `workflow.md` exists; it creates the file with one stub line for `workflow-composition`.
- `workflow-composition` reads that stub, then rewrites `workflow.md` from scratch with the chosen downstream skills.

By the time `process_checker` reads `workflow.md` to drive the standard skill loop, both bootstrap skills are already complete and the file contains only downstream skill lines.

## File extension

The file **must** be named `workflow.md`. `process_checker` looks for this exact filename.

## Example

```
# Inception phase
reverse-engineering --scope payments-api org-ai-kb/aidlc-docs/intent-001-ideation-portal/intent.md
reverse-engineering --scope shared-auth org-ai-kb/aidlc-docs/intent-001-ideation-portal/intent.md
requirements-analysis org-ai-kb/aidlc-docs/intent-001-ideation-portal/intent.md
user-stories org-ai-kb/aidlc-docs/intent-001-ideation-portal/inception/requirements-analysis/requirements.md
application-design org-ai-kb/aidlc-docs/intent-001-ideation-portal/inception/requirements-analysis/requirements.md org-ai-kb/aidlc-docs/intent-001-ideation-portal/inception/user-stories/stories.md org-ai-kb/aidlc-docs/intent-001-ideation-portal/inception/user-stories/personas.md

# Construction phase — per-unit skills
functional-design --unit recommendation-engine org-ai-kb/aidlc-docs/intent-001-ideation-portal/inception/units-generation/units-of-work.md org-ai-kb/aidlc-docs/intent-001-ideation-portal/inception/user-stories/stories.md org-ai-kb/aidlc-docs/intent-001-ideation-portal/inception/application-design/components.md
functional-design --unit data-collection org-ai-kb/aidlc-docs/intent-001-ideation-portal/inception/units-generation/units-of-work.md org-ai-kb/aidlc-docs/intent-001-ideation-portal/inception/user-stories/stories.md org-ai-kb/aidlc-docs/intent-001-ideation-portal/inception/application-design/components.md
```

Do not use markdown tables. Do not add headers or formatting. The script parses this file line by line.


---

# AI-DLC V2 skill: workflow-composition

---
name: aidlc-workflow-composition
description: |
  AI-DLC workflow-composition skill. Picks the skills that will run for this intent from the catalogue, sets per-skill flags, and appends the resulting lines to `workflow.md`.

  Invoked by `aidlc-orchestrator` immediately after `aidlc-intent-bootstrap`. Not normally invoked directly.
metadata:
  phase: bootstrap
  stage: workflow-composition
  per-unit: "false"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
---

# Workflow Composition

Compose the adaptive workflow for this intent by selecting skills from `skills/aidlc-orchestrator/CATALOGUE.md` and rewriting `workflow.md`. The artefact-verification step is the workflow-approval gate — the human approves the composed workflow before any inception-phase skill runs.

## Prerequisites

- `intent.md` at the intent root
- `bootstrap-context.md` in `bootstrap/intent-bootstrap/`

## Input

- `intent.md`
- `bootstrap-context.md`
- `skills/aidlc-orchestrator/CATALOGUE.md`

## Question Guidance

Apply §1 to evaluate every catalogue skill against the intent. Derive what you can; ask only on genuine ambiguity. Examples:

- Should reverse-engineering run? (skip if RE-kb is hydrated)
- For a tiny bug fix, should user-stories or application-design be skipped?
- Any per-skill flag overrides (`plan-verification`, `artefact-verification`)?

Additionally, evaluate lenses from the catalogue's "Lenses" section:

- Which lenses should be active for this intent? Present available lenses with their purpose and default-activation status.
- For lenses with `default-activation: "true"`, confirm activation unless the intent clearly doesn't warrant it (e.g., OWASP for a documentation-only change).
- For lenses with `default-activation: "false"`, ask whether the human wants to opt in.
- For each activated lens, ask the lens's own Question Guidance (from its SKILL.md) to tailor the lens to this intent. Record answers in `bootstrap/workflow-composition/lens-<lens-name>-answers.md`.

## 1. Composition Rules

1. Start from the catalogue; evaluate each skill against the intent. Never assume a fixed pipeline.
2. **Right-sizing principle.** Three skills are essentially always-on: `requirements-analysis`, `code-generation`, `build-and-test`. Everything else is conditional. Skip aggressively when the intent is narrow in scope, low in novelty, single-actor, single-component, or pure implementation. Include only when the skill's output would meaningfully shape what comes next. A workflow that has every skill is rarely the right answer.
3. When the right-sizing principle leaves you genuinely uncertain about a skill, lean toward including it.
4. Construction skills with `per-unit: "true"` run once per unit. With one unit, collapse them into a single pass.
5. The composed workflow is a recommendation, not a contract. The orchestrator may pause and insert a skipped skill mid-execution if needed.
6. Do not reference the examples in §3 by name when presenting the workflow — they are internal reasoning aids.
7. Only list skills that will execute. Do not list skipped skills.
8. Reverse engineering:
   - RE-kb hydrated for the affected repos → skip RE.
   - Otherwise → one `reverse-engineering` invocation per repo that needs analysis.
   - Greenfield with integration targets → RE those targets only.
   - Brownfield → RE included by default for affected repos.
9. **Human-facing vocabulary.** When presenting the workflow to the human, refer to each skill by its `stage` and `phase` from the catalogue (e.g. "user stories stage", "inception phase"). Use skill names only for internal reasoning and as disambiguators when one stage maps to multiple skills.

## 2. Presentation

Group the composition by phase → stage, in execution order. When one stage maps to one skill, the stage alone is enough. When multiple skills share a stage, list each as a sub-bullet with the skill name as disambiguator.

```
Proposed workflow

Inception phase
  1. Requirements analysis stage
  2. User stories stage
  3. Application design stage
  4. Units generation stage

Construction phase (per unit: <unit-name>)
  5. Functional design stage
  6. NFR assessment stage
  ...
```

## 3. Examples

Examples are arranged from minimal to maximal. Each notes what was **skipped** and why — that's where the right-sizing reasoning lives.

### A. Trivial bug fix — typo, off-by-one, missing null check (greenfield or brownfield)

**Workflow:** requirements-analysis → code-generation → build-and-test.

(For brownfield: prepend reverse-engineering for the affected repo if RE-kb is not hydrated.)

**Skipped:** user-stories (no new user-facing behaviour), application-design (no component changes), units-generation (one trivial change), functional-design (no new domain logic), nfr-assessment (no NFR shift), nfr-design, infrastructure-design.

### B. Simple single-component utility — calculator, string parser, CSV exporter, CLI tool

**Workflow:** requirements-analysis → code-generation → build-and-test.

**Skipped:** user-stories (one obvious actor, one happy path), application-design (single component, no orchestration), units-generation (one unit, trivially), functional-design (logic is the requirements), nfr-assessment (defaults are fine), nfr-design, infrastructure-design.

A calculator does not need a story map and a domain model. The requirements doc captures the operations; the build-and-test skill catches mistakes. If during code-generation a real ambiguity surfaces (rounding rules, error semantics), pause and insert functional-design — that's what rule 5 is for.

### C. Refactor with no behaviour change — rename, extract, restructure (brownfield)

**Workflow:** reverse-engineering → requirements-analysis → application-design → code-generation → build-and-test.

**Skipped:** user-stories (no behaviour change, hence no new stories), units-generation (single unit unless the refactor is huge), functional-design (business logic is preserved verbatim), nfr-assessment (NFRs don't change), nfr-design, infrastructure-design.

Application design is in because the whole point of a refactor is to change component boundaries.

### D. Small feature add to an existing service — new endpoint, new field, new validation rule (brownfield)

**Workflow:** reverse-engineering → requirements-analysis → user-stories → functional-design → code-generation → build-and-test.

**Skipped:** application-design (existing component boundaries are reused), units-generation (one unit — the existing service), nfr-assessment (NFRs inherited from the service unless the feature changes them), nfr-design, infrastructure-design.

Functional-design runs but with `--unit <existing-service-name>`, refining only the new business rules.

### E. New feature requiring a new component in an existing system (brownfield)

**Workflow:** reverse-engineering → requirements-analysis → user-stories → application-design → functional-design → nfr-assessment → code-generation → build-and-test.

**Skipped:** units-generation (the new component is the unit), nfr-design and infrastructure-design (only if the existing infra absorbs the new component without changes — otherwise include them).

### F. Migration — language, framework, database, or platform change (brownfield)

**Workflow:** reverse-engineering → requirements-analysis → application-design → functional-design → nfr-assessment → nfr-design → infrastructure-design → code-generation → build-and-test.

**Skipped:** user-stories (no new behaviour, just a different substrate), units-generation (existing component boundaries usually carry over).

NFR design and infrastructure design are mandatory in a migration: that's where the migration lives.

### G. Greenfield single-service system — small to medium scope

**Workflow:** requirements-analysis → user-stories → application-design → functional-design → nfr-assessment → nfr-design → infrastructure-design → code-generation → build-and-test.

**Skipped:** reverse-engineering (greenfield, no integration targets), units-generation (single unit).

Per-unit construction skills run once with `--unit <service-name>`.

### H. Greenfield multi-service system — full pipeline

**Workflow:** requirements-analysis → user-stories → application-design → units-generation → functional-design (per unit) → nfr-assessment (per unit) → nfr-design (per unit) → infrastructure-design (per unit) → code-generation (per unit) → build-and-test.

**Skipped:** reverse-engineering, unless the system integrates with existing repos that aren't in RE-kb — in which case RE those repos first.

This is the textbook full pipeline. Most intents are not this; reach for it only when units-generation actually produces multiple units.

### I. Cross-repo brownfield change — touching two or more existing repos

**Workflow:** reverse-engineering (one per affected repo) → requirements-analysis → user-stories (if user-facing) → application-design → functional-design (per unit) → nfr-assessment (per unit) → code-generation (per unit) → build-and-test.

**Skipped:** units-generation (the affected repos *are* the units; map them directly), nfr-design and infrastructure-design (include only if cross-repo NFRs or shared infra change).

User-stories and application-design earn their place when the change spans repo boundaries — that's where the seams of the change get pinned down.

## 4. Extension Pack Activation

After composing the stage skill workflow, evaluate extension packs from `packs/` (or the CATALOGUE's Extension Packs section):

### Pack activation rules

1. **quality-gates** — ALWAYS active. Inject after each `code-generation` step. Order: static-analysis → security-scan → build-and-test → coverage-enforcement → code-review.
2. **operations** — Active when `toolchain.yaml` has `ci_cd` or `deployment` sections, OR user mentions deploy/ship/release in the intent.
3. **resilience** — Active only when user explicitly requests load/stress/chaos testing, OR NFR targets include performance capacity numbers.
4. **data-management** — Active when `data-discovery` meta-skill identified existing data sources requiring migration, seeding, or quality validation.
5. **maintenance** — NOT activated during initial build. Activated event-triggered post-build (bug reports, dependency alerts).
6. **governance** — Active when user indicates regulated environment during requirements, OR `toolchain.yaml` has `compliance` section.
7. **integration** — Active when `toolchain.yaml` has `project_management`, `documentation`, or `communication` sections.

### Pack activation questions (ask during composition)

For packs where activation is ambiguous:

- "Should I include deployment and release management in this workflow? (You mentioned deploying to [environment])"
- "I detected [Jira/Confluence/Slack] in your toolchain. Should I sync progress to these tools after each stage?"
- "Are there compliance requirements (SOC2, HIPAA, PCI) that require audit trail and evidence collection?"
- "Do you need load/stress testing as part of this workflow, or will that be a separate exercise later?"

### Pack injection points in workflow.md

Pack skills are written into `workflow.md` at their designated trigger points:

```
# After code-generation (per unit) — quality-gates pack:
code-generation --unit api-service
static-analysis --unit api-service --pack quality-gates
security-scan --unit api-service --pack quality-gates
build-and-test --unit api-service --pack quality-gates
coverage-enforcement --unit api-service --pack quality-gates
code-review --unit api-service --pack quality-gates

# After all construction — operations pack:
deployment-design --pack operations
deploy --pack operations --env staging
smoke-test --pack operations
release-management --pack operations

# User-triggered — resilience pack:
load-test-design --pack resilience
load-test-execute --pack resilience
chaos-engineering --pack resilience

# Alongside functional/infra design — data-management pack:
data-migration --pack data-management
data-seeding --pack data-management
data-quality --pack data-management
```

### Meta-skill invocations (NOT in workflow.md)

Meta-skills are NOT listed in workflow.md. They are invoked on-demand:
- `toolchain-discovery` — called by intent-bootstrap to produce `toolchain.yaml`
- `data-discovery` — called during application-design when data entities identified
- `knowledge-acquisition` — called by any skill encountering unfamiliar tech

## Output

### workflow.md (rewritten at the intent root)

When this skill runs, `workflow.md` is a stub containing only the line that invoked this skill. Rewrite it from scratch with one line per chosen downstream skill, in execution order, per `aidlc-workflow-format.md`. Do not retain the bootstrap stub line; the first line must be a real downstream skill (typically `requirements-analysis` or `reverse-engineering`).

Routing flags are required for non-inception skills, per `aidlc-workflow-format.md`: construction skills use `--unit <unit>` (per-unit) or `--phase construction` (single pass); operations skills use `--phase operations`; inception skills omit both.

### intent-state.md — Active Lenses table

Write the `## Active Lenses` table to `intent-state.md` with one row per activated lens. Format per `aidlc-state-schema.md`. This table is the orchestrator's source for lens injection throughout the intent.

### lens-<lens-name>-answers.md (in this skill's output dir, one per activated lens)

For each activated lens that has Question Guidance, record the one-time clarification answers. These files are passed to the builder alongside the lens's SKILL.md on every invocation.

### workflow-rationale.md (in this skill's output dir)

One short bullet per skill explaining inclusion or skip, grouped by phase. Additionally, one bullet per lens explaining activation or deactivation.

## Validation

See `validation-spec.md`.
