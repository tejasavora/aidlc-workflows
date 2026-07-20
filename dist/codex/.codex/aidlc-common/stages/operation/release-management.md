---
slug: release-management
phase: operation
execution: CONDITIONAL
condition: Execute when the project uses versioned releases (semver, calver) and needs structured release artifacts. Skip for continuous deployment without versioning.
lead_agent: aidlc-pipeline-deploy-agent
support_agents:
  - aidlc-developer-agent
mode: inline
produces:
  - release-notes
  - release-artifacts
  - release-management-questions
consumes:
  - artifact: deployment-log
    required: true
  - artifact: ci-config
    required: false
requires_stage:
  - deployment-execution
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - security-patch
  - workshop
inputs: Deployment log from deployment-execution, CI config from ci-pipeline, git history
outputs: aidlc-docs/operation/release-management/release-notes.md, aidlc-docs/operation/release-management/release-artifacts.md, aidlc-docs/operation/release-management/release-management-questions.md
---

# Release Management

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-pipeline-deploy-agent persona from `agents/aidlc-pipeline-deploy-agent.md` and knowledge from `.codex/knowledge/aidlc-pipeline-deploy-agent/`.

### Step 2: Load Prior Context

- Read deployment log from `aidlc-docs/operation/deployment-execution/`
- Read CI config from `aidlc-docs/construction/ci-pipeline/`
- Read git log since last release tag

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What versioning scheme to use (semver, calver, custom)?
- What changelog format (Keep a Changelog, Conventional Commits, custom)?
- Should a GitHub/GitLab release be created automatically?
- What release artifacts to publish (binaries, Docker images, packages)?
- What communication channels to notify on release (Slack, email, release page)?

Follow stage-protocol.md question flow.

### Step 4: Determine Version

Based on versioning scheme and changes since last release:
- **Semver**: analyze commits for breaking changes (major), new features (minor), or fixes (patch)
- **Calver**: use current date-based format
- Read conventional commit messages to classify: feat → minor, fix → patch, BREAKING CHANGE → major

### Step 5: Generate Release Artifacts

Create release artifacts:
1. **Version bump**: update version in package.json, pyproject.toml, Cargo.toml, etc.
2. **Changelog**: generate from git log (grouped by type: features, fixes, breaking changes)
3. **Git tag**: create annotated tag (e.g., `v1.2.0`)
4. **Release notes**: human-readable summary of what's in this release
5. **GitHub/GitLab release**: create release with notes and attached artifacts (if configured)

### Step 6: Generate Results

Create `release-notes.md`:
- Version number and release date
- Summary of changes (features, fixes, breaking changes)
- Migration guide (if breaking changes exist)
- Contributors
- Full changelog (commit-level detail)

Create `release-artifacts.md`:
- Version bumped files
- Tag created
- Release URL (if published)
- Published packages/images (if applicable)

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :label:
- Summary of release-notes, release-artifacts
- Review path: `<record>/operation/release-management/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .codex/tools/aidlc-orchestrate.ts report --stage release-management --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/release-management/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/release-management/required-sections-<iso>.md`.

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
