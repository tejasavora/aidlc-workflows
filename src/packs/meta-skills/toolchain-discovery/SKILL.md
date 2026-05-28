---
name: aidlc-toolchain-discovery
description: |
  Detect the project's existing toolchain by inspecting config files, package manifests,
  CI/CD configs, and asking the user about gaps. Produces toolchain.yaml that all other
  skills reference for tool-specific commands.
metadata:
  phase: bootstrap
  stage: toolchain-discovery
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  type: meta-skill
---

# Toolchain Discovery

Inspects the project workspace to detect which tools are already configured, then asks the user about gaps. Produces `aidlc-docs/<intent>/toolchain.yaml` — the single source of truth for tool configuration that all quality gates and operations skills reference.

## When to Invoke

Called automatically by the orchestrator during intent-bootstrap (for brownfield) or during requirements-analysis (for greenfield). Can also be re-invoked if a skill encounters an unconfigured tool category.

## Execution

### Step 1: Detect Language and Framework

Inspect workspace for:
- `pyproject.toml`, `setup.py`, `requirements.txt` → Python
- `package.json`, `tsconfig.json` → TypeScript/Node.js
- `pom.xml`, `build.gradle` → Java
- `go.mod` → Go
- `Cargo.toml` → Rust
- `*.csproj`, `*.sln` → .NET
- Multiple → multi-language project (record all)

### Step 2: Detect Configured Tools

For each detected language, scan for tool configurations:

| Config File | Tool Detected |
|-------------|---------------|
| `pyproject.toml [tool.ruff]` | ruff (linter) |
| `.eslintrc.*` / `eslint.config.*` | eslint (linter) |
| `.golangci.yml` | golangci-lint (linter) |
| `pytest.ini` / `pyproject.toml [tool.pytest]` | pytest (test framework) |
| `jest.config.*` | jest (test framework) |
| `.github/workflows/*.yml` | GitHub Actions (CI/CD) |
| `buildspec.yml` | CodeBuild (CI/CD) |
| `Dockerfile` | Docker (containerization) |
| `cdk.json` | AWS CDK (IaC) |
| `terraform/` or `*.tf` | Terraform (IaC) |
| `sonar-project.properties` | SonarQube (quality) |
| `.secrets.baseline` | detect-secrets (secrets) |

### Step 3: Identify Gaps

Compare detected tools against required categories:
- Static analysis: detected? → yes/no
- Testing: detected? → yes/no
- Coverage: detected? → yes/no (often implied by test framework)
- Security scanning: detected? → yes/no
- CI/CD: detected? → yes/no
- IaC: detected? → yes/no
- Monitoring: detected? → yes/no

### Step 4: Ask User About Gaps

For each undetected category:
```
"I couldn't detect a [category] tool in your project. Options:
A) We use [recommendation based on language] — configure it
B) We use [other tool] — tell me which
C) Skip this category for now
D) We don't have one — recommend something"
```

### Step 5: Generate toolchain.yaml

Write `aidlc-docs/<intent>/toolchain.yaml` with all discovered and user-confirmed tools.

## Outputs

- `aidlc-docs/<intent>/toolchain.yaml` (definitive tool configuration)
- Discovery log in audit trail (what was detected, what was asked, what user chose)

## Human Review

`artefact-verification: "true"` — User reviews the generated toolchain.yaml to confirm all tools are correct before the workflow uses them.
