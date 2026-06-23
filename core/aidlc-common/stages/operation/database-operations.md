---
slug: database-operations
phase: operation
execution: CONDITIONAL
condition: Execute when the system uses databases that require Day-2 operational management (monitoring, maintenance, failover verification).
lead_agent: aidlc-operations-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - db-operations-plan
  - db-health-checks
  - maintenance-schedule
  - database-operations-questions
consumes:
  - artifact: deployment-log
    required: true
  - artifact: migration-plan
    required: false
requires_stage:
  - deployment-execution
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
inputs: Deployed database, migration artifacts, infrastructure design
outputs: aidlc-docs/operation/database-operations/db-operations-plan.md, aidlc-docs/operation/database-operations/db-health-checks.md, aidlc-docs/operation/database-operations/maintenance-schedule.md
---

# Database Operations

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas
Load aidlc-operations-agent persona and knowledge from `.claude/knowledge/aidlc-operations-agent/database-operations-patterns.md`.

### Step 2: Configure Health Monitoring
- Connection pool utilization alarm (> 80% = warning, > 95% = critical)
- Replication lag alarm (> 5s = warning, > 30s = critical)
- Storage utilization alarm (> 80% = warning, auto-scale or alert)
- IOPS utilization alarm (sustained > 80% = review provisioning)
- Slow query log threshold (> 1s = log, > 5s = alert)
- Deadlock detection and alerting

### Step 3: Define Maintenance Schedule
- Vacuum/analyze schedule (PostgreSQL: nightly off-peak, or autovacuum tuning)
- Index maintenance (rebuild bloated indexes, identify unused indexes)
- Statistics update cadence
- Maintenance window for RDS (when patches apply)
- Backup verification schedule (monthly restore test)

### Step 4: Connection Pool Sizing
- Formula: pool_size = (cpu_cores * 2) + spindles (or SSD equivalent)
- Verify application connection pool matches database max_connections
- Configure connection timeout, idle timeout, validation query
- Leak detection: alert if connections not returned within threshold

### Step 5: Failover Testing
- Script automated failover test (RDS: reboot with failover)
- Measure: time to detect failure + time to route to replica
- Verify: application reconnects without manual intervention
- Verify: no data loss during failover (check replication lag at switch time)

### Step 6: Update State
Mark database-operations as `[x]` completed.

### Step 7: Present Completion & Request Approval
Completion emoji: :floppy_disk:
Standard 2-option approval.
