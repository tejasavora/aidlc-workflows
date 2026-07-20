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

Load aidlc-devsecops-agent persona from `agents/aidlc-devsecops-agent.md` and knowledge from `.claude/knowledge/aidlc-devsecops-agent/`.

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

### Step 7: Update State

Mark supply-chain-security as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :chains:
Review path: `aidlc-docs/governance/supply-chain-security/`
Standard 2-option approval (Approve / Request Changes).
