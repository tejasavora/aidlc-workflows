---
slug: dast
phase: construction
execution: CONDITIONAL
condition: Execute when security requirements exist and a running application endpoint is available. Skip for libraries, CLIs without network exposure, or when no security NFRs are defined.
lead_agent: aidlc-devsecops-agent
support_agents:
  - aidlc-quality-agent
mode: inline
produces:
  - dast-report
  - dast-questions
consumes:
  - artifact: security-scan-report
    required: true
  - artifact: security-requirements
    required: false
  - artifact: build-test-results
    required: true
requires_stage:
  - security-scan
  - build-and-test
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - security-patch
inputs: Running application from build-and-test, security requirements from nfr-requirements
outputs: aidlc-docs/construction/dast/dast-report.md, aidlc-docs/construction/dast/dast-questions.md
---

# Dynamic Application Security Testing (DAST)

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-devsecops-agent persona from `agents/aidlc-devsecops-agent.md` and knowledge from `.claude/knowledge/aidlc-devsecops-agent/`.

### Step 2: Load Prior Context

- Read security scan results from `aidlc-docs/construction/security-scan/`
- Read security requirements from `aidlc-docs/construction/nfr-requirements/`
- Read API specification from `aidlc-docs/construction/*/functional-design/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What DAST tool to use (OWASP ZAP, Nuclei, Burp Suite CLI, custom scripts)?
- What is the application's base URL for testing?
- What authentication mechanism is needed for authenticated scans?
- Are there any endpoints that should be excluded from testing (destructive operations)?

Follow stage-protocol.md question flow.

### Step 4: Configure and Execute DAST

1. Start the application in a test environment
2. Configure the DAST tool with target URL, authentication, and scan policy
3. Run passive scan (observe traffic, no active attacks)
4. Run active scan (injection tests, authentication bypass, SSRF, path traversal)
5. Collect findings with severity ratings

### Step 5: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE critical/high DAST findings exist AND attempt < max_attempts:
  1. CLASSIFY each finding:
     - auto-fixable: missing security headers, CORS misconfiguration,
       cookie flags, verbose error messages, directory listing
     - needs-code-fix: SQL injection, XSS, authentication bypass,
       insecure direct object reference
     - false-positive: confirm with manual verification
  2. AUTO-FIX auto-fixable findings (add headers, fix config)
  3. For needs-code-fix: apply input validation, parameterized queries,
     output encoding, access control checks
  4. RE-RUN affected scan categories
  5. attempt += 1

IF critical/high findings remain after max_attempts:
  ESCALATE: present findings with exploit evidence, impact assessment,
  and recommended remediation to user
```

### Step 6: Generate Report

Create `aidlc-docs/construction/dast/dast-report.md`:
- DAST tool and scan configuration
- Findings by OWASP Top 10 category and severity
- Auto-remediated findings
- Remaining findings with risk assessment and exploit evidence
- Compliance mapping (OWASP Top 10, CWE, PCI-DSS if applicable)

### Step 7: Update State

Mark dast as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :dart:
Review path: `aidlc-docs/construction/dast/`
Standard 2-option approval (Approve / Request Changes).
