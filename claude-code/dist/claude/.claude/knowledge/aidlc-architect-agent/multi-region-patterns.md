# Multi-Region Patterns

## Active-Passive vs Active-Active
- **Active-passive:** Simple, one write region. Failover = promote read replica + DNS switch. RPO = replication lag. RTO = DNS propagation + promotion time (1-5 minutes).
- **Active-active:** Both regions serve writes. Requires conflict resolution. Lower latency for global users. Complex (data consistency challenges). Use when: latency SLA requires proximity.

## Data Replication
- **Synchronous (within region):** Multi-AZ RDS, Aurora cluster. RPO = 0. Higher write latency.
- **Asynchronous (cross-region):** Aurora Global Database, DynamoDB Global Tables. RPO = replication lag (typically <1s). No write latency impact.
- **Conflict resolution:** Last-writer-wins (simple, data loss risk), application-level merge (complex, correct), CRDT (automatic, limited data types).

## Failover Procedure
1. Health check fails (Route 53 / Global Accelerator detects)
2. DNS failover record activates (automatic if health check configured)
3. Secondary region promoted to primary (Aurora: promote read replica, DynamoDB: already active)
4. Application reconnects to new primary endpoint
5. Verify: transactions succeeding, no data corruption
6. Failback: reverse process after root cause resolved (not automatic — manual decision)

## Split-Brain Prevention
- Consensus quorum: require majority of nodes to agree (3 nodes = tolerate 1 failure)
- Fencing tokens: monotonically increasing token on each leader election (reject stale leader's writes)
- Lease-based leadership: leader must renew lease before TTL (failure to renew = step down)
- During partition: prefer consistency (reject writes from minority partition) OR prefer availability (accept writes, reconcile later) — choose per service based on business impact

## Eventual Consistency
- Document per data type: "user profile: consistent within 2s cross-region"
- Read-after-write: if user just wrote, read from leader (not replica)
- Session consistency: pin session to one region for duration (avoid reading own stale writes)
- Compensation: if stale read caused wrong action, detect and compensate (saga pattern)

## Data Residency
- Tag data with origin region (EU data stays in EU)
- DynamoDB Global Tables: choose which attributes replicate globally vs stay regional
- S3 replication rules: exclude PII buckets from cross-region replication
- Verify: no cross-region data flow in CloudTrail / VPC Flow Logs for restricted data
