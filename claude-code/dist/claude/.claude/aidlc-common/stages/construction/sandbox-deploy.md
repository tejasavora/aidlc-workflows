---
slug: sandbox-deploy
phase: construction
execution: CONDITIONAL
condition: Execute after infrastructure-design when a running environment is needed for incremental verification during code-generation. Provisions sandbox EARLY so BUILD-VERIFY-DEPLOY loop has somewhere to deploy.
lead_agent: aidlc-pipeline-deploy-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - sandbox-endpoint
  - sandbox-deploy-log
  - sandbox-deploy-questions
consumes:
  - artifact: deployment-architecture
    required: true
  - artifact: code-summary
    required: false
requires_stage:
  - infrastructure-design
workspace_requires: true
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - workshop
inputs: Infrastructure design, generated IaC code, application code (initial or incremental)
outputs: aidlc-docs/construction/sandbox-deploy/sandbox-endpoint.md, aidlc-docs/construction/sandbox-deploy/sandbox-deploy-log.md
---

# Sandbox Deploy (Construction-Phase Continuous Deployment)

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage deploys the application to an isolated sandbox environment DURING construction — not after. It enables the V3 execution model where every increment is deployed and verified against a real running system, eliminating the gap between "tests pass locally" and "it works deployed."

## Why Deploy During Construction

V2 problem: code-generation produces all code → build-and-test verifies locally → THEN we discover it doesn't deploy / doesn't work in a real environment. By then, we've built everything on a possibly broken foundation.

V3 solution: deploy the walking skeleton immediately. Every subsequent increment deploys on top of it. The sandbox is ALWAYS running, ALWAYS reflecting the latest verified state. Integration problems are caught within minutes, not after days of construction.

## Steps

### Step 1: Load Agent Personas

Load aidlc-pipeline-deploy-agent persona from `agents/aidlc-pipeline-deploy-agent.md` and knowledge from `.claude/knowledge/aidlc-pipeline-deploy-agent/`.

### Step 2: Determine Sandbox Strategy

Based on the infrastructure design, choose the fastest path to a running environment:

| Architecture | Sandbox Strategy | Time to First Deploy |
|-------------|-----------------|---------------------|
| Serverless (Lambda + API GW) | SAM local or direct deploy | 2-5 minutes |
| Container (ECS/EKS) | Docker Compose locally OR Fargate spot | 5-10 minutes |
| EC2-based | Docker Compose locally | 3-5 minutes |
| Static site + API | Local dev server | 1 minute |

**Priority order:**
1. Local Docker Compose (fastest, no cloud cost, works offline)
2. Serverless deploy to sandbox account (cheap, real AWS)
3. Container deploy to Fargate Spot (real container orchestration, low cost)
4. Full IaC deploy (slowest, most realistic, use only if architecture requires it)

### Step 3: Generate Clarifying Questions

- Is a local sandbox acceptable (Docker Compose) or must it be cloud-deployed?
- If cloud: which AWS account/region for sandbox?
- What cost ceiling for sandbox resources?
- What TTL (auto-destroy after N hours)?

Follow stage-protocol.md question flow.

### Step 4: Initial Sandbox Deployment

Deploy the current state of the application:

**For Docker Compose (preferred for speed):**
1. Generate `docker-compose.yml` from infrastructure-design (services, databases, caches)
2. Build application container(s)
3. Start all services
4. Verify health checks pass
5. Record endpoint URLs

**For Cloud Sandbox:**
1. Deploy infrastructure via IaC (CDK/Terraform)
2. Build and push container images (or package Lambda)
3. Deploy application
4. Verify health checks pass
5. Record endpoint URLs
6. Configure auto-destroy (TTL + cost ceiling)

### Step 5: Record Sandbox Endpoint

Create `sandbox-endpoint.md`:
```yaml
sandbox:
  type: docker-compose | cloud
  base_url: http://localhost:8000 | https://sandbox-abc123.execute-api.us-east-1.amazonaws.com
  services:
    api: http://localhost:8000
    frontend: http://localhost:3000
    database: localhost:5432/app_db
  health_check: http://localhost:8000/health
  status: healthy
  deployed_at: <ISO8601>
  auto_destroy: <ISO8601 or N/A for local>
```

This file is read by subsequent stages (integration-verification, frontend-verification, runtime-validation) to know WHERE to send requests.

### Step 6: Enable Incremental Redeployment

Configure the sandbox for rapid redeployment (the BUILD-VERIFY-DEPLOY loop will call this repeatedly):
- Docker Compose: `docker compose up -d --build <service>` (rebuilds only changed service)
- Cloud: CodeBuild/CodePipeline shortcut or direct `aws ecs update-service`
- Lambda: `sam deploy --no-confirm-changeset`

Target: < 60 seconds from code change to running in sandbox (for the loop to be tight).

### Step 7: Update State

Mark sandbox-deploy as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :rocket:
Review path: `aidlc-docs/construction/sandbox-deploy/`
Standard 2-option approval (Approve / Request Changes).

## Incremental Redeployment (Called by Code-Generation Loop)

After this stage completes once, the sandbox stays running. Code-generation can trigger redeployment after each increment by:
1. Rebuilding the affected service
2. Deploying to sandbox
3. Waiting for health check
4. Proceeding with verification

This is NOT a full re-execution of this stage — it's a lightweight redeploy using the infrastructure established in Step 4. The sandbox-endpoint.md file tells verification stages where to find the running system.

## Teardown

Sandbox is destroyed when:
- Workflow completes (feedback-optimization triggers cleanup)
- TTL expires (cloud sandbox only)
- User requests `/aidlc --destroy-sandbox`
- Cost ceiling breached (cloud sandbox only)
