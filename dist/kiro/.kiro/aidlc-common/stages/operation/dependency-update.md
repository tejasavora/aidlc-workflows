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

Load aidlc-devsecops-agent persona from `agents/aidlc-devsecops-agent.md` and knowledge from `.claude/knowledge/aidlc-devsecops-agent/`.

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

### Step 7: Update State

Mark dependency-update as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :package:
Review path: `aidlc-docs/maintenance/dependency-update/`
Standard 2-option approval (Approve / Request Changes).
