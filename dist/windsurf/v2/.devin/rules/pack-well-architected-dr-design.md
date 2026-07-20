---
trigger: model_decision
description: "AI-DLC V2 well-architected: dr-design"
---


# DR Design

Design the disaster recovery architecture based on RTO/RPO targets. Selects the appropriate DR tier from the decision matrix, specifies backup strategy and replication topology, and produces a DR runbook outline.

## Inputs

- `aidlc-docs/<intent>/construction/infrastructure-design/` (base infrastructure topology)
- `aidlc-docs/<intent>/construction/well-architected/ha-design.md` (HA topology — run after ha-design)
- `aidlc-docs/<intent>/inception/nfr-requirements.md` (RTO, RPO targets)
- `aidlc-docs/<intent>/toolchain.yaml` → `well_architected` section (rto_minutes, rpo_minutes, cloud_provider)

## Human Clarification

Before designing, confirm or gather:
1. **RTO target** — How many minutes of downtime is acceptable after a disaster?
2. **RPO target** — How many minutes of data loss is acceptable?
3. **Disaster scope** — What failure scenarios must DR cover? (AZ loss, region loss, accidental deletion, ransomware, DC fire)
4. **Budget for DR** — DR has cost implications. Is there a constraint on the DR spend relative to primary?
5. **Regulatory requirement** — Is DR mandated by compliance (SOC2, HIPAA, PCI-DSS)?

## DR Architecture Decision Matrix

Select architecture based on RTO and RPO:

| RTO | RPO | Architecture | Description |
|-----|-----|-------------|-------------|
| < 1 min | Near-zero | Active-Active | Traffic splits across multiple regions/AZs at all times. No failover needed — region removed from load balancer. Highest cost. |
| 1–15 min | < 5 min | Hot Standby | Full replica of production running but not serving traffic. Failover = DNS/LB update. Moderate-high cost. |
| 15–60 min | 5–30 min | Warm Standby | Scaled-down replica (e.g., 1 instance instead of 3). Scale up on failover. Moderate cost. |
| 1–8 hours | 1–24 hours | Backup-Restore | No running replica. Restore from backup on failure. Low cost, significant downtime. |

For each tier, the following table maps infrastructure components to DR treatment:

| Component | Active-Active | Hot Standby | Warm Standby | Backup-Restore |
|-----------|:---:|:---:|:---:|:---:|
| Compute | Load-balanced multi-region | Idle replica, auto-start | Scaled-down replica | Restore from AMI/container |
| Database | Synchronous replication, active primary in each region | Synchronous replica, promote on failover | Async replica, promote on failover | Point-in-time restore from snapshots |
| Storage | Cross-region replication (real-time) | Cross-region replication | Cross-region replication | Cross-region backup (scheduled) |
| DNS | Latency/health-based routing | Failover routing (TTL ≤ 60s) | Failover routing (TTL ≤ 300s) | Manual DNS update |
| Config/Secrets | Multi-region Parameter Store | Replicated | Replicated | Manual restore |

## Execution

### Step 1: Extract RTO/RPO Targets

Read NFR requirements and toolchain.yaml. If not found → ask human (see Human Clarification above).

Classify into DR tier using the decision matrix.

### Step 2: Design Backup Strategy

For each stateful component (database, object storage, file systems):

```yaml
backup:
  component: <name>
  type: snapshot | continuous | transaction-log
  frequency: <interval>             # e.g., hourly, daily, every-5-minutes
  retention:
    daily: <n>
    weekly: <n>
    monthly: <n>
  cross_region_copy: <true/false>
  encryption: <true/false>
  test_restore_frequency: monthly   # must be tested, not just configured
  restore_time_estimate_minutes: <n>
```

Backup frequency must be ≤ RPO target. If RPO is 5 minutes, backups every 5 minutes or continuous replication.

### Step 3: Design Replication Topology

For synchronous replication (RTO < 15 min):
- Specify replica placement (different AZ, different region)
- Replication lag target (must stay < RPO)
- Promotion mechanism (automatic vs. manual)
- Fencing mechanism (prevent split-brain)

For asynchronous replication (RTO 15–60 min):
- Replication lag monitoring threshold (alert if lag > 80% of RPO)
- Promotion pre-steps (flush, checkpoint, demote primary)

### Step 4: Design Failover Runbook Outline

Produce a structured outline for the DR runbook (the full runbook is filled in during `dr-validation` after a drill):

```markdown
## DR Runbook Outline

**Architecture:** <tier>
**RTO Target:** <n> minutes
**RPO Target:** <n> minutes

### Detection
- How failure is detected: <monitoring alert, health check, manual>
- Who is notified: <on-call, escalation chain>
- Decision gate: automatic failover vs. human-triggered

### Failover Steps
1. <step 1 — estimated time: Xm>
2. <step 2 — estimated time: Xm>
...
N. Verify: run smoke tests against DR endpoint

### Estimated Total RTO: <sum of step times>

### Failback Procedure
1. <restore primary>
2. <re-sync replica from DR primary>
3. <switch traffic back>
4. <verify consistency>
```

### Step 5: Present DR Design Plan

```markdown
## DR Design Plan

**RTO Target:** 15 minutes → **Architecture:** Hot Standby
**RPO Target:** 5 minutes → **Backup:** Synchronous DB replica + hourly snapshots

**Backup Strategy:**
- Database: synchronous replica (RDS Multi-AZ), plus daily snapshots retained 30 days
- Object storage: cross-region replication enabled
- Secrets: replicated to DR region via Parameter Store replication

**Failover Mechanism:**
- Database: automatic promotion (RDS handles failover in ~60s)
- Compute: pre-warmed standby in DR region; DNS failover via Route53 health checks (TTL: 60s)
- DNS cutover time: ~2 min (TTL expiry + health check propagation)

**Estimated RTO breakdown:** DB failover (1m) + DNS propagation (2m) + health checks (2m) + smoke tests (5m) = 10m buffer before 15m target

Approve this DR design? (yes / modify / adjust tier)
```

### Step 6: Produce Artifacts

After human approval:
1. Write `aidlc-docs/<intent>/construction/well-architected/dr-design.md`
2. Write `aidlc-docs/<intent>/construction/well-architected/dr-design.yaml` (machine-readable config)
3. Write `aidlc-docs/<intent>/construction/well-architected/dr-runbook-outline.md`

## Outputs

- `aidlc-docs/<intent>/construction/well-architected/dr-design.md`
  - DR tier selection with rationale, backup strategy per component, replication topology, failover mechanism
- `aidlc-docs/<intent>/construction/well-architected/dr-design.yaml`
  - Machine-readable config for IaC generation
- `aidlc-docs/<intent>/construction/well-architected/dr-runbook-outline.md`
  - Runbook template filled with system-specific steps; completed during dr-validation drill

## Artefact Verification

`artefact-verification: "true"` — Human reviews the DR design and confirms the selected tier is acceptable given cost and RTO/RPO constraints. This is a key architectural decision: the wrong tier (too cheap → misses RTO; too expensive → over-engineered) has long-term operational and financial consequences.
