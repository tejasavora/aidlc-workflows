---
name: aidlc-security-scan
description: |
  Run SAST, SCA, and secrets scanning against generated code. Flag vulnerabilities,
  suggest dependency upgrades, detect hardcoded secrets. Self-healing loop for
  auto-fixable issues (dependency upgrades, secret removal).
metadata:
  phase: construction
  stage: security-scan
  per-unit: "true"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: quality-gates
  max-attempts: 3
---

# Security Scan

Run the project's configured security scanning tools against generated code. Three scan types:

1. **SAST** — Static Application Security Testing (code vulnerabilities)
2. **SCA** — Software Composition Analysis (dependency vulnerabilities)
3. **Secrets** — Detect hardcoded credentials, API keys, tokens

## Inputs

- Generated source code + dependency files (requirements.txt, package.json, etc.)
- `aidlc-docs/<intent>/toolchain.yaml` → `quality.security` section
- `aidlc-docs/<intent>/construction/<unit>/nfr-design/` (security patterns)

## Execution

### Step 1: Determine Tools

Read `toolchain.yaml` → `quality.security`. If not configured, detect:
- Python: bandit (SAST), pip-audit (SCA), detect-secrets (secrets)
- TypeScript/Node: eslint-plugin-security (SAST), npm audit (SCA), detect-secrets (secrets)
- Java: SpotBugs (SAST), OWASP Dependency-Check (SCA), detect-secrets (secrets)
- Go: gosec (SAST), govulncheck (SCA), detect-secrets (secrets)
- Any: Semgrep (multi-language SAST), Trivy (multi-language SCA)

If tool is unfamiliar → invoke `knowledge-acquisition` meta-skill to research it.

### Step 2: Run All Scans

Run each configured tool. Normalize output to:
```json
[
  {
    "scan_type": "sast|sca|secrets",
    "rule_id": "B105",
    "severity": "critical|high|medium|low|info",
    "file": "src/config/db.py",
    "line": 12,
    "message": "Possible hardcoded password",
    "cwe": "CWE-259",
    "fixable": true,
    "fix_suggestion": "Move to environment variable or Secrets Manager"
  }
]
```

### Step 3: Classify and Remediate

| Scan Type | Severity | Auto-fixable? | Action |
|-----------|----------|:---:|--------|
| SAST | critical/high | No | ALWAYS present to human (artefact-verification: true) |
| SAST | medium/low | Maybe | If fix is safe and obvious → apply. Otherwise document. |
| SCA | critical/high | Yes | Upgrade dependency if compatible. If breaking → document. |
| SCA | medium/low | Yes | Upgrade dependency. If no fix available → document with timeline. |
| Secrets | any | Yes | Remove hardcoded value, replace with env var or secrets manager reference |

### Step 4: Dependency Upgrade Loop (SCA)

For each vulnerable dependency:
1. Check: is there a patched version? (`pip-audit --fix` / `npm audit fix`)
2. Attempt upgrade to patched version
3. Re-run tests (invoke build-and-test for affected unit)
4. If tests pass → keep upgrade
5. If tests fail → revert upgrade, document as "requires manual intervention"

### Step 5: Secrets Remediation

For each detected secret:
1. Remove the hardcoded value
2. Replace with: `os.environ["SECRET_NAME"]` or framework-appropriate pattern
3. Add secret name to deployment documentation
4. Verify the secret is not in git history (warn if it was committed before)

## Outputs

- `aidlc-docs/<intent>/construction/<unit>/quality/security-scan-report.md`
- Modified source files (secrets removed, deps upgraded)
- Modified dependency files (updated versions)

## Human Review Gate

`artefact-verification: "true"` — ALL security findings are presented to the human for review, even after auto-remediation. Security decisions should never be fully autonomous.

The report presents:
- Critical/High findings (even if fixed — human must acknowledge)
- Dependency upgrades applied (for awareness)
- Secrets found and remediated (human must verify the replacement approach)
- Any findings that could NOT be auto-fixed (needs human decision)
