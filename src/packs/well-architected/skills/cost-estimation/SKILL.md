---
name: aidlc-cost-estimation
description: |
  Parse infrastructure-design and well-architected design to estimate monthly cost
  per service, compare to budget, and suggest optimizations (Spot/Reserved instances,
  right-sizing, data transfer reduction). Tool-agnostic: uses AWS Pricing API,
  Infracost, custom calculation, or any configured pricing tool.
  Asks human for budget before estimating.
metadata:
  phase: construction
  stage: cost-estimation
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "true"
  plan-verification: "false"
  artefact-verification: "true"
  pack: well-architected
  max-attempts: 2
---

# Cost Estimation

Parse the infrastructure design (and HA/DR design if present) to produce a monthly cost estimate broken down by service. Compare to the declared budget, flag overruns, and suggest concrete optimizations.

## Inputs

- `aidlc-docs/<intent>/construction/infrastructure-design/` (resources and configurations)
- `aidlc-docs/<intent>/construction/well-architected/ha-design.md` (if present — adds HA redundancy cost)
- `aidlc-docs/<intent>/construction/well-architected/dr-design.md` (if present — adds DR replica/backup cost)
- `aidlc-docs/<intent>/toolchain.yaml` → `well_architected.monthly_budget_usd`
- `aidlc-docs/<intent>/inception/nfr-requirements.md` (scale parameters: expected RPS, data volume, user count)

## Human Clarification

Ask before starting estimation:
1. **Monthly budget** — What is the target monthly cloud spend? (If not in toolchain.yaml)
2. **Pricing region** — Which primary region for pricing? (costs vary by region)
3. **Pricing model preference** — On-demand (default), Reserved (1yr/3yr), or Savings Plans?
4. **Traffic pattern** — Is load steady or bursty? (affects Spot viability)

## Execution

### Step 1: Inventory Resources

Parse infrastructure-design artifacts to enumerate all cloud resources. For each resource, extract:
- Service type (compute, database, storage, network, monitoring, etc.)
- Size/tier (instance type, storage GB, throughput)
- Count (instances, replicas, regions)
- Usage pattern (always-on, scheduled, on-demand)

HA design multiplier: if ha-design specifies Multi-AZ × 3, multiply compute and database costs by 3.
DR design multiplier: add DR region costs at the tier specified (active-active = 2×, warm-standby ≈ 30%, backup-restore ≈ 5%).

### Step 2: Estimate Cost Per Service

Use the configured pricing tool:

**AWS Pricing API** (recommended for AWS):
- Compute: EC2/ECS/Lambda/Fargate pricing for the configured instance type × hours/month
- Database: RDS/Aurora/DynamoDB per provisioned tier
- Storage: S3 (standard/IA/Glacier by lifecycle), EBS (gp3/io2)
- Network: data transfer out (egress is significant), NAT Gateway, CloudFront
- Monitoring: CloudWatch metrics, logs ingestion, dashboards

**Infracost** (IaC-based — if Terraform or CDK is configured):
```
infracost breakdown --path <iac-directory> --format json
```

**Custom calculation** (fallback):
Derive from public pricing pages for the detected cloud provider.

Normalize all costs to USD/month.

### Step 3: Produce Cost Breakdown

```markdown
## Monthly Cost Estimate

**Cloud Provider:** AWS (us-east-1)
**Pricing Model:** On-demand
**Estimated Total:** $3,420 / month

### By Service

| Service | Resource | Size | Count | $/unit/month | Subtotal |
|---------|----------|------|-------|-------------|---------|
| Compute | EC2 t3.medium | 2 vCPU, 4GB | 6 (3 AZ × 2) | $34 | $204 |
| Database | RDS PostgreSQL db.t3.medium | Multi-AZ | 1 | $98 | $98 |
| Cache | ElastiCache r7g.large | Redis cluster | 3 nodes | $123 | $369 |
| Storage | S3 Standard | 500 GB/month | 1 | $11.50 | $12 |
| Network | NAT Gateway | 500 GB/month | 3 AZs | $45 | $135 |
| Monitoring | CloudWatch | Metrics + Logs | - | $25 | $25 |
| **Total** | | | | | **$843** |

### HA/DR Premium
- HA (Multi-AZ × 3): +$410/month
- DR (Warm Standby): +$210/month
- **Total with HA+DR:** $1,463 / month

### vs. Budget
- Budget: $2,000 / month
- Estimate: $1,463 / month
- **Status: Under budget by $537 (27% headroom)**
```

### Step 4: Optimization Analysis

If estimate is over budget, OR proactively for estimates within 20% of budget, suggest:

**Compute optimizations:**
- Spot instances (up to 90% savings for fault-tolerant workloads): specify which instances are eligible
- Reserved instances (1yr: ~40%, 3yr: ~60% savings): recommend for always-on components
- Savings Plans (more flexible than Reserved): recommend if mix of instance types
- Right-sizing: if infrastructure-design specified oversized instances, suggest downsizing

**Database optimizations:**
- Aurora Serverless v2: for variable-load databases (auto-scales, pay per ACU)
- DynamoDB on-demand vs. provisioned: on-demand for unpredictable; provisioned+autoscaling for steady
- Read replica offloading: route read-heavy queries to replicas instead of adding primary capacity

**Storage optimizations:**
- S3 lifecycle policies: move infrequently-accessed data to S3-IA or Glacier
- EBS gp3 vs. gp2: gp3 is cheaper and faster; gp2 should always be migrated
- Compression for logs: reduces CloudWatch Logs cost significantly

**Network optimizations:**
- VPC endpoints: eliminate NAT Gateway costs for AWS service calls
- CloudFront: cache at edge to reduce origin data transfer
- S3 Transfer Acceleration: only when needed; adds cost

For each optimization, state: estimated savings/month, implementation effort, trade-offs.

### Step 5: Present Estimate for Approval

If estimate > budget:
```markdown
## Cost Alert: Estimate Exceeds Budget

**Estimate:** $3,420 / month
**Budget:** $2,000 / month
**Overage:** $1,420 / month (+71%)

**Top savings opportunities:**
1. Reserved instances (1yr) for compute: -$480/month
2. DR tier change (hot→warm standby): -$820/month
3. Right-size database (db.r6g.large → db.t3.medium): -$210/month

With recommendations 1+3: $2,730/month (still over budget)
With all three: $1,910/month (within budget)

What would you like to do?
A) Adjust DR tier to warm standby (biggest saving)
B) Purchase Reserved instances (low effort, significant saving)
C) Accept the overage for now and revisit at launch
D) Reduce scope to bring costs down
```

Always wait for human decision before finalizing the estimate.

## Outputs

- `aidlc-docs/<intent>/construction/well-architected/cost-estimate.md`
  - Full cost breakdown table, optimization suggestions, budget comparison
- `aidlc-docs/<intent>/construction/well-architected/cost-estimate.yaml`
  - Machine-readable cost data (for CI cost tracking or budget alerting)

## Artefact Verification

`artefact-verification: "true"` — Human reviews the cost estimate and confirms budget disposition. If estimate exceeds budget, human must choose between optimization options or accept the overage. This is a decision gate — construction should not proceed to IaC generation with a budget overage that the human has not acknowledged.
