---
slug: supply-chain-security
phase: construction
execution: CONDITIONAL
condition: Execute when the project produces deployable artifacts (containers, packages, binaries) that need provenance and integrity verification.
lead_agent: aidlc-devsecops-agent
support_agents:
  - aidlc-pipeline-deploy-agent
mode: inline
produces:
  - sbom
  - provenance-attestation
  - artifact-signing-report
  - supply-chain-questions
consumes:
  - artifact: ci-config
    required: true
  - artifact: code-summary
    required: true
requires_stage:
  - ci-pipeline
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - security-patch
inputs: CI pipeline configuration, built artifacts, dependency manifests
outputs: aidlc-docs/governance/supply-chain-security/sbom.md, aidlc-docs/governance/supply-chain-security/provenance-attestation.md, aidlc-docs/governance/supply-chain-security/artifact-signing-report.md
---

# Supply Chain Security

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-devsecops-agent persona from `agents/aidlc-devsecops-agent.md` and knowledge from `{{HARNESS_DIR}}/knowledge/aidlc-devsecops-agent/`.

### Step 2: Generate SBOM

Produce Software Bill of Materials using appropriate tool:
- Container images: `syft <image>` → CycloneDX/SPDX format
- Node.js: `cyclonedx-npm` or `@cyclonedx/bom`
- Python: `cyclonedx-py` or `pip-audit --format cyclonedx`
- Java: CycloneDX Maven/Gradle plugin

SBOM must include: all direct + transitive dependencies, versions, licenses, package URLs (purl).

### Step 3: Verify Build Provenance (SLSA)

Check CI pipeline for provenance generation:
- **SLSA Level 1:** Build process documented (exists in CI config)
- **SLSA Level 2:** Version-controlled build service (GitHub Actions/CodeBuild, not local)
- **SLSA Level 3:** Hardened build platform (isolated, parameterless, hermetic)

Verify: build inputs are fully declared, build is reproducible, no manual steps between source and artifact.

### Step 4: Artifact Signing

Verify or configure artifact signing:
- Container images: cosign sign with keyless (Sigstore/Fulcio) or KMS key
- Packages: npm provenance, PyPI trusted publishers
- Commits: verify GPG/SSH signing on release commits
- Lock file integrity: verify lock file hash matches registry metadata (detect tampering)

### Step 5: Dependency Provenance

For each dependency:
- Verify it comes from expected registry (not typosquatting)
- Check publish history (new maintainer? sudden ownership transfer?)
- Verify no dependency confusion (private package name exists on public registry)
- Check for known malicious packages in dependency tree

### Step 6: Generate Report

Create `artifact-signing-report.md`:
- SBOM generation status and location
- SLSA level achieved
- Signing status per artifact type
- Lock file integrity verification
- Supply chain risk findings
- Recommendations for improvement

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :chains:
- Summary of sbom, provenance-attestation, artifact-signing-report
- Review path: `<record>/construction/supply-chain-security/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun {{HARNESS_DIR}}/tools/aidlc-orchestrate.ts report --stage supply-chain-security --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/construction/supply-chain-security/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/supply-chain-security/required-sections-<iso>.md`.

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
