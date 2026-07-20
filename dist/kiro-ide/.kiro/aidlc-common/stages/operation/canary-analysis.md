---
slug: canary-analysis
phase: operation
execution: CONDITIONAL
condition: Execute when deployment strategy is canary or blue/green with traffic shifting. Skip for single-environment direct deployments.
lead_agent: aidlc-pipeline-deploy-agent
support_agents:
  - aidlc-operations-agent
mode: inline
produces:
  - canary-config
  - canary-results
  - canary-analysis-questions
consumes:
  - artifact: deployment-strategy
    required: true
  - artifact: deployment-log
    required: true
  - artifact: dashboards
    required: false
requires_stage:
  - deployment-execution
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - workshop
inputs: Deployment strategy from deployment-pipeline, deployment log from deployment-execution, observability dashboards
outputs: aidlc-docs/operation/canary-analysis/canary-config.md, aidlc-docs/operation/canary-analysis/canary-results.md, aidlc-docs/operation/canary-analysis/canary-analysis-questions.md
---

# Canary Analysis

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-pipeline-deploy-agent persona from `agents/aidlc-pipeline-deploy-agent.md` and knowledge from `.claude/knowledge/aidlc-pipeline-deploy-agent/`.

### Step 2: Load Prior Context

- Read deployment strategy from `aidlc-docs/operation/deployment-pipeline/`
- Read deployment log from `aidlc-docs/operation/deployment-execution/`
- Read observability config from `aidlc-docs/operation/observability-setup/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What percentage of traffic should the canary receive (5%, 10%, 25%)?
- What metrics determine canary health (error rate, latency p99, saturation)?
- What is the bake time before promoting (5min, 15min, 30min)?
- What thresholds trigger automatic rollback?
- Should promotion be automatic or require human approval?

Follow stage-protocol.md question flow.

### Step 4: Configure Canary

Create `canary-config.md`:
- Traffic splitting configuration (weighted routing, header-based, percentage)
- Health metrics and thresholds:
  - Error rate: canary error rate must not exceed baseline + X%
  - Latency p99: canary must not exceed baseline p99 + Yms
  - Success rate: must remain above Z%
- Bake time per promotion step (e.g., 5% → 25% → 50% → 100%)
- Rollback trigger conditions (automatic rollback thresholds)
- CloudWatch alarms for canary-specific metrics

### Step 5: Execute Canary Analysis

Monitor canary deployment against baseline:
1. Collect baseline metrics from existing production traffic
2. Route configured traffic percentage to canary
3. Compare canary metrics against baseline over bake period
4. Decision logic:
   - **PROMOTE** if: all metrics within thresholds for full bake time
   - **ROLLBACK** if: any metric breaches threshold
   - **EXTEND** if: metrics are borderline (increase bake time)

### Step 6: Generate Results

Create `canary-results.md`:
- Canary configuration summary
- Baseline metrics (before canary)
- Canary metrics (during analysis)
- Comparison table (metric | baseline | canary | threshold | verdict)
- Decision: PROMOTED / ROLLED BACK / EXTENDED
- Timeline of traffic shifts
- If rolled back: root cause analysis (which metric breached, by how much)

### Step 7: Update State

Mark canary-analysis as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :canary:
Review path: `aidlc-docs/operation/canary-analysis/`
Standard 2-option approval (Approve / Request Changes).
