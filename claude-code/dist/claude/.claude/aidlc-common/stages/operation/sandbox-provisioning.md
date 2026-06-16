---
slug: sandbox-provisioning
phase: operation
execution: CONDITIONAL
condition: Execute when the workflow requires a running environment to validate against (runtime-validation, environment-verification, chaos-engineering). Provisions an isolated sandbox from the infrastructure design.
lead_agent: aidlc-aws-platform-agent
support_agents:
  - aidlc-pipeline-deploy-agent
mode: inline
produces:
  - sandbox-inventory
  - sandbox-config
  - sandbox-provisioning-questions
consumes:
  - artifact: deployment-architecture
    required: true
  - artifact: infrastructure-services
    required: true
  - artifact: ci-config
    required: false
requires_stage:
  - infrastructure-design
  - ci-pipeline
workspace_requires: true
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - workshop
inputs: Infrastructure design artifacts, CI configuration, generated IaC code
outputs: aidlc-docs/operation/sandbox-provisioning/sandbox-inventory.md, aidlc-docs/operation/sandbox-provisioning/sandbox-config.md, aidlc-docs/operation/sandbox-provisioning/sandbox-provisioning-questions.md
---

# Sandbox Provisioning

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

This stage creates the isolated execution environment where generated code is deployed and validated. It bridges the gap between "code exists" and "code runs somewhere real." Without a sandbox, runtime-validation, environment-verification, and chaos-engineering have nowhere to execute.

## Why This Stage Exists

Autonomous execution requires a real environment — not mocks, not containers pretending to be AWS, not LocalStack approximations. The generated infrastructure design specifies real AWS services. This stage provisions them in an isolated, cost-controlled, auto-destructing sandbox.

## Steps

### Step 1: Load Agent Personas

Load aidlc-aws-platform-agent persona from `agents/aidlc-aws-platform-agent.md` and knowledge from `.claude/knowledge/aidlc-aws-platform-agent/`.

### Step 2: Load Prior Context

- Read infrastructure design from `aidlc-docs/construction/infrastructure-design/`
- Read generated IaC code (CDK, Terraform, CloudFormation) from workspace
- Read CI pipeline config from `aidlc-docs/construction/ci-pipeline/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What AWS account to use for sandbox (dedicated sandbox account, or isolated stack in dev account)?
- What cost ceiling for the sandbox (auto-destroy if cost exceeds $X)?
- What TTL for sandbox resources (auto-destroy after N hours)?
- Are there services that must be shared (existing VPC, existing database, existing domain)?
- What region for the sandbox?

Follow stage-protocol.md question flow.

### Step 4: Provision Sandbox

Execute the generated IaC to create the sandbox environment:

1. **Isolate:** Create a CloudFormation stack / CDK app with a sandbox-specific prefix
   - Stack name: `aidlc-sandbox-<intent>-<timestamp>`
   - All resources tagged: `aidlc:sandbox=true`, `aidlc:ttl=<hours>`, `aidlc:intent=<name>`

2. **Provision compute:** Deploy application code
   - Build containers (if containerized)
   - Push to ECR / deploy to ECS/Lambda/EC2
   - Wait for health checks to pass

3. **Provision data:** Set up data layer
   - Create database (RDS/DynamoDB/etc)
   - Run migrations (from data-migration stage artifacts)
   - Seed test data (from data-seeding stage artifacts)

4. **Provision networking:**
   - ALB/API Gateway with sandbox-specific DNS (or use generated URL)
   - Security groups allowing sandbox-internal traffic
   - NAT for outbound if needed

5. **Provision secrets:**
   - Create sandbox-specific secrets in Secrets Manager
   - Inject connection strings, API keys (test/sandbox versions only)

6. **Cost controls:**
   - CloudWatch alarm: if daily cost exceeds ceiling → auto-destroy
   - EventBridge rule: auto-destroy after TTL expires
   - Budget alert at 50% and 80% of ceiling

### Step 5: Verify Sandbox Health

Before marking complete:
- [ ] All services started (health check returns 200)
- [ ] Database accessible and migrations applied
- [ ] Application can reach its dependencies (DB, cache, queues)
- [ ] Load balancer / API Gateway returns responses
- [ ] CloudWatch logging active (logs flowing)
- [ ] Cost controls active (alarms in OK state)

### Step 6: Generate Sandbox Inventory

Create `sandbox-inventory.md`:
- AWS account and region
- Stack name / CDK app identifier
- Service endpoints (URLs for each deployed service)
- Database endpoints (host, port, database name)
- Secrets references (ARNs for injected secrets)
- Cost controls (ceiling, TTL, alarm ARNs)
- Destruction instructions (how to tear down when done)

Create `sandbox-config.md`:
- Environment variables for connecting to sandbox
- Credentials / role to assume for API calls
- Base URLs for each service
- WebSocket endpoints (if applicable)
- Admin/dashboard URLs

### Step 7: Update State

Mark sandbox-provisioning as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :desert_island:
Review path: `aidlc-docs/operation/sandbox-provisioning/`
Standard 2-option approval (Approve / Request Changes).

## Teardown

Sandbox is automatically destroyed when:
- TTL expires (EventBridge scheduled rule)
- Cost ceiling breached (CloudWatch alarm → Lambda → delete stack)
- Workflow completes (feedback-optimization stage triggers cleanup)
- User explicitly requests `/aidlc --destroy-sandbox`

Teardown is idempotent and logged in audit trail.
