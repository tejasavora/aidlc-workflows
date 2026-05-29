# Workflow Composition — Validation Spec

## Inputs

- Artifacts: `workflow.md` (at intent root), `workflow-rationale.md`, `lens-<lens-name>-answers.md` (one per activated lens, if applicable)
- Answered question file: `workflow-composition-questions.md`
- Upstream: `intent.md`, `bootstrap-context.md`, `skills/aidlc-orchestrator/CATALOGUE.md`
- State: `intent-state.md` (for Active Lenses and Active Packs tables)

## Rules

1. `workflow.md` must exist at the intent root and contain at least one non-comment, non-empty line.
2. `workflow.md` must NOT contain any `intent-bootstrap` or `workflow-composition` lines — by the time this skill writes the file, both bootstrap skills have completed. Every line must be a downstream skill.
3. Every skill name in `workflow.md` must exist in `CATALOGUE.md` OR in an active pack's skills directory (`packs/<pack-name>/skills/<skill-name>/`).
4. Every line must follow `aidlc-workflow-format.md` syntax — skill name first, optional `--phase`/`--unit`/`--pack` flags, then input file paths.
5. Construction-phase skills in `workflow.md` must include either `--phase construction` (single-pass) or `--unit <unit-name>` (per-unit fan-out, which implies construction). Operations-phase skills must include `--phase operations`. Pack skills must include `--pack <pack-name>`. Inception-phase skills must omit all flags. This routes artifacts to the correct subtree per the folder-structure convention.
6. `workflow-rationale.md` must include a bullet for each downstream skill explaining inclusion or skip, a bullet for each lens explaining activation or deactivation, and a bullet for each pack explaining activation or skip.
7. The `## Active Lenses` table in `intent-state.md` must list every activated lens. Every lens listed must exist in `CATALOGUE.md` under the Lenses section.
8. For each activated lens that has Question Guidance in its SKILL.md, a corresponding `lens-<lens-name>-answers.md` file must exist in the workflow-composition output directory with answers filled in.
9. The `## Active Packs` table in `intent-state.md` must list every activated pack. Every pack listed must have a corresponding directory under `packs/<pack-name>/`.
10. Pack skills tagged with `--pack <pack-name>` in `workflow.md` must appear at their correct trigger point (e.g., quality-gates after code-generation, operations after all construction).
