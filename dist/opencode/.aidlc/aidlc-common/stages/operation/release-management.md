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

Load aidlc-pipeline-deploy-agent persona from `agents/aidlc-pipeline-deploy-agent.md` and knowledge from `.claude/knowledge/aidlc-pipeline-deploy-agent/`.

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

### Step 7: Update State

Mark release-management as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :label:
Review path: `aidlc-docs/operation/release-management/`
Standard 2-option approval (Approve / Request Changes).
