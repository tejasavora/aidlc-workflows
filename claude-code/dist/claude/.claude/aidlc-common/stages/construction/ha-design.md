---
slug: ha-design
phase: construction
execution: CONDITIONAL
condition: Execute when availability targets exceed 99.9% SLA, or when the system serves production traffic with downtime impact. Skip for internal tools, dev-only services, or POCs.
lead_agent: aidlc-architect-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - ha-architecture
  - failover-strategy
  - ha-design-questions
consumes:
  - artifact: deployment-architecture
    required: true
  - artifact: infrastructure-services
    required: true
  - artifact: reliability-requirements
    required: false
requires_stage:
  - infrastructure-design
sensors:
  - required-sections
  - upstream-coverage
scopes:
  - enterprise
  - feature
  - infra
  - workshop
inputs: Infrastructure design from infrastructure-design stage, reliability NFRs from nfr-requirements
outputs: aidlc-docs/construction/ha-design/ha-architecture.md, aidlc-docs/construction/ha-design/failover-strategy.md, aidlc-docs/construction/ha-design/ha-design-questions.md
---

# High Availability Design

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-architect-agent persona from `agents/aidlc-architect-agent.md` and knowledge from `.claude/knowledge/aidlc-architect-agent/`.
Load aidlc-aws-platform-agent for AWS-specific HA patterns.

### Step 2: Load Prior Context

- Read infrastructure design from `aidlc-docs/construction/infrastructure-design/`
- Read reliability requirements from `aidlc-docs/construction/nfr-requirements/`
- Read application design from `aidlc-docs/inception/application-design/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What is the target SLA (99.9%, 99.95%, 99.99%)?
- What is acceptable downtime per month (43m, 21m, 4m)?
- Is multi-AZ sufficient or is multi-region required?
- What are the stateful components (databases, caches, queues)?
- What is the blast radius tolerance (single component vs. entire system)?
- Are there regulatory requirements for data residency that constrain region selection?

Follow stage-protocol.md question flow.

### Step 4: Design HA Architecture

Create `ha-architecture.md`:
- **Compute layer**: multi-AZ deployment, auto-scaling groups, health checks, instance diversity
- **Data layer**: multi-AZ RDS/Aurora, read replicas, DynamoDB global tables, ElastiCache replication
- **Network layer**: multi-AZ ALB/NLB, Route 53 health checks, CloudFront failover origins
- **Messaging layer**: multi-AZ SQS/SNS, cross-region replication for critical queues
- **State management**: session affinity vs. stateless, distributed cache topology

For each component, document:
- Failure modes (AZ loss, instance failure, network partition)
- Detection mechanism (health check type, interval, threshold)
- Recovery action (auto-replace, failover, drain + redirect)
- Recovery time (seconds for auto-scaling, minutes for failover)

### Step 5: Design Failover Strategy

Create `failover-strategy.md`:
- **Active-active** vs. **active-passive** decision matrix per component
- Failover trigger conditions (health check failures, metric thresholds)
- Failover sequence (ordered steps with timing)
- Data consistency during failover (eventual consistency window, split-brain prevention)
- Failback procedure (manual vs. automatic, verification steps)
- Testing approach (how to validate failover works without impacting production)

### Step 6: Update State

Mark ha-design as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :shield:
Review path: `aidlc-docs/construction/ha-design/`
Standard 2-option approval (Approve / Request Changes).
