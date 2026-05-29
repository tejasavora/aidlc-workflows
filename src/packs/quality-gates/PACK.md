---
name: quality-gates
description: |
  Autonomous quality validation with self-healing remediation loops. Covers static analysis,
  security scanning, test execution, coverage enforcement, and independent code review.
  Each gate runs after code generation, diagnoses failures, auto-fixes, and re-validates
  up to a configurable max attempts before escalating to human.
metadata:
  activation: always
  phase: construction
  runs-after: code-generation
  configurable: true
---

# Quality Gates Extension Pack

**Schema reference:** `aidlc-common/conventions/aidlc-toolchain-schema.md` defines the full `toolchain.yaml` structure that all gate skills read from.

## Activation

Always active. Individual gates can be disabled during workflow-composition if the user explicitly opts out.

## Configuration (asked during requirements-analysis)

The following configuration is captured in `aidlc-docs/<intent>/toolchain.yaml` under the `quality` section:

- **Static analysis tool**: auto-detected from project (ruff/eslint/golangci-lint/checkstyle/etc.) or user-specified
- **SAST tool**: auto-detected or user-specified (bandit/semgrep/CodeQL/Snyk/etc.)
- **SCA tool**: auto-detected or user-specified (pip-audit/npm-audit/Dependabot/Trivy/etc.)
- **Secrets scanner**: auto-detected or user-specified (detect-secrets/TruffleHog/Gitleaks/etc.)
- **Test framework**: auto-detected (pytest/Jest/JUnit/go test/etc.)
- **Coverage tool**: auto-detected (pytest-cov/Istanbul/JaCoCo/etc.)
- **Coverage threshold**: user-specified (default: 80% line, 70% branch)
- **Max remediation attempts**: user-specified (default: 3)
- **SonarQube**: optional (URL, project key, token, quality gate profile)

If a tool is not detected or specified, the pack asks the user during its first gate execution.

## Execution Order

After code-generation completes for a unit:

1. `static-analysis` (lint + style + complexity)
2. `security-scan` (SAST + SCA + secrets)
3. `build-and-test` (compile + unit + integration)
4. `coverage-enforcement` (measure + enforce threshold)
5. `code-review` (independent review against design)

Each gate is independent — a pass in one does not depend on another (though they run sequentially for efficiency).

## Self-Healing Loop Pattern

Every gate skill follows this pattern:

```
1. EXECUTE: Run the configured tool(s)
2. PARSE: Extract structured findings {severity, location, message, suggested_fix}
3. IF PASS: proceed to next gate
4. IF FAIL: enter remediation loop
   a. CLASSIFY findings:
      - auto-fixable (style, missing test, unused import, simple bug)
      - needs-design-review (architecture gap, missing requirement)
      - needs-human (ambiguous, risky, policy decision)
   b. AUTO-FIX auto-fixable findings
   c. DESIGN-FIX needs-design-review findings:
      - Read relevant aidlc-docs/ (functional-design, NFR, etc.)
      - Update design artifact if design is wrong
      - Cascade: update code to match corrected design
   d. RE-RUN the check
   e. IF still failing AND attempts < max_attempts: loop back to (a)
   f. IF still failing AND attempts >= max_attempts: ESCALATE TO HUMAN
      - Present: original failures, what was attempted, remaining failures
      - Ask: fix guidance, skip gate, or abort
5. LOG: Record all attempts, fixes, and final result in audit trail
```

## Tool Adapter Pattern

Each gate skill reads `aidlc-docs/<intent>/toolchain.yaml` to determine which tool to use. The skill's SKILL.md defines the CAPABILITY; the toolchain.yaml defines the TOOL.

Example toolchain.yaml quality section:
```yaml
quality:
  language: python
  static_analysis:
    tool: ruff
    config: pyproject.toml
    auto_fix: true
  security:
    sast: [bandit, semgrep]
    sca: pip-audit
    secrets: detect-secrets
  testing:
    framework: pytest
    unit_dir: tests/unit/
    integration_dir: tests/integration/
    coverage_tool: pytest-cov
    coverage_threshold_line: 80
    coverage_threshold_branch: 70
  review:
    standards: [pep8, type-hints-required, docstrings-public-only]
  max_remediation_attempts: 3
```
