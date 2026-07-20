---
trigger: model_decision
description: "AI-DLC V2 operations: deployment-design"
---


# Deployment Design

Design the complete deployment pipeline before any code is deployed. Produces pipeline configuration files and promotion strategy that all subsequent deploy skills execute against.

## Inputs

- `aidlc-docs/<intent>/toolchain.yaml` → `deployment` section
- `aidlc-docs/<intent>/construction/` — all units and their artefacts (to understand what's being deployed)
- `aidlc-docs/<intent>/inception/nfr-requirements.md` — SLA, availability, RTO/RPO targets
- `aidlc-docs/<intent>/inception/stories.md` — environment and deployment stories

## Execution

### Step 1: Human Clarification

Before designing, ask:
1. What environments are needed? (dev/staging/production or custom)
2. What are the promotion gates? (auto, manual approval, test gate)
3. What is the rollback strategy? (automatic on failure, manual, blue-green, canary)
4. Are there feature flags or progressive rollout requirements?
5. What notifications are needed on deploy events?

Only ask if not already captured in `toolchain.yaml`.

### Step 2: Design Pipeline

Based on configured CI/CD tool, generate the pipeline definition:

**GitHub Actions:** `.github/workflows/deploy.yml`
**GitLab CI:** `.gitlab-ci.yml`
**AWS CodePipeline:** CDK/CloudFormation pipeline stack
**ArgoCD:** `argocd/application.yaml` + `argocd/project.yaml`
**Jenkins:** `Jenkinsfile`
**Generic:** Document pipeline stages in `deployment-design.md`

Pipeline MUST include:
- Build stage (compile, lint, test — invoke quality-gates pack)
- Artefact creation (Docker image, zip, JAR, etc.)
- Environment promotion with configured gates
- Health checks after each deployment stage
- Rollback trigger conditions

### Step 3: Design Rollback Strategy

Document per environment:
- **Trigger condition**: What constitutes a failure (health check %, error rate, manual)
- **Rollback mechanism**: Previous image tag, git revert, IaC stack rollback
- **Recovery time objective**: How long rollback should take
- **Data migration rollback**: If DB migrations are involved, is rollback safe?

### Step 4: Plan Verification

Present the pipeline design to human before writing files:
```markdown
## Deployment Design — Plan

**Environments:** dev → staging → production
**CI/CD:** GitHub Actions

**Pipeline Stages:**
1. build-and-test (quality-gates pack)
2. build-docker → push to ECR
3. deploy-dev (auto-promote)
4. smoke-test-dev
5. deploy-staging (auto-promote after smoke tests)
6. smoke-test-staging
7. **[HUMAN APPROVAL]** deploy-production
8. smoke-test-production
9. release-management (tag, changelog)

**Rollback:** Automatic if health check fails within 5 min of deploy (revert to previous ECS task def)

Proceed? (Y / modify)
```

### Step 5: Generate Files

After human approval, write:
- CI/CD pipeline configuration file(s)
- `aidlc-docs/<intent>/operations/deployment-design.md` (architecture of the pipeline)
- `aidlc-docs/<intent>/operations/rollback-runbook.md` (step-by-step rollback procedure)

## Outputs

- CI/CD pipeline configuration file(s) in project root
- `aidlc-docs/<intent>/operations/deployment-design.md`
- `aidlc-docs/<intent>/operations/rollback-runbook.md`
- Updated `toolchain.yaml` with finalized deployment configuration

## Escalation

If deployment targets are ambiguous or conflicting (e.g., NFR requires HA but no infrastructure IaC exists):
- Present conflict with options
- Do not proceed to `deploy` skill until design is resolved
