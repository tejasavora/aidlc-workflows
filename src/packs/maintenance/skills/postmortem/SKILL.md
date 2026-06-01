---
name: aidlc-postmortem
description: |
  Generates a structured blameless postmortem after production incidents (rollbacks,
  outages, SLO breaches). Reads audit-trail events, deploy reports, smoke-test failures,
  canary-analysis reports, and monitoring metrics to reconstruct a timeline and root cause.
  Asks for the incident description, timeline, and participants before drafting.
  Human reviews and approves before sharing. Action items link back to AI-DLC workflows.
metadata:
  phase: maintenance
  stage: postmortem
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: maintenance
  max-attempts: 1
---

# Postmortem / RCA

Generate a structured, blameless postmortem for a production incident. The goal is to learn — not to blame. The postmortem captures what happened, why it happened, what impact it had, and what concrete action items will prevent recurrence.

## Activation Condition

Activates after any of:
- A production rollback (canary-analysis emitted ROLLBACK, or deploy-report shows rollback)
- An SLO breach (monitoring alert or manual trigger)
- A user-reported production outage
- Human explicitly requests a postmortem

## Inputs

- Human clarification (see Step 1)
- `aidlc-docs/<intent>/governance/audit-trail.jsonl` — event timeline
- `aidlc-docs/<intent>/operations/<env>/deploy-report.md` — deployment details
- `aidlc-docs/<intent>/operations/<env>/canary-analysis-report.md` — if a canary rollback occurred
- `aidlc-docs/<intent>/operations/<env>/smoke-test-report.md` — post-deploy health check results
- Monitoring tool data (CloudWatch, Datadog, Prometheus) — error rates, latency, availability metrics during the incident window

## Execution

### Step 1: Human Clarification

Before drafting, ask:
1. What happened? (brief description of the incident)
2. When did it start and end? (approximate times in UTC)
3. Who was involved in the response? (responders, decision-makers)
4. What was the user-visible impact? (error messages, degraded features, full outage)
5. Was a rollback executed? If so, when?

This clarification is the anchor. All other data is reconstructed from artefacts.

### Step 2: Reconstruct the Timeline

Using audit-trail events and human input, build a chronological timeline:

| Time (UTC) | Event | Actor | Source |
|---|---|---|---|
| 14:02 | Deployment triggered for v2.4.1 | agent:aidlc-deploy | audit-trail |
| 14:18 | Canary error rate breached threshold (+1.2%) | agent:aidlc-canary-analysis | canary-analysis-report |
| 14:19 | Rollback triggered | agent:aidlc-deploy | audit-trail |
| 14:22 | Rollback complete, traffic 100% on v2.4.0 | agent:aidlc-deploy | deploy-report |
| 14:35 | SLO compliance restored | — | monitoring |

Fill gaps using monitoring data. Mark any event not found in artefacts as `[INFERRED]`.

### Step 3: Analyse Root Cause

Trace from the symptom (what monitoring detected) back to the origin:

1. **What failed?** (service, component, API endpoint)
2. **When did it first fail?** (correlate with deployment timestamp)
3. **Why did it fail?** (code change, config change, dependency, infrastructure)
4. **Why wasn't it caught earlier?** (gap in tests, monitoring blind spot, design issue)
5. **What triggered the detection?** (automated threshold, human alert, user report)

Document using a 5-Whys chain where applicable:
```
Why 1: Checkout service returned 500 errors
Why 2: Payment gateway client threw NullPointerException
Why 3: New config key was added but not populated in production environment
Why 4: Config key was added in code but not in deployment config template
Why 5: No validation step checked required config keys before deployment
Root cause: Missing pre-deploy config validation
```

### Step 4: Identify Contributing Factors

Beyond the direct root cause, list contributing factors that made the incident worse or harder to detect:

- Missing monitoring coverage
- Insufficient test coverage for the failure path
- Lack of a pre-deploy config validation step
- On-call rotation gaps
- Runbook absent or outdated

### Step 5: Draft Action Items and Link to AI-DLC

For each root cause and contributing factor, create a concrete action item:

| # | Action | Owner Type | AI-DLC Link | Priority |
|---|--------|------------|-------------|----------|
| 1 | Add pre-deploy config key validation | Construction | Create `build-and-test` check | HIGH |
| 2 | Add test for null payment gateway client | Construction | Create `bug-triage` entry → regression test | HIGH |
| 3 | Add monitoring alert for NullPointerException in payment service | Operations | Create observability task in deployment-design | MEDIUM |
| 4 | Update runbook for payment gateway failures | Maintenance | Create `documentation-generation` task | LOW |

AI-DLC links:
- "Add test for X" → creates a `bug-triage` entry (TEST_GAP classification)
- "Improve monitoring for Y" → creates an observability task in `deployment-design`
- "Update documentation Z" → triggers `documentation-generation` skill

### Step 6: Produce Postmortem Document

Generate the structured postmortem:

```markdown
## Postmortem — <Incident Title>

**Incident Date:** 2024-01-15
**Severity:** SEV-2 (partial outage, <25% users affected)
**Duration:** 33 minutes (14:02–14:35 UTC)
**Status:** Resolved

### Impact

- Checkout service returned 500 errors for ~18% of requests during the window
- Estimated affected transactions: ~340
- No data loss

### Timeline

[Reconstructed timeline from Step 2]

### Root Cause

[5-Whys analysis from Step 3]

### Contributing Factors

[List from Step 4]

### What Went Well

- Canary analysis detected the issue before full traffic promotion
- Rollback completed in 3 minutes with no additional escalation needed
- Audit trail provided a complete event log for this postmortem

### What Could Be Improved

[Derived from contributing factors]

### Action Items

[Table from Step 5]

### Lessons Learned

[Free-text: what the team should carry forward]
```

## Outputs

- `aidlc-docs/<intent>/maintenance/postmortem-<date>-<incident-slug>.md`
- Action items are also appended to `aidlc-docs/<intent>/governance/audit-trail.jsonl` as `POSTMORTEM_ACTION_ITEM` events

## Artefact Verification

`artefact-verification: "true"` — Human reviews and approves the postmortem before it is shared. The review confirms: timeline accuracy, root cause correctness, action item ownership and priority. The postmortem is not final until human approval is documented.
