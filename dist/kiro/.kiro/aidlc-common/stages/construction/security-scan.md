---
slug: security-scan
phase: construction
execution: ALWAYS
condition: Always executes after code generation — SAST, SCA, and secrets scanning with auto-remediation.
lead_agent: aidlc-devsecops-agent
support_agents:
  - aidlc-quality-agent
mode: inline
produces:
  - security-scan-report
  - security-scan-questions
consumes:
  - artifact: code-generation-plan
    required: true
  - artifact: code-summary
    required: true
  - artifact: security-requirements
    required: false
requires_stage:
  - code-generation
workspace_requires: true
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - security-patch
  - workshop
inputs: Generated code from code-generation stage, security requirements from nfr-requirements (if exists)
outputs: aidlc-docs/construction/security-scan/security-scan-report.md, aidlc-docs/construction/security-scan/security-scan-questions.md
---

# Security Scan

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-devsecops-agent persona from `agents/aidlc-devsecops-agent.md` and knowledge from `.kiro/knowledge/aidlc-devsecops-agent/`.

### Step 2: Detect Security Tooling

Read project configuration to detect security tools:
- **SAST**: semgrep, bandit (Python), CodeQL, Snyk Code, SonarQube
- **SCA**: pip-audit, npm audit, Trivy, Snyk, Dependabot, Safety
- **Secrets**: detect-secrets, TruffleHog, Gitleaks, git-secrets

If no tools are detected, select defaults based on language:
- Python: bandit + pip-audit + detect-secrets
- TypeScript/JS: semgrep + npm audit + detect-secrets
- Java: SpotBugs Security + OWASP Dependency-Check + detect-secrets
- Go: gosec + govulncheck + detect-secrets

### Step 3: Execute Scans

Run all five scan categories:
1. **SAST** — analyze source code for vulnerability patterns (injection, XSS, path traversal, insecure crypto, hardcoded secrets)
2. **SCA** — check dependencies for known CVEs (critical and high severity)
3. **Secrets** — scan for accidentally committed credentials, tokens, keys
4. **Container Image Scanning** — if Dockerfile exists, scan built image for OS-level CVEs (Trivy, Grype, ECR scanning). Block on critical/high CVEs in base image layers.
5. **IAST (if runtime available)** — if the application can be started (sandbox exists), run interactive security testing by exercising endpoints while monitoring for runtime vulnerabilities (SQL injection confirmed via actual query execution, SSRF confirmed via outbound connection attempt)

### Step 4: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE critical/high findings exist AND attempt < max_attempts:
  1. CLASSIFY each finding:
     - auto-fixable: dependency version bump, secret removal + rotation hint,
       simple injection fix (parameterized query), insecure default config
     - needs-design-review: architectural security gap (missing auth layer,
       unencrypted data at rest, missing input validation boundary)
     - needs-human: business logic security (authorization rules, data access
       scope), false positive confirmation
  2. AUTO-FIX auto-fixable findings
  3. For needs-design-review: read security-requirements.md and nfr-design,
     propose design amendment, fix code to match
  4. RE-RUN affected scans
  5. attempt += 1

IF critical/high findings remain after max_attempts:
  ESCALATE: present findings with CVSS score, exploit scenario, and
  recommended fix to user
```

### Step 5: Generate Report

Create `aidlc-docs/construction/security-scan/security-scan-report.md`:
- Tools used and versions
- Findings by category (SAST/SCA/Secrets) and severity
- Auto-remediated findings (what was fixed, how)
- Remaining findings with risk assessment
- Dependency vulnerability summary (CVE IDs, affected packages, fixed versions)
- Compliance mapping (if governance requirements exist: OWASP Top 10, CWE IDs)

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :shield:
- Summary of security-scan-report
- Review path: `<record>/construction/security-scan/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .kiro/tools/aidlc-orchestrate.ts report --stage security-scan --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

The `required-sections` sensor validates that the security scan report contains all mandatory sections (tools, findings, remediation actions, risk assessment).

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
- Verification check → new manifest at `.kiro/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
