# HA Design — Validation Spec

## Pass Criteria

- Human was asked to confirm availability target before design was produced
- HA topology maps to the correct redundancy tier for the stated SLA
- Auto-scaling configuration is present with explicit min/max capacity values
- Health check specifications exist for all external-facing endpoints
- Database layer specifies replication mode (synchronous or asynchronous) with rationale
- Load balancer health check thresholds are defined (interval, healthy/unhealthy counts)
- Human approved the HA design plan before artifacts were written
- `ha-design.md` and `ha-topology.yaml` both exist at expected paths

## Fail Criteria

- SLA target was assumed without asking the human when absent from NFR requirements
- Auto-scaling is specified without min/max bounds (open-ended scaling is a cost risk)
- Health checks use default cloud-provider values without explicit thresholds
- Single-AZ design produced for an SLA requiring Multi-AZ
- Design written without human plan approval
- `ha-topology.yaml` is missing or contains placeholder values

## Validation Steps

1. Verify `aidlc-docs/<intent>/construction/well-architected/ha-design.md` exists
2. Verify `aidlc-docs/<intent>/construction/well-architected/ha-topology.yaml` exists
3. Read `ha-design.md` and confirm SLA target is explicitly stated
4. Confirm topology tier matches the SLA (use the SLA-to-tier table from SKILL.md)
5. Verify auto-scaling section includes: metric, scale-out threshold, scale-in threshold, min, max, cooldowns
6. Verify health check section defines: endpoint/query, interval, healthy threshold, unhealthy threshold
7. Confirm database section specifies replication mode with a rationale
8. Verify audit trail shows human approved the plan (present in `audit/intent-audit.md`)
