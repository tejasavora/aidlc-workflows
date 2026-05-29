---
name: aidlc-intent-bootstrap
description: |
  AI-DLC intent-bootstrap skill. Owns the entire act of bootstrapping an intent: confirms the org-ai-kb location, generates and confirms the intent slug, picks the next intent number, creates the intent directory and its skeleton files (`intent-prompt.md`, `state/intent-state.md`, `audit/intent-audit.md`, stub `workflow.md`), classifies greenfield/brownfield, and writes a structured `intent.md` and `bootstrap-context.md` for downstream skills.

  Invoked by `aidlc-orchestrator` as the first pre-loop step of every intent. Not normally invoked directly.
metadata:
  phase: bootstrap
  stage: intent-bootstrap
  per-unit: "false"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "false"
---

# Intent Bootstrap

Bootstrap an intent end-to-end: create the directory and skeleton files every later skill depends on, classify the intent, and produce `intent.md` and `bootstrap-context.md`. This skill runs before `workflow.md` exists, so it owns everything required to bring an intent into existence.

## Inputs

The orchestrator passes:

- The verbatim intent statement
- The workspace root path
- Any context the human has volunteered (typically nothing)

There is no input file — `intent-prompt.md` does not yet exist; this skill creates it.

## Question Guidance

Ask only what cannot be inferred. In order:

- **org-ai-kb location** — only if it does not yet exist and was not volunteered. Default `<workspace-root>/org-ai-kb/`.
- **Slug** — present the auto-generated kebab-case slug; offer to override.
- **Classification** — greenfield, brownfield, or mixed. Confirm only if non-trivial.
- **Repos in scope** — brownfield/mixed only.
- **RE-kb status / reverse-engineering need** — "Do you have an existing reverse-engineering knowledge base (RE-kb) for the repos in scope, or do you want to reverse-engineer them now?" Brownfield/mixed only.
- **Intent type** — feature, bug fix, migration, refactor, prototype, etc.

For greenfield with no RE-kb, slug + type may be all that's worth asking.

## Plan

`plan-creation: "false"` — no plan file produced. Execution follows the steps below directly.

## Execution

1. Ensure `org-ai-kb/aidlc-docs/` exists.
2. Pick the next `<nnn>` (zero-padded) by listing existing `intent-*` directories.
3. Create `intent-<nnn>-<slug>/` with subfolders `state/`, `audit/`, `bootstrap/intent-bootstrap/`.
4. Write `intent-prompt.md` (verbatim prompt) at the intent root.
5. Initialise `state/intent-state.md` with the header from `aidlc-state-schema.md`.
6. Initialise `audit/intent-audit.md` with a header.
7. Write `workflow.md` with exactly one line:
   ```
   workflow-composition --phase bootstrap intent.md bootstrap/intent-bootstrap/bootstrap-context.md
   ```
   No `intent-bootstrap` line — by the time `process_checker` reads `workflow.md`, this skill has finished.
8. Write `intent.md` at the intent root.
9. Write `bootstrap-context.md` in `bootstrap/intent-bootstrap/`.

### Step 10: Invoke Toolchain Discovery

**If classification is brownfield or mixed:**
1. Invoke the `toolchain-discovery` meta-skill (located at `packs/meta-skills/toolchain-discovery/`).
2. `toolchain-discovery` scans the project workspace for config files and produces `toolchain.yaml` with all detected tools.
3. Write the resulting `toolchain.yaml` to `aidlc-docs/<intent>/toolchain.yaml`.
4. Record in `bootstrap-context.md`: toolchain detection method (auto-detected), number of tool categories detected.

**If classification is greenfield:**
1. Create a stub `toolchain.yaml` at `aidlc-docs/<intent>/toolchain.yaml` with only the `language:` field:
   ```yaml
   # toolchain.yaml — stub for greenfield project
   # Full toolchain configuration will be completed during requirements-analysis.
   language: <detected-from-intent-or-ask>
   ```
2. To detect `language`: inspect the intent statement for language mentions (Python, TypeScript, Go, Java, etc.). If unambiguous, populate it. If ambiguous or absent, ask the human as a single additional question before writing the stub.
3. Note in `bootstrap-context.md`: "toolchain.yaml is a stub — full configuration deferred to requirements-analysis."

## Output

### intent.md (intent root)

- **Prompt** — verbatim
- **Summary** — one paragraph
- **Slug**
- **Type** — feature, bug fix, migration, refactor, prototype, etc.

### bootstrap-context.md (in `bootstrap/intent-bootstrap/`)

- **Classification** — greenfield / brownfield / mixed (with rationale)
- **Repos in scope** — list, or "none"
- **RE-kb status** — hydrated / partial / missing per repo, or "n/a"
- **Reverse-engineering** — needed (per repo) or not needed

### toolchain.yaml (at intent root `aidlc-docs/<intent>/toolchain.yaml`)

- **Brownfield / mixed**: fully populated by `toolchain-discovery` meta-skill (all detected tool categories)
- **Greenfield**: stub with only `language:` field set; marked for completion during requirements-analysis

## Return value

Return to the orchestrator: `status: complete`, `intent_dir_path`, and the list of artefacts produced. Include `toolchain_stub: true` in the return value for greenfield intents so the orchestrator knows to complete toolchain configuration during requirements-analysis.

## Validation

See `validation-spec.md`.
