---
name: aidlc-release-management
description: |
  Version bump (semver), changelog generation, git tagging, and release publication.
  Tool-agnostic: supports semantic-release, git-cliff, conventional-changelog, or manual.
  Runs after production smoke tests pass.
metadata:
  phase: operations
  stage: release-management
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: operations
  max-attempts: 2
---

# Release Management

Manage the versioning and release publication after a successful production deployment. Determines the next version, generates the changelog, creates the git tag, and publishes a release.

## Inputs

- `aidlc-docs/<intent>/toolchain.yaml` → `deployment.release_strategy` and `deployment.changelog_tool`
- Git log since last tag (commit messages, PR titles)
- `aidlc-docs/<intent>/inception/stories.md` (for release notes context)

## Execution

### Step 1: Determine Next Version

Read `toolchain.yaml` → `deployment.release_strategy`:
- **semver**: analyze commits since last tag → determine bump (major/minor/patch)
  - `feat!:` or `BREAKING CHANGE:` → major
  - `feat:` → minor
  - `fix:`, `perf:`, `refactor:` → patch
- **calendar-ver**: use current date (e.g., `2024.01.15`)
- **custom**: follow user-specified pattern

If no commits since last tag → ask human: "No new commits since last release. Should I still create a release?"

### Step 2: Generate Changelog

Based on configured tool:
- **git-cliff**: `git cliff --tag <version> --output CHANGELOG.md`
- **semantic-release**: runs as part of CI pipeline
- **conventional-changelog**: `npx conventional-changelog -p angular -i CHANGELOG.md -s`
- **manual / none**: generate from commit log with standard format

Changelog format:
```markdown
## [1.2.0] - 2024-01-15

### Added
- User preferences management (story: USR-004)
- Bulk order import API (story: ORD-012)

### Fixed
- Race condition in payment processing (story: PAY-003)

### Changed
- Upgraded PostgreSQL driver to 3.1.0
```

### Step 3: Human Clarification

Present the proposed version and changelog excerpt:
```markdown
## Proposed Release

**Version:** 1.2.0 (minor bump — 2 new features, 1 bug fix)
**Previous:** 1.1.3

**Changelog preview:**
[first 20 lines of generated changelog]

**Release notes template:**
[generated from stories — user fills in highlights]

Approve release as 1.2.0? (yes / bump-major / bump-patch / custom-version / cancel)
```

### Step 4: Create Release

After human approval:
1. Update version in project manifest (package.json, pyproject.toml, pom.xml, go.mod, etc.)
2. Write/update `CHANGELOG.md`
3. Commit: `chore(release): v<version>`
4. Create git tag: `git tag -a v<version> -m "Release v<version>"`
5. Push tag: `git push origin v<version>`
6. Create GitHub/GitLab release (if configured): attach changelog, link to deployed artefacts

## Outputs

- Updated `CHANGELOG.md` in project root
- Updated version in project manifest
- Git tag `v<version>` pushed to remote
- GitHub/GitLab release created (if configured)
- `aidlc-docs/<intent>/operations/release-<version>.md` (release summary)

## Escalation

If changelog tool fails or produces unexpected output:
- Fall back to manual format from git log
- Present to human before tagging
- Never skip versioning — it is always a human-confirmed action
