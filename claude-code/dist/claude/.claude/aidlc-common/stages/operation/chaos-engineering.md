---
slug: chaos-engineering
phase: operation
execution: CONDITIONAL
condition: Execute when resilience validation is needed — after deployment to staging/production, when HA/DR designs need verification, or when SLOs include availability targets above 99.9%.
lead_agent: aidlc-operations-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - chaos-experiment-plan
  - chaos-results
  - chaos-engineering-questions
consumes:
  - artifact: ha-architecture
    required: false
  - artifact: dr-architecture
    required: false
  - artifact: deployment-log
    required: true
  - artifact: dashboards
    required: true
requires_stage:
  - deployment-execution
  - observability-setup
sensors:
  - required-sections
scopes:
  - enterprise
  - workshop
inputs: Deployed application, HA/DR designs, observability dashboards
outputs: aidlc-docs/operation/chaos-engineering/chaos-experiment-plan.md, aidlc-docs/operation/chaos-engineering/chaos-results.md, aidlc-docs/operation/chaos-engineering/chaos-engineering-questions.md
---

# Chaos Engineering

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-operations-agent persona from `agents/aidlc-operations-agent.md` and knowledge from `.claude/knowledge/aidlc-operations-agent/`.

### Step 2: Load Prior Context

- Read HA design from `aidlc-docs/construction/ha-design/` (if exists)
- Read DR design from `aidlc-docs/construction/dr-design/` (if exists)
- Read observability setup from `aidlc-docs/operation/observability-setup/`
- Read deployment architecture from `aidlc-docs/construction/infrastructure-design/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What chaos tool to use (AWS Fault Injection Service, Litmus, Gremlin, custom scripts)?
- What environment to target (staging first, then production)?
- What failure modes to test (AZ failure, instance termination, network partition, dependency timeout)?
- What is the blast radius limit (single instance, single AZ, single service)?
- What are the abort conditions (error rate > X%, latency > Y ms)?
- Is there a maintenance window requirement for production experiments?

Follow stage-protocol.md question flow.

### Step 4: Design Experiments

Create `chaos-experiment-plan.md`:

For each experiment:
- **Hypothesis**: "The system will [expected behavior] when [failure condition]"
- **Injection method**: what fault to inject (instance kill, latency injection, DNS failure, disk full)
- **Blast radius**: scope of impact (single instance, single AZ, percentage of fleet)
- **Steady-state metrics**: what metrics prove the system is healthy
- **Abort conditions**: when to stop the experiment immediately
- **Duration**: how long to maintain the fault
- **Rollback**: how to undo the injection if abort triggers

Progressive complexity:
1. Single instance termination (compute resilience)
2. Dependency latency injection (timeout/retry resilience)
3. AZ failure simulation (HA design validation)
4. Network partition (split-brain detection)
5. Memory/CPU pressure (auto-scaling validation)

### Step 5: Execute Experiments

For each experiment:
1. Verify steady-state metrics are healthy (pre-experiment baseline)
2. Start monitoring dashboards and set abort alarms
3. Inject fault
4. Observe system behavior vs. hypothesis
5. Record metrics during experiment
6. Remove fault injection
7. Verify system returns to steady state
8. Record findings

### Step 6: Generate Results

Create `chaos-results.md`:
- Experiment summary table (hypothesis | result | finding)
- Detailed results per experiment:
  - Metrics during injection (latency, errors, throughput)
  - System behavior vs. hypothesis (confirmed/falsified)
  - Recovery time after fault removal
  - Gaps discovered (missing circuit breaker, slow failover, no retry)
- Remediation recommendations for gaps found
- Confidence assessment: which failure modes are validated vs. untested

### Step 7: Update State

Mark chaos-engineering as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :boom:
Review path: `aidlc-docs/operation/chaos-engineering/`
Standard 2-option approval (Approve / Request Changes).
