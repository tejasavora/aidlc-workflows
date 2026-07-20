---
slug: capacity-planning
phase: operation
execution: CONDITIONAL
condition: Execute when the system serves production traffic and needs forward-looking capacity analysis. Projects future needs based on growth trends and validates auto-scaling ceilings.
lead_agent: aidlc-operations-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - capacity-model
  - growth-projections
  - scaling-ceiling-report
  - capacity-planning-questions
consumes:
  - artifact: load-test-results
    required: false
  - artifact: dashboards
    required: true
  - artifact: deployment-architecture
    required: true
requires_stage:
  - performance-validation
  - observability-setup
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - infra
inputs: Performance validation results, observability data, infrastructure design
outputs: aidlc-docs/operation/capacity-planning/capacity-model.md, aidlc-docs/operation/capacity-planning/growth-projections.md, aidlc-docs/operation/capacity-planning/scaling-ceiling-report.md
---

# Capacity Planning

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-operations-agent persona from `agents/aidlc-operations-agent.md` and knowledge from `.claude/knowledge/aidlc-operations-agent/`.

### Step 2: Analyze Current Utilization

From observability data and load test results:
- Current peak traffic (RPS, concurrent users, data volume)
- Current resource utilization at peak (CPU, memory, network, storage, IOPS)
- Current auto-scaling configuration (min/max/desired, scaling policies, cooldown)
- Database connection pool utilization at peak
- Queue depth and consumer lag at peak

### Step 3: Generate Clarifying Questions

- What is the expected growth rate (monthly/quarterly traffic increase)?
- Are there seasonal spikes (Black Friday, end of quarter, marketing campaigns)?
- What is the headroom target (how much spare capacity to maintain)?
- Are there known upcoming features that will change traffic patterns?
- What is the budget ceiling for infrastructure growth?

### Step 4: Build Capacity Model

Create `capacity-model.md`:
- Per-resource capacity ceiling (max instances × per-instance throughput = system max)
- Bottleneck identification (which resource hits ceiling first: compute, DB, network, storage)
- Auto-scaling effectiveness (how quickly can the system scale vs. traffic spike speed)
- Single points of capacity failure (components that cannot scale horizontally)

### Step 5: Project Growth

Create `growth-projections.md`:
- 3-month / 6-month / 12-month traffic projections
- Resource requirements at each projection point
- Cost projection at each growth point
- When current architecture hits ceiling (the "we must re-architect" date)
- Early warning thresholds (at X% utilization, begin planning next tier)

### Step 6: Document Scaling Ceiling

Create `scaling-ceiling-report.md`:
- Per-service maximum throughput (measured, not theoretical)
- Database maximum connections / IOPS / storage before requiring vertical scale
- API Gateway / ALB limits (requests per second, concurrent connections)
- Lambda concurrency limits, SQS throughput limits
- Recommendations: what to do when ceiling is reached (vertical scale, horizontal partition, architecture change)

### Step 7: Update State

Mark capacity-planning as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :chart_with_upwards_trend:
Review path: `aidlc-docs/operation/capacity-planning/`
Standard 2-option approval (Approve / Request Changes).
