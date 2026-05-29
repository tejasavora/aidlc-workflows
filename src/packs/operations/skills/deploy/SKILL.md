---
name: aidlc-deploy
description: |
  Execute deployment to the configured environment. Self-healing loop: deploy →
  health check → fail? → diagnose → fix → redeploy. Production always requires
  human approval before execution. Non-production can auto-approve per configuration.
metadata:
  phase: operations
  stage: deploy
  per-unit: "false"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: operations
  max-attempts: 3
---

# Deploy

Execute the deployment to the target environment following the pipeline designed by `deployment-design`. Monitors the deployment, runs health checks, and self-heals on recoverable failures.

## Inputs

- `aidlc-docs/<intent>/operations/deployment-design.md` (pipeline definition — CI/CD workflow, deployment strategy, environment promotion gates)
- `aidlc-docs/<intent>/construction/deployment-design/` (construction-phase deployment design artifacts — deployment architecture diagrams, environment-specific configs, rollback plan; produced by the `deployment-design` skill before construction begins)
- `aidlc-docs/<intent>/operations/rollback-runbook.md` (rollback procedures)
- `aidlc-docs/<intent>/toolchain.yaml` → `deployment` section
- Target environment parameter (passed by orchestrator)

## Execution

### Step 1: Pre-Deploy Gate (Production Only)

If environment is production (or any environment with `auto_promote: false`):

```markdown
## Deployment Approval Required

**Environment:** production
**Artefact:** image:abc123def (built at 2024-01-15T10:30:00Z)
**Changes:** 3 units deployed, 2 DB migrations pending
**Quality gates:** all passed (static-analysis ✓, security-scan ✓, tests ✓, coverage ✓)
**Staging smoke tests:** passed (12/12)

**Pending DB migrations:**
- 001_add_user_preferences_table.sql (reversible ✓)
- 002_index_orders_by_status.sql (reversible ✓)

Approve deployment to production? (yes / no / review-diff)
```

Do NOT proceed until explicit approval is given.

### Step 2: Execute Deployment

Trigger the deployment using the configured CI/CD tool or directly:

- **GitHub Actions**: `gh workflow run deploy.yml --field environment=<env>`
- **GitLab CI**: `glab pipeline run --ref main`
- **AWS CodePipeline**: `aws codepipeline start-pipeline-execution --name <name>`
- **ArgoCD**: `argocd app sync <app-name>`
- **Kubernetes direct**: `kubectl set image deployment/<name> ...`
- **ECS**: `aws ecs update-service --force-new-deployment`
- **Lambda**: `aws lambda update-function-code`

Stream deployment logs in real time.

### Step 3: Health Check

After deployment reports success, verify services are actually healthy:

1. **Readiness probe**: Poll service health endpoint until healthy or timeout
2. **Connectivity check**: Verify all downstream dependencies reachable
3. **Error rate check**: If monitoring is configured, verify error rate < threshold
4. **Key metrics**: Response time within NFR targets

Health check timeout: `deployment.health_check_timeout` (default: 300s)

### Step 4: Self-Healing Loop

If health check fails:

**Classify the failure:**
| Failure Type | Auto-fixable? | Action |
|-------------|:---:|--------|
| Config error (wrong env var, missing secret) | Yes | Fix config, redeploy |
| Transient (startup timeout, cold start) | Yes | Retry deployment |
| OOM / resource limit | Maybe | Increase limits in IaC config, redeploy |
| Code crash (unhandled exception on startup) | No | Escalate with logs |
| Infrastructure error (network, permissions) | No | Escalate with error |
| Migration failure (DB locked, constraint) | No | Escalate with rollback guidance |

For auto-fixable failures: apply fix → redeploy → re-health-check → repeat up to max-attempts.

### Step 5: Rollback Decision

If max attempts reached and service is still unhealthy:
1. Execute rollback per `rollback-runbook.md`
2. Verify rollback restored healthy state
3. Present failure analysis to human with findings and recommended next steps

## Outputs

- `aidlc-docs/<intent>/operations/<env>/deploy-report.md` (per environment)
  - Deployment timestamp, artefact version, health check results, any fixes applied
- Deployment logs (reference link or inline excerpt)
- Rollback report (if rollback was executed)

## Artefact Verification

`artefact-verification: "true"` — The human reviews the deploy report before the workflow proceeds to `smoke-test`. For non-production environments, this can be automated per `auto_promote` config. For production, this is always a mandatory human review.
