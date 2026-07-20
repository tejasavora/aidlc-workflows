---
trigger: model_decision
description: "AI-DLC V2 resilience: dr-validation"
---


# DR Validation

Execute a controlled disaster recovery drill to verify the system can recover from a catastrophic failure within the RTO and RPO targets defined in NFR requirements.

## Inputs

- `aidlc-docs/<intent>/inception/nfr-requirements.md` → RTO, RPO targets
- `aidlc-docs/<intent>/construction/` → data architecture, replication topology
- `aidlc-docs/<intent>/toolchain.yaml` → `resilience.target_environment`
- Deployed system with DR infrastructure in place (replicas, backups, standby)

## Execution

### Step 1: Verify DR Prerequisites

Before any drill, confirm DR infrastructure exists:
- Database replica or backup that can be promoted
- Application instances in standby region/AZ
- DNS failover mechanism (Route53, load balancer, etc.)
- Runbook for failover procedure

If DR infrastructure does not exist → ESCALATE immediately (cannot validate DR without it). Present: what is missing, what to build, estimated effort.

### Step 2: Design DR Drill

Derive the drill scenario from NFR targets:
- **RTO target** (e.g., 15 minutes): maximum time from failure detection to service restoration
- **RPO target** (e.g., 5 minutes): maximum data loss acceptable

Drill types (match to architecture):
- **Active-passive failover**: promote standby, update DNS, verify traffic routes
- **Backup restore**: restore from last backup, verify data integrity, bring service online
- **Multi-region failover**: route traffic to DR region, verify full functionality
- **DB replica promotion**: promote read replica to primary, verify write path

### Step 3: Human Approval

DR drills affect real infrastructure. Always present plan before execution:
```markdown
## DR Drill Plan

**Target Environment:** staging
**Drill Type:** Active-passive failover (promote DB replica)
**Estimated impact duration:** Up to 15 minutes of staging downtime
**RTO target:** 15 minutes
**RPO target:** 5 minutes

**Steps:**
1. Record current data state (RPO baseline)
2. Trigger primary DB failure simulation (stop primary, promote replica)
3. Measure: time to service restoration (RTO clock starts now)
4. Verify: data integrity (RPO measurement)
5. Restore: bring primary back, re-sync replica

Proceed with drill? (yes / no / modify)
```

### Step 4: Execute Drill

1. **Record baseline**: note current time, write a test record to measure RPO
2. **Start RTO clock**
3. **Trigger failure**: execute the failover (promote replica, update DNS, etc.)
4. **Monitor recovery**: track which steps complete and how long each takes
5. **Verify service restored**: run smoke tests against recovered service
6. **Stop RTO clock**: record actual RTO
7. **Measure RPO**: check if the test record written before failover is present in recovered state

### Step 5: Analyse and Self-Heal

Compare actual vs. target:

| If actual RTO > target | Diagnosis | Fix |
|------------------------|-----------|-----|
| DNS propagation slow | TTL too high | Reduce DNS TTL before production DR |
| Replica promotion slow | Replica too far behind | Increase replication frequency |
| Health checks slow to pass | Warmup time | Pre-warm standby instance |
| Manual steps required | Automation gap | Automate the missing step |

For fixable gaps: apply fix → re-drill (up to max-attempts).
For unfixable (requires architecture change): escalate with gap analysis.

## Outputs

- `aidlc-docs/<intent>/operations/dr-report.md`
  - Drill scenario, actual RTO, actual RPO, comparison to targets, all timing data
- `aidlc-docs/<intent>/operations/dr-runbook.md` (refined from the drill — what actually works)

## Artefact Verification

`artefact-verification: "true"` — Human reviews DR results. If actual RTO/RPO exceeded targets and fixes could not close the gap, this is a blocking finding. Human decides whether to proceed to release or invest in DR infrastructure improvements.
