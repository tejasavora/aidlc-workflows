---
name: aidlc-dependency-update
description: |
  Detect outdated and vulnerable dependencies. Upgrade. Run tests. Self-healing:
  upgrade breaks tests → pin to last working version → document incompatibility →
  suggest alternatives. Tool-agnostic: Dependabot, Renovate, pip-audit, npm audit, any.
metadata:
  phase: maintenance
  stage: dependency-update
  per-unit: "false"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: maintenance
  max-attempts: 3
---

# Dependency Update

Detect and upgrade outdated or vulnerable dependencies. Validate each upgrade by running tests. When an upgrade breaks tests, diagnose, pin if necessary, and document the incompatibility.

## Inputs

- Project dependency files (requirements.txt, pyproject.toml, package.json, go.mod, pom.xml, etc.)
- `aidlc-docs/<intent>/toolchain.yaml` → `maintenance.dependency_tool`
- Running test suite (to validate each upgrade)

## Execution

### Step 1: Detect Issues

Run the configured dependency audit tool:
- **pip-audit**: `pip-audit --output json`
- **npm audit**: `npm audit --json`
- **Dependabot**: read open Dependabot PRs/alerts
- **Renovate**: read open Renovate PRs
- **Trivy**: `trivy fs --security-checks vuln .`
- **govulncheck**: `govulncheck ./...`

Collect findings as:
```
[
  { "package": "cryptography", "installed": "3.4.8", "fixed_in": "41.0.0", "severity": "high", "cve": "CVE-2023-..." },
  { "package": "express", "installed": "4.18.1", "fixed_in": "4.19.2", "severity": "medium", "advisory": "GHSA-..." }
]
```

Also collect outdated (non-CVE) packages using `pip list --outdated` / `npm outdated`.

### Step 2: Prioritise

Order upgrades:
1. Critical severity CVEs first
2. High severity CVEs
3. Medium/low CVEs
4. Outdated (no CVE) — grouped by staleness

### Step 3: Upgrade and Test Loop

For each dependency, per priority:
1. Upgrade to patched/latest version in the manifest file
2. Run `pip install` / `npm install` / equivalent
3. Run full test suite
4. If tests PASS → keep upgrade, move to next
5. If tests FAIL → enter self-healing:
   a. Check if failure is in the upgraded package's API (breaking change)
   b. Check if there is an intermediate version that works
   c. If intermediate found → pin to that version → re-test
   d. If no working version → revert upgrade, document incompatibility, suggest alternative
   e. Repeat up to max-attempts

### Step 4: Handle Incompatibilities

For each dependency that could not be upgraded:
```markdown
### Incompatibility: cryptography 3.4.8

**CVE:** CVE-2023-XXXXX (high)
**Fixed in:** 41.0.0
**Reason blocked:** `cryptography` 41.x drops support for the `hazmat.primitives` API
  used in `src/auth/crypto_utils.py` lines 45-67.
**Last working version:** 40.0.2 (medium CVE still present)

**Recommended action:**
- Migrate `src/auth/crypto_utils.py` to use `cryptography` 41.x API
  (see migration guide: https://cryptography.io/en/latest/changelog/)
- Estimated effort: 2-4 hours

**Temporary:** Pinned to 40.0.2. Remaining CVE severity: medium.
```

### Step 5: Produce Summary

Present all upgrades, pinned versions, and incompatibilities:
```markdown
## Dependency Update Report

**Scanned:** 87 packages
**Critical CVEs fixed:** 2
**High CVEs fixed:** 3
**Packages upgraded:** 8
**Packages pinned (incompatible):** 1
**Outdated (no CVE) upgraded:** 5
```

## Outputs

- Updated dependency files (requirements.txt, package.json, etc.)
- `aidlc-docs/<intent>/maintenance/dependency-update-report-<date>.md`
- Incompatibility notes for any package that could not be upgraded

## Artefact Verification

`artefact-verification: "true"` — Human reviews the update report before any dependency file is committed. Critical CVE fixes are presented with the CVE description so the human can make an informed decision, not just rubber-stamp.
