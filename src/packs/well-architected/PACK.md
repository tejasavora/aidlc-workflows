---
name: well-architected
description: |
  Well-Architected review for production workloads: high availability design,
  disaster recovery architecture, cost estimation, and sustainability audit.
  Activates for enterprise or production workloads, or when explicitly requested.
  Runs after infrastructure-design in the construction phase.
metadata:
  activation: enterprise-or-production-or-user-requested
  phase: construction
  runs-after: infrastructure-design
  configurable: true
---

# Well-Architected Extension Pack

## Activation

Activates when any of the following are true:
- `aidlc-docs/<intent>/inception/nfr-requirements.md` contains availability targets (SLA ≥ 99.9%) or production workload indicators
- `aidlc-docs/<intent>/bootstrap/intent-bootstrap/bootstrap-context.md` classifies the intent as enterprise or production
- User explicitly requests well-architected review during requirements-analysis or workflow-composition
- `toolchain.yaml` contains `well_architected.enabled: true`

## Configuration (captured in toolchain.yaml under `well_architected` section)

- **Target availability**: SLA target (e.g., 99.9%, 99.95%, 99.99%)
- **RTO target**: recovery time objective in minutes
- **RPO target**: recovery point objective in minutes
- **Monthly budget**: cost budget in USD (used by cost-estimation skill)
- **Cloud provider**: aws, azure, gcp, or multi-cloud (for provider-specific guidance)
- **Sustainability goals**: optional carbon targets or efficiency benchmarks

Example toolchain.yaml well_architected section:
```yaml
well_architected:
  enabled: true
  availability_target: "99.95%"
  rto_minutes: 15
  rpo_minutes: 5
  monthly_budget_usd: 5000
  cloud_provider: aws
  sustainability:
    enabled: true
```

## Execution Order

After infrastructure-design completes for the intent:

1. `ha-design` — Multi-AZ/region layout, failover strategy, health checks, auto-scaling
2. `dr-design` — Backup strategy, replication topology, RTO/RPO-driven architecture selection
3. `cost-estimation` — Parse infrastructure-design, estimate monthly cost, compare to budget, suggest optimizations
4. `sustainability-check` — Resource efficiency audit, data lifecycle policies, compute optimization

Each skill reads from `aidlc-docs/<intent>/construction/infrastructure-design/` and produces artifacts in `aidlc-docs/<intent>/construction/well-architected/`.

## Well-Architected Framework Alignment

This pack maps directly to the AWS Well-Architected Framework pillars:

| Skill | Pillar |
|-------|--------|
| ha-design | Reliability |
| dr-design | Reliability |
| cost-estimation | Cost Optimization |
| sustainability-check | Sustainability |

Security and Performance Efficiency pillars are covered by `quality-gates` (security-scan) and `resilience` packs respectively.

## Human Review Gates

`ha-design` and `dr-design` require human clarification (availability targets, budget constraints). `cost-estimation` asks for budget confirmation. `sustainability-check` is advisory — it produces recommendations but does not block progression.
