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

Load aidlc-aws-platform-agent persona from `agents/aidlc-aws-platform-agent.md` and knowledge from `.aidlc/knowledge/aidlc-aws-platform-agent/`.

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

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :desert_island:
- Summary of sandbox-inventory, sandbox-config
- Review path: `<record>/operation/sandbox-provisioning/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .aidlc/tools/aidlc-orchestrate.ts report --stage sandbox-provisioning --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Teardown

Sandbox is automatically destroyed when:
- TTL expires (EventBridge scheduled rule)
- Cost ceiling breached (CloudWatch alarm → Lambda → delete stack)
- Workflow completes (feedback-optimization stage triggers cleanup)
- User explicitly requests `/aidlc --destroy-sandbox`

Teardown is idempotent and logged in audit trail.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/sandbox-provisioning/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/sandbox-provisioning/required-sections-<iso>.md`.

## Learn

While running this stage, maintain a running log in
`<record>/<phase>/<stage>/memory.md` (create on stage start if absent).
Append entries under four standard headings:

- **Interpretations** — choices made where the stage prose was ambiguous
- **Deviations** — places you intentionally departed from the stage prose, and why
- **Tradeoffs** — alternatives considered and why you picked what you did
- **Open questions** — anything to confirm before next run, or uncertain context

Format each entry with an ISO 8601 timestamp:
`- 2026-05-20T10:14:32Z — <summary>; <context>`

Before the approval gate, read memory.md and surface candidates as a
structured question. For each entry the user keeps, write to the appropriate
harness destination per `stage-protocol.md` §13 — never to this stage file:

- Prescriptive rule → a practice line under the routed heading in
  `aidlc/spaces/<active-space>/memory/project.md` (default) or `team.md` (promoted)
- Verification check → new manifest at `.aidlc/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
