---
trigger: model_decision
description: "AI-DLC V2 well-architected: ha-design"
---


# High Availability Design

Design the high availability architecture for the system based on SLA targets defined in NFR requirements. Produces a concrete HA topology, failover strategy, health check specifications, and auto-scaling configuration.

## Inputs

- `aidlc-docs/<intent>/construction/infrastructure-design/` (base infrastructure topology)
- `aidlc-docs/<intent>/inception/nfr-requirements.md` (availability targets, SLA)
- `aidlc-docs/<intent>/toolchain.yaml` → `well_architected` section (availability_target, cloud_provider)

## Human Clarification

Before designing, confirm or gather:
1. **Availability target** — What SLA must this system meet? (99.9%, 99.95%, 99.99%, etc.)
2. **Failure domain scope** — Protect against: AZ failure only, region failure, multi-region?
3. **Stateful vs. stateless** — Does the app have session state that must survive failover?
4. **RPO/RTO** — If not already in NFR, ask: how much downtime and data loss is acceptable?
5. **Traffic pattern** — Predictable (cron-like) or bursty (event-driven)? Helps size auto-scaling.

Present a single question block — do not ask one question at a time.

## Execution

### Step 1: Extract NFR Targets

Read `nfr-requirements.md` and extract:
- Availability SLA (e.g., 99.95% = max ~4.4h downtime/year)
- Response time targets (for health check thresholds)
- Geographic requirements (single-region vs. multi-region)

Map SLA to redundancy requirements:

| SLA | Minimum Architecture |
|-----|---------------------|
| 99.0% | Single AZ + restart policy |
| 99.9% | Multi-AZ active-passive |
| 99.95% | Multi-AZ active-active |
| 99.99% | Multi-region active-active or active-passive |
| 99.999% | Multi-region active-active + circuit breakers + chaos-hardened |

### Step 2: Design HA Topology

Based on SLA tier and infrastructure-design, specify:

**Compute layer:**
- Number of AZs / regions
- Minimum instance count per AZ (e.g., 2 per AZ for zero-downtime deploys)
- Auto-scaling policy: target CPU%, request count, or custom metric
- Scale-in protection during deployments

**Database layer:**
- Replication mode: synchronous (strong consistency) or asynchronous (eventual)
- Standby count and promotion mechanism
- Read replica placement (for read scaling separate from HA)
- Connection pooling (avoid thundering herd on failover)

**Load balancer layer:**
- Health check path, interval, threshold (healthy/unhealthy counts)
- Cross-zone load balancing: enabled/disabled
- Stickiness: needed for session state?
- Idle connection timeout

**Cache layer (if applicable):**
- Cluster mode (multi-node) vs. single-node
- Replication group for Redis/Memcached

**DNS / routing layer:**
- TTL values (low TTL for failover speed vs. DNS caching load)
- Health check-based routing (Route53 / Traffic Manager / Cloud DNS)
- Failover routing policy

### Step 3: Define Auto-Scaling

For each scalable component, specify:
```yaml
auto_scaling:
  service: <component-name>
  min_capacity: <n>
  max_capacity: <n>
  scale_out_trigger:
    metric: cpu_utilization | request_count | queue_depth | custom
    threshold: <value>
    period_seconds: 60
    cooldown_seconds: 120
  scale_in_trigger:
    metric: <same or different>
    threshold: <value>
    cooldown_seconds: 300
  predictive: <true/false>  # use if traffic is periodic
```

### Step 4: Define Health Checks

For each external-facing endpoint and internal dependency:
```yaml
health_checks:
  - component: api-service
    endpoint: /health
    expected_status: 200
    interval_seconds: 10
    healthy_threshold: 2
    unhealthy_threshold: 3
    timeout_seconds: 5
    deep_check: true  # verifies DB connectivity, not just process liveness
  - component: database
    type: tcp | query
    query: "SELECT 1"
    interval_seconds: 30
```

### Step 5: Present HA Design Plan

Present the complete plan for human review before writing artifacts:
```markdown
## HA Design Plan

**SLA Target:** 99.95% (max 4.4h downtime/year)
**Architecture Tier:** Multi-AZ active-active

**Topology:**
- Compute: 2+ instances per AZ across 3 AZs, ALB cross-zone enabled
- Database: Multi-AZ with synchronous replication, automated failover
- Cache: Redis cluster mode (3 shards × 2 replicas)

**Auto-Scaling:**
- Scale out: CPU > 70% for 60s
- Scale in: CPU < 30% for 300s
- Min: 2 per AZ, Max: 10 per AZ

**Health Checks:**
- API: /health every 10s, 2 healthy / 3 unhealthy threshold

Approve this HA design? (yes / modify / add requirements)
```

### Step 6: Produce Artifacts

After human approval:
1. Write `aidlc-docs/<intent>/construction/well-architected/ha-design.md` (full design narrative)
2. Write `aidlc-docs/<intent>/construction/well-architected/ha-topology.yaml` (machine-readable config)
3. Annotate `aidlc-docs/<intent>/construction/infrastructure-design/` components with HA requirements

## Outputs

- `aidlc-docs/<intent>/construction/well-architected/ha-design.md`
  - HA topology diagram (ASCII or Mermaid), redundancy rationale, auto-scaling specs, health check specs
- `aidlc-docs/<intent>/construction/well-architected/ha-topology.yaml`
  - Machine-readable topology for IaC code generation

## Artefact Verification

`artefact-verification: "true"` — Human reviews the HA design before construction proceeds. This is a design gate, not a blocking error — but the human must confirm the topology meets their availability requirements before IaC is generated.
