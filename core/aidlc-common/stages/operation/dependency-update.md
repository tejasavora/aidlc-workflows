---
slug: dependency-update
phase: operation
execution: CONDITIONAL
condition: Execute when dependency vulnerabilities are reported (Dependabot, npm audit, pip-audit), or when dependencies are significantly outdated. Event-triggered.
lead_agent: aidlc-devsecops-agent
support_agents:
  - aidlc-developer-agent
  - aidlc-quality-agent
mode: inline
produces:
  - dependency-report
  - update-plan
  - dependency-update-questions
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
  - security-patch
inputs: Vulnerability report or staleness analysis, existing dependency manifest
outputs: aidlc-docs/maintenance/dependency-update/dependency-report.md, aidlc-docs/maintenance/dependency-update/update-plan.md, aidlc-docs/maintenance/dependency-update/dependency-update-questions.md
---

# Dependency Update

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-devsecops-agent persona from `agents/aidlc-devsecops-agent.md` and knowledge from `{{HARNESS_DIR}}/knowledge/aidlc-devsecops-agent/`.

### Step 2: Audit Current Dependencies

Run dependency audit tools:
- Python: `pip-audit`, `safety check`, `pip list --outdated`
- Node.js: `npm audit`, `npx npm-check-updates`
- Java: `mvn versions:display-dependency-updates`, OWASP Dependency-Check
- Go: `govulncheck`, `go list -m -u all`
- .NET: `dotnet list package --vulnerable --outdated`

### Step 3: Classify Updates

For each dependency needing update:
- **Critical**: known CVE with CVSS ≥ 9.0, actively exploited → immediate
- **High**: known CVE with CVSS 7.0-8.9 → within days
- **Medium**: known CVE with CVSS 4.0-6.9, or major version behind → planned
- **Low**: minor/patch behind, no CVEs → batch with next release

### Step 4: Generate Update Plan

Create `update-plan.md`:
- Prioritized update list (critical first)
- For each update:
  - Package name, current version → target version
  - CVE ID and CVSS score (if vulnerability-driven)
  - Breaking changes in the new version (from changelog)
  - Code changes needed (API migrations, config changes)
  - Test impact (which tests might break)
- Recommended update order (respect dependency tree)
- Rollback approach per update

### Step 5: Execute Updates (with verification)

For each update in priority order:
1. Update dependency in manifest
2. Run build to verify compilation
3. Run tests to verify compatibility
4. If tests fail: check changelog for migration steps, apply them, re-test
5. If still failing after migration: flag for human decision (downgrade vs. code change)

### Step 6: Generate Report

Create `dependency-report.md`:
- Total dependencies audited
- Vulnerabilities found by severity
- Updates applied successfully
- Updates that require code changes (with migration guide)
- Updates deferred (with justification)
- Remaining risk assessment

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :package:
- Summary of dependency-report, update-plan
- Review path: `<record>/operation/dependency-update/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun {{HARNESS_DIR}}/tools/aidlc-orchestrate.ts report --stage dependency-update --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/dependency-update/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/dependency-update/required-sections-<iso>.md`.

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
- Verification check → new manifest at `{{HARNESS_DIR}}/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
