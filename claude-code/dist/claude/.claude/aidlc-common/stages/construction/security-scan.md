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

Load aidlc-devsecops-agent persona from `agents/aidlc-devsecops-agent.md` and knowledge from `.claude/knowledge/aidlc-devsecops-agent/`.

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

Run all three scan categories:
1. **SAST** — analyze source code for vulnerability patterns (injection, XSS, path traversal, insecure crypto, hardcoded secrets)
2. **SCA** — check dependencies for known CVEs (critical and high severity)
3. **Secrets** — scan for accidentally committed credentials, tokens, keys

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

### Step 6: Update State

Mark security-scan as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :shield:
Review path: `aidlc-docs/construction/security-scan/`
Standard 2-option approval (Approve / Request Changes).

## Sensors

The `required-sections` sensor validates that the security scan report contains all mandatory sections (tools, findings, remediation actions, risk assessment).
