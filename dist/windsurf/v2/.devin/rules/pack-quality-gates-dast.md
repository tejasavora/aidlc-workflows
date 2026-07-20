---
trigger: model_decision
description: "AI-DLC V2 quality-gates: dast"
---


# DAST (Dynamic Application Security Testing)

Run an active web security scan against the deployed staging environment. DAST complements SAST (which analyses static code) by attacking the running application to find vulnerabilities that only manifest at runtime: injection flaws, authentication bypasses, insecure headers, exposed endpoints, and session management weaknesses.

## Activation Condition

Activates when BOTH conditions are true:
1. The application has been deployed to a staging environment (`smoke-test` has passed for that environment)
2. `toolchain.yaml` → `quality.security.dast` section is configured with at least a `target_url`

If either condition is false, this skill is skipped. Do NOT run DAST against production.

## Inputs

- `aidlc-docs/<intent>/toolchain.yaml` → `quality.security.dast` section:
  ```yaml
  dast:
    target_url: https://staging.myapp.example.com
    tool: zap                 # zap | burp | nuclei | custom
    scan_profile: standard    # baseline | standard | full
    auth:
      type: form              # none | form | bearer | apikey
      login_url: /auth/login
      username_field: email
      password_field: password
      credentials_secret: DAST_TEST_CREDENTIALS   # env var name
    exclude_paths:
      - /admin/reset-all
      - /load-test-data
  ```
- `aidlc-docs/<intent>/operations/staging/deploy-report.md` — confirm staging is healthy before scanning
- `aidlc-docs/<intent>/inception/stories.md` — identify authenticated flows to scan

## Execution

### Step 1: Pre-Scan Checks

Before starting the scan:
1. Verify staging environment is healthy (read `deploy-report.md` for staging)
2. Verify `target_url` is reachable: `curl -s -o /dev/null -w "%{http_code}" <target_url>` → expect 200 or redirect
3. If auth is configured: verify credentials are available via environment variable
4. Confirm `exclude_paths` list is populated — never scan paths that trigger destructive operations

### Step 2: Configure and Launch Scanner

Launch the configured DAST tool:

**OWASP ZAP (zap):**
```bash
# Baseline scan (passive only, fast)
docker run -v $(pwd):/zap/wrk owasp/zap2docker-stable zap-baseline.py \
  -t <target_url> -r zap-report.html -J zap-report.json

# Standard scan (passive + active)
docker run -v $(pwd):/zap/wrk owasp/zap2docker-stable zap-full-scan.py \
  -t <target_url> -r zap-report.html -J zap-report.json -d
```

**Nuclei:**
```bash
nuclei -u <target_url> -t nuclei-templates/ -severity medium,high,critical \
  -o nuclei-findings.txt -json
```

**Burp Suite (if API available):**
- Use Burp REST API to trigger a scan of the target URL
- Retrieve results via API once scan completes

**Custom tool:** read `dast.command` from toolchain.yaml and execute it.

For authenticated scans: configure the scanner's authentication settings using credentials from the environment variable specified in `dast.auth.credentials_secret`.

### Step 3: Wait for Scan Completion

Monitor scan progress. DAST scans can be long-running (10–90 minutes depending on application size and scan profile):
- `baseline`: passive scan only — typically 5–15 minutes
- `standard`: passive + common active checks — typically 15–45 minutes
- `full`: comprehensive active scan — may take 60+ minutes

Stream progress if the tool supports it. Log estimated completion time from tool output.

### Step 4: Parse and Normalize Findings

Parse the tool's output (JSON/XML/text) into a normalized finding format:

```json
[
  {
    "finding_id": "DAST-001",
    "cwe": "CWE-79",
    "owasp_category": "A03:2021 – Injection",
    "severity": "high",
    "title": "Cross-Site Scripting (Reflected)",
    "url": "https://staging.myapp.example.com/search?q=<payload>",
    "method": "GET",
    "parameter": "q",
    "evidence": "<script>alert(1)</script> reflected in response",
    "reproduction_steps": [
      "Navigate to /search",
      "Set query parameter q to: <script>alert(1)</script>",
      "Observe: script tag reflected unescaped in response body"
    ],
    "remediation": "Encode output using context-appropriate escaping; use Content-Security-Policy header"
  }
]
```

Map tool-specific severity to: `critical | high | medium | low | informational`.

### Step 5: Produce Vulnerability Report

Generate the DAST report document:

```markdown
## DAST Vulnerability Report

**Target:** https://staging.myapp.example.com
**Scan tool:** OWASP ZAP 2.14 (standard profile)
**Scan date:** 2024-01-15T14:32:00Z
**Scan duration:** 23 minutes
**Total findings:** 7 (1 high, 3 medium, 2 low, 1 informational)

### Summary by Severity

| Severity | Count | Must Fix Before Production |
|----------|-------|:-:|
| Critical | 0 | — |
| High | 1 | YES |
| Medium | 3 | RECOMMENDED |
| Low | 2 | OPTIONAL |
| Informational | 1 | NO |

### Findings

#### DAST-001 — CWE-79 — Cross-Site Scripting (Reflected) [HIGH]
...

### Compliance Mapping

| Finding | PCI-DSS Req 11.3 | OWASP Top 10 |
|---------|:---:|:---:|
| DAST-001 | FAIL | A03:2021 |
```

## Outputs

- `aidlc-docs/<intent>/operations/staging/dast-report.md`
  - All findings with CWE IDs, severity, reproduction steps, remediation guidance
  - Compliance mapping table (PCI-DSS Req 11.3 reference for `compliance-evidence` skill)

## No Auto-Fix Policy

`max-attempts: 1` — DAST findings are NOT auto-fixed. Dynamic security vulnerabilities are too nuanced for autonomous remediation:
- Fixes may require architectural changes (trust boundaries, auth design)
- The same symptom can have multiple root causes with different correct fixes
- Security fixes themselves can introduce regressions or new vulnerabilities

The human (or security team) reviews the report and decides remediation priority.

## Human Review Gate

`artefact-verification: "true"` — ALL findings are presented to the human regardless of severity. Even informational findings are shown for awareness.

The human decides:
- Which findings block production promotion (typically critical and high)
- Which findings are accepted risks with a documented rationale
- Timeline for remediating medium/low findings

This decision is logged in the `audit-trail` as `SECURITY_FINDING_ACKNOWLEDGED`.
