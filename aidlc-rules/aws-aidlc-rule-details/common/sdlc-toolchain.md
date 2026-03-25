# SDLC Toolchain Integration

## Purpose
Discover and integrate with the team's external SDLC tools (source control, project management, CI/CD, documentation). If no external tools are configured, all stages work local-only — this rule adds sync behavior, it does not gate progress.

## MANDATORY: Toolchain Discovery

During **Workspace Detection**, after creating `aidlc-state.md`, check for existing toolchain configuration. If none exists, generate toolchain discovery questions.

### Discovery Questions

Create `aidlc-docs/inception/toolchain-questions.md`:

```markdown
## SDLC Toolchain Configuration

Configure your team's development tools. Select "None" for any category you don't use — AI-DLC works fully local without external tools.

### Source Control Platform
Where does your team host code repositories?
A) GitHub
B) GitLab
C) Bitbucket
D) AWS CodeCommit
E) None — local git only

[Answer]:

### Project Management Tool
Where does your team track stories, tasks, and sprints?
A) JIRA (Atlassian)
B) Linear
C) Azure DevOps
D) GitHub Issues / Projects
E) None — local markdown only

[Answer]:

### CI/CD Pipeline
How does your team build, test, and deploy?
A) GitHub Actions
B) GitLab CI
C) Jenkins
D) AWS CodePipeline / CodeBuild
E) None — local builds only

[Answer]:

### Documentation Platform
Where does your team publish documentation?
A) Confluence (Atlassian)
B) Notion
C) GitHub Wiki
D) None — local markdown only

[Answer]:

### Communication Channel
Where should the AI agent post status updates and notifications?
A) Slack
B) Microsoft Teams
C) None — no automated notifications

[Answer]:
```

### Recording Configuration

After answers are collected, record in `aidlc-docs/aidlc-state.md` under a new section:

```markdown
## SDLC Toolchain
| Category | Tool | Status |
|----------|------|--------|
| Source Control | [selected tool or "local-only"] | configured / not-configured |
| Project Management | [selected tool or "local-only"] | configured / not-configured |
| CI/CD | [selected tool or "local-only"] | configured / not-configured |
| Documentation | [selected tool or "local-only"] | configured / not-configured |
| Communication | [selected tool or "none"] | configured / not-configured |
```

Status is `configured` when the tool is accessible (MCP server connected, CLI authenticated, or API reachable). Status is `not-configured` if selected but not yet accessible — log a warning and continue.

## Tool Access Methods

The AI agent interacts with external tools through one of these methods (in priority order):

1. **MCP Servers** (preferred) — if an MCP server is configured for the tool, use it directly
   - GitHub: `github/github-mcp-server`
   - JIRA/Confluence: `atlassian/atlassian-mcp-server`
   - Slack: community Slack MCP server
2. **CLI Tools** — if no MCP server but CLI is available
   - GitHub: `gh` CLI
   - GitLab: `glab` CLI
   - JIRA: `jira` CLI
   - AWS: `aws` CLI (for CodePipeline, CodeBuild, CodeCommit)
3. **Manual Instructions** — if neither MCP nor CLI is available, generate instructions for the user to execute manually

Before using any tool, verify access:
- MCP: check if the MCP server is listed in the agent's configured servers
- CLI: run a basic command (e.g., `gh auth status`, `jira me`)
- If access fails, log the failure in audit.md and fall back to the next method

## Stage Sync Behaviors

Each sync is **conditional** — only executes if the relevant tool is configured and accessible. If the tool is "local-only" or "none", skip the sync silently (no warning, no error). Log all syncs in `audit.md`.

### Inception Phase Syncs

**After Requirements Analysis approved:**
- Source Control: commit `aidlc-docs/inception/requirements/` and push
- Project Management: create a project/board for the initiative (if new project)

**After User Stories approved:**
- Project Management: create epics and stories from `stories.md`
  - Map each epic to a JIRA epic (or equivalent)
  - Map each story to a JIRA story with acceptance criteria
  - Set priority from story priority field
  - Link stories to epics
- Source Control: commit `aidlc-docs/inception/user-stories/` and push

**After Units Generation approved:**
- Project Management: create unit labels/components, assign stories to units
- Source Control: commit `aidlc-docs/inception/application-design/` and push

**After Workflow Planning approved:**
- Source Control: commit `aidlc-docs/inception/plans/` and push
- Communication: post summary to configured channel ("Inception complete — [N] requirements, [M] stories, [K] units planned")

### Construction Phase Syncs

**After each Functional Design / NFR / Infrastructure Design approved (per unit):**
- Source Control: commit `aidlc-docs/construction/{unit-name}/` and push

**After Code Generation complete (per unit):**
- Source Control: commit generated code, push branch, open PR/MR
  - Branch naming: `feat/{unit-name}` (e.g., `feat/inventory-service`)
  - PR title: "feat: {unit-name} — code generation complete"
  - PR body: list of stories implemented, files changed, test summary
- Project Management: transition stories to "In Review" status
- Communication: post to channel ("Unit {name} code generation complete — PR #{number} open for review")

**After Build & Test complete:**
- CI/CD: trigger pipeline if configured (instead of local-only build)
  - If GitHub Actions: the PR push should trigger the workflow automatically
  - If Jenkins/CodePipeline: trigger the pipeline via CLI/API
  - Wait for pipeline result and include in completion message
- Project Management: transition stories to "Done" when tests pass
- Source Control: commit build artifacts and test results
- Communication: post final status ("Build & Test complete — [pass/fail], [N] tests, [coverage]%")

### Deployment Sync

**After deployment approved (Build & Test Step E4):**
- CI/CD: trigger deployment pipeline (preferred over local `cdk deploy`)
- Source Control: tag the deployment (`v0.1.0-workshop`)
- Project Management: update epic status to "Deployed"
- Communication: post deployment notification with endpoint URLs

## Handling Failures

- If a sync fails (e.g., JIRA API returns 401), log the failure in `audit.md` with the error
- Do NOT block the stage — syncs are non-blocking side-effects
- Present a warning to the user: "JIRA sync failed: [reason]. Stories were not created in JIRA. You can sync manually later."
- Continue to the next stage

## Handling Missing MCP / CLI

If a tool is selected but no MCP server or CLI is available:
1. Generate a manual instruction set in `aidlc-docs/toolchain-manual-steps.md`
2. Instructions include: what to create, where, with what content (copy-pasteable)
3. Present to the user: "Automated [tool] sync is not available. See `toolchain-manual-steps.md` for manual instructions."
4. Mark the sync as `manual` in audit.md

## State File Updates

After each sync, update `aidlc-docs/aidlc-state.md`:

```markdown
## SDLC Sync Log
| Timestamp | Stage | Tool | Action | Status |
|-----------|-------|------|--------|--------|
| [ISO 8601] | User Stories | JIRA | Created 12 stories, 3 epics | success |
| [ISO 8601] | Code Generation | GitHub | Opened PR #4 on feat/inventory-service | success |
| [ISO 8601] | Build & Test | GitHub Actions | Triggered workflow run #12 | success |
```
