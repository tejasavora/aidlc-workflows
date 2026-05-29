---
name: operations
description: |
  End-to-end operations lifecycle: CI/CD pipeline design, deployment execution,
  post-deploy smoke testing, release management, and documentation generation.
  Activates when deployment targets are configured. Runs after all construction
  units are complete and quality gates pass.
metadata:
  activation: when-deployment-targets-configured
  phase: operations
  runs-after: construction-complete
  configurable: true
---

# Operations Extension Pack

## Activation

Activates when any of the following are present in `aidlc-docs/<intent>/toolchain.yaml`:
- `deployment.targets` is non-empty
- `deployment.environments` is defined
- User explicitly requests deployment setup during requirements-analysis

## Configuration (captured in toolchain.yaml under `deployment` section)

- **CI/CD tool**: auto-detected (GitHub Actions, GitLab CI, CodePipeline, ArgoCD, Jenkins, any)
- **Environments**: list with names and promotion gates (e.g., dev → staging → production)
- **Container registry**: if containerized (ECR, Docker Hub, GCR, GHCR, any)
- **Infrastructure tool**: detected from IaC files (CDK, Terraform, Pulumi, CloudFormation, any)
- **Release strategy**: semver, calendar-ver, or custom
- **Changelog tool**: auto-detected (git-cliff, semantic-release, conventional-changelog, any)
- **Docs output**: where to publish generated docs (GitHub Pages, S3, Confluence, any)
- **Production approval**: required (default: true for production environments)

Example toolchain.yaml deployment section:
```yaml
deployment:
  cicd_tool: github-actions
  environments:
    - name: dev
      auto_promote: true
    - name: staging
      auto_promote: true
    - name: production
      auto_promote: false   # human approval required
  container_registry: ecr
  iac_tool: cdk
  release_strategy: semver
  changelog_tool: git-cliff
  docs_output: github-pages
  production_approval: required
```

## Execution Order

After all construction units pass quality gates:

1. `deployment-design` — Design CI/CD pipelines, environment promotion strategy, rollback plan
2. `deploy` — Execute deployment to configured environment (per-environment, not per-unit)
3. `smoke-test` — Validate critical paths against deployed environment
4. `release-management` — Version bump, changelog, git tag, GitHub release
5. `documentation-generation` — Generate and publish API docs, ADRs, updated README

Each skill is environment-aware — non-production environments use auto-approval; production always requires human confirmation.

## Self-Healing Loop Pattern

Deploy skills follow this pattern:
```
1. DEPLOY to target environment
2. HEALTH CHECK: verify all services healthy (readiness probes, API ping)
3. IF PASS: proceed to smoke tests
4. IF FAIL: enter recovery loop
   a. DIAGNOSE: parse deployment logs, check resource events
   b. CLASSIFY: config error, code error, infrastructure error, transient
   c. AUTO-FIX: config/transient errors → fix → redeploy
   d. ESCALATE: code/infrastructure errors → present findings to human
5. LOG: all deployment attempts, outcomes, and fixes in audit trail
```
