---
slug: cost-estimation
phase: construction
execution: CONDITIONAL
condition: Execute when infrastructure design includes cloud resources with usage-based pricing, or when a monthly budget target is defined. Skip for local-only development or POCs with no cost constraints.
lead_agent: aidlc-aws-platform-agent
support_agents:
  - aidlc-architect-agent
mode: inline
produces:
  - cost-estimate
  - cost-optimization-recommendations
  - cost-estimation-questions
consumes:
  - artifact: deployment-architecture
    required: true
  - artifact: infrastructure-services
    required: true
  - artifact: ha-architecture
    required: false
  - artifact: dr-architecture
    required: false
requires_stage:
  - infrastructure-design
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - mvp
  - infra
  - workshop
inputs: Infrastructure design, HA design (if exists), DR design (if exists)
outputs: aidlc-docs/construction/cost-estimation/cost-estimate.md, aidlc-docs/construction/cost-estimation/cost-optimization-recommendations.md, aidlc-docs/construction/cost-estimation/cost-estimation-questions.md
---

# Cost Estimation

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-aws-platform-agent persona from `agents/aidlc-aws-platform-agent.md` and knowledge from `.claude/knowledge/aidlc-aws-platform-agent/`.

### Step 2: Load Prior Context

- Read infrastructure design from `aidlc-docs/construction/infrastructure-design/`
- Read HA design from `aidlc-docs/construction/ha-design/` (if exists)
- Read DR design from `aidlc-docs/construction/dr-design/` (if exists)
- Read performance requirements from `aidlc-docs/construction/nfr-requirements/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What is the monthly budget target (USD)?
- What are the expected traffic patterns (steady-state RPS, peak multiplier)?
- What pricing model preferences exist (on-demand, reserved, savings plans, spot)?
- What environments are needed (dev, staging, production) and what scale per env?
- Are there existing AWS commitments (reserved instances, savings plans)?

Follow stage-protocol.md question flow.

### Step 4: Calculate Cost Estimate

Create `cost-estimate.md`:

For each infrastructure component from the design:
- Identify the AWS service and pricing dimensions
- Estimate usage based on traffic patterns and data volumes
- Calculate monthly cost per component
- Sum to per-environment and total monthly cost

Include:
- **Compute**: EC2/ECS/Lambda (instance type, count, utilization)
- **Storage**: S3, EBS, EFS (volume, access patterns, lifecycle)
- **Database**: RDS/Aurora/DynamoDB (instance, IOPS, storage, backup)
- **Network**: data transfer, NAT Gateway, ALB/NLB, CloudFront
- **Messaging**: SQS, SNS, EventBridge (message volume)
- **Observability**: CloudWatch (logs, metrics, alarms, dashboards)
- **Security**: WAF, Shield, KMS, Secrets Manager

Present as:
| Component | Service | Config | Monthly Cost |
|-----------|---------|--------|-------------|
| ... | ... | ... | $X.XX |
| **Total** | | | **$X,XXX** |

### Step 5: Generate Optimization Recommendations

Create `cost-optimization-recommendations.md`:
- Reserved/Savings Plan opportunities (if steady-state usage is predictable)
- Right-sizing recommendations (over-provisioned instances)
- Spot instance candidates (stateless, fault-tolerant workloads)
- Storage lifecycle policies (S3 Intelligent-Tiering, Glacier for archives)
- Schedule-based scaling (shut down dev/staging outside business hours)
- Data transfer optimization (VPC endpoints, CloudFront caching)
- Comparison: estimated cost vs. budget target

### Step 6: Update State

Mark cost-estimation as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :moneybag:
Review path: `aidlc-docs/construction/cost-estimation/`
Standard 2-option approval (Approve / Request Changes).
