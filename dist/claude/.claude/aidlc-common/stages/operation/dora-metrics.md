---
slug: dora-metrics
phase: operation
execution: CONDITIONAL
condition: Execute when the team wants to track engineering effectiveness metrics. Typically run after each release or on a sprint cadence.
lead_agent: aidlc-pipeline-deploy-agent
support_agents:
  - aidlc-operations-agent
mode: inline
produces:
  - dora-report
  - dora-metrics-questions
consumes:
  - artifact: deployment-log
    required: false
  - artifact: ci-config
    required: false
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
inputs: Git history, CI/CD logs, deployment logs, incident records
outputs: aidlc-docs/governance/dora-metrics/dora-report.md, aidlc-docs/governance/dora-metrics/dora-metrics-questions.md
---

# DORA Metrics

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-pipeline-deploy-agent persona from `agents/aidlc-pipeline-deploy-agent.md` and knowledge from `.claude/knowledge/aidlc-pipeline-deploy-agent/`.

### Step 2: Gather Data Sources

Collect metrics from available sources:
- **Git history**: commit frequency, branch lifetime, merge frequency
- **CI/CD logs**: build times, deployment frequency, deployment success rate
- **Deployment logs**: time from commit to production, rollback events
- **Incident records**: outage duration, time to restore, change failure rate

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What time period to measure (last sprint, last month, last quarter)?
- What is the primary branch (main/master/develop)?
- What counts as a "deployment" (merge to main, production deploy, both)?
- What counts as a "failure" (rollback, hotfix, incident, all)?
- Are there existing DORA baselines to compare against?

Follow stage-protocol.md question flow.

### Step 4: Calculate Four Key Metrics

1. **Deployment Frequency**: how often code is deployed to production
   - Elite: multiple times per day
   - High: once per day to once per week
   - Medium: once per week to once per month
   - Low: less than once per month

2. **Lead Time for Changes**: time from commit to production
   - Elite: less than one hour
   - High: one day to one week
   - Medium: one week to one month
   - Low: more than one month

3. **Change Failure Rate**: percentage of deployments causing failures
   - Elite: 0-15%
   - High: 16-30%
   - Medium: 31-45%
   - Low: 46-60%

4. **Time to Restore Service (MTTR)**: time from failure detection to resolution
   - Elite: less than one hour
   - High: less than one day
   - Medium: one day to one week
   - Low: more than one week

### Step 5: Generate Report

Create `dora-report.md`:
- Measurement period and data sources
- Four metrics with values and DORA classification (Elite/High/Medium/Low)
- Trend comparison (vs. previous period, if data available)
- Contributing factors for each metric level
- Recommendations for improvement (specific process/tooling changes)
- Target metrics for next period

### Step 6: Update State

Mark dora-metrics as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :chart_with_upwards_trend:
Review path: `aidlc-docs/governance/dora-metrics/`
Standard 2-option approval (Approve / Request Changes).
