---
name: aidlc-compliance-evidence
description: |
  Collect evidence for compliance frameworks. Map AI-DLC artefacts to compliance
  controls (SOC2 CC6.1 → security-scan results, etc.). Generate compliance matrix.
  Asks which framework(s) to target. human-clarification: true, artefact-verification: true.
metadata:
  phase: common
  stage: compliance-evidence
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: governance
  max-attempts: 1
---

# Compliance Evidence

Collect and organise evidence from AI-DLC artefacts to satisfy compliance framework controls. Maps what AI-DLC naturally produces to what compliance auditors need to see.

## Inputs

- `aidlc-docs/<intent>/governance/audit-trail.jsonl`
- All quality-gate reports (static-analysis, security-scan, code-review, coverage)
- All operations reports (deployment, smoke-test, dr-report)
- `aidlc-docs/<intent>/toolchain.yaml` → `governance.frameworks`

## Execution

### Step 1: Human Clarification

If `governance.frameworks` is not configured, ask:
1. Which compliance frameworks are in scope? (SOC2, HIPAA, PCI-DSS, ISO27001, GDPR, custom)
2. What is the evidence collection period? (current release, last quarter, annual)
3. Where should evidence be stored? (local, S3, Confluence, audit management tool)

### Step 2: Map AI-DLC Artefacts to Controls

For each configured framework, apply the mapping:

**SOC2 Type II (common controls):**
| Control | AI-DLC Evidence Source |
|---------|----------------------|
| CC6.1 — Logical access controls | security-scan-report.md (auth/authz findings) |
| CC6.6 — Vulnerability management | security-scan-report.md (CVE findings + fixes) |
| CC7.2 — System monitoring | deployment reports, smoke-test reports |
| CC8.1 — Change management | audit-trail.jsonl (DEPLOYMENT_* events) |
| CC9.1 — Risk assessment | tech-debt-assessment + security-scan findings |

**HIPAA (technical safeguards):**
| Safeguard | AI-DLC Evidence Source |
|-----------|----------------------|
| §164.312(a)(1) — Access control | security-scan auth findings |
| §164.312(b) — Audit controls | audit-trail.jsonl |
| §164.312(c)(1) — Integrity | data-quality reports |
| §164.312(e)(1) — Transmission security | security-scan TLS/encryption findings |

**PCI-DSS:**
| Requirement | AI-DLC Evidence Source |
|-------------|----------------------|
| Req 6.3 — Secure development | code-review reports, security-scan reports |
| Req 10 — Audit logs | audit-trail.jsonl |
| Req 11.3 — Penetration testing | security-scan + chaos-engineering reports |

**ISO27001:**
| Annex A Control | AI-DLC Evidence Source |
|-----------------|----------------------|
| A.12.6 — Vulnerability management | security-scan + dependency-update reports |
| A.14.2 — Secure development | static-analysis + code-review reports |
| A.16 — Incident management | bug-triage reports, rollback reports |

### Step 3: Collect Evidence Files

For each control, locate the evidence source file and:
1. Create a copy in `aidlc-docs/<intent>/governance/evidence/<framework>/`
2. Annotate with: which control it satisfies, date collected, relevant excerpts

### Step 4: Generate Compliance Matrix

```markdown
## Compliance Matrix — SOC2 Type II

**Period:** 2024-01-01 to 2024-01-15
**Evidence collected by:** aidlc-compliance-evidence

| Control | Requirement | Evidence File | Status |
|---------|-------------|---------------|--------|
| CC6.1 | Logical access controls implemented | evidence/soc2/CC6.1-security-scan.md | SATISFIED |
| CC6.6 | Vulnerabilities identified and remediated | evidence/soc2/CC6.6-security-scan.md | SATISFIED |
| CC7.2 | System monitoring in place | evidence/soc2/CC7.2-deploy-report.md | SATISFIED |
| CC8.1 | Change management tracked | evidence/soc2/CC8.1-audit-trail.md | SATISFIED |
| CC9.1 | Risk assessment performed | evidence/soc2/CC9.1-tech-debt.md | GAPS — see notes |
```

### Step 5: Identify Gaps

For any control without sufficient evidence:
- Flag as GAP
- Describe what evidence is missing
- Suggest which AI-DLC skill would produce the missing evidence

## Outputs

- `aidlc-docs/<intent>/governance/evidence/<framework>/` — evidence files
- `aidlc-docs/<intent>/governance/compliance-matrix-<framework>-<date>.md`

## Artefact Verification

`artefact-verification: "true"` — Human (or compliance officer) reviews the compliance matrix to confirm evidence is sufficient and gaps are understood before any compliance submission.
