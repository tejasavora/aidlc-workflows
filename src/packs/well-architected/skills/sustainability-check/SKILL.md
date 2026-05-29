---
name: aidlc-sustainability-check
description: |
  Resource efficiency audit: data lifecycle policies, compute optimization
  recommendations, and carbon/efficiency-focused design review. Advisory only —
  produces recommendations but does not block progression. Runs after
  infrastructure-design and cost-estimation.
metadata:
  phase: construction
  stage: sustainability-check
  per-unit: "false"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: well-architected
  max-attempts: 1
---

# Sustainability Check

Audit the infrastructure design for resource efficiency opportunities aligned with the AWS Well-Architected Sustainability Pillar. This skill is advisory: it identifies inefficiencies and recommends improvements but does not block construction progression.

## Inputs

- `aidlc-docs/<intent>/construction/infrastructure-design/` (resources and configurations)
- `aidlc-docs/<intent>/construction/well-architected/cost-estimate.md` (if present — informs utilization analysis)
- `aidlc-docs/<intent>/inception/nfr-requirements.md` (scale parameters, data retention requirements)
- `aidlc-docs/<intent>/toolchain.yaml` → `well_architected.sustainability` (if configured)

## Execution

### Step 1: Compute Efficiency Audit

Review infrastructure-design for compute inefficiencies:

**Idle and over-provisioned resources:**
- Instances continuously running at < 20% CPU average → flag for right-sizing or Spot/Graviton
- Dev/test environments running 24/7 → recommend scheduled start/stop (save ~65% off-hours)
- Fixed instance counts with no auto-scaling → recommend auto-scaling to match actual demand

**Architecture patterns:**
- Long-running polling loops → recommend event-driven (SQS, EventBridge) to eliminate idle compute
- Synchronous fan-out to many services → recommend async batch processing where latency permits
- Large monolithic compute → evaluate microservice decomposition if services have different load profiles

**Processor choice:**
- x86 instances where ARM (Graviton/Ampere) is available → up to 40% better performance/watt
- GPU instances for non-ML workloads → flag as likely wrong instance family

### Step 2: Storage and Data Lifecycle Audit

**Data retention:**
- Databases with no archival or TTL policy → recommend lifecycle tiering (hot/warm/cold/archive)
- Logs with no expiration policy → flag (CloudWatch Logs, S3 access logs, application logs)
- S3 buckets with no lifecycle rules → recommend automatic transition to S3-IA and Glacier

**Data transfer:**
- Cross-region data transfer that could be served from the same region → flag for locality optimization
- Frequent reads of infrequently-changed data without caching → recommend CDN or in-memory cache
- Large payloads without compression → recommend gzip/zstd for API responses and batch jobs

**Database:**
- Read replicas in a different region than the read traffic → flag for replica placement optimization
- Database snapshots with no expiration policy → recommend retention policy (e.g., keep 30 daily, 12 monthly)

### Step 3: Network Efficiency Audit

- NAT Gateway without VPC endpoints for AWS service calls → each VPC endpoint eliminates NAT traffic
- No request deduplication for idempotent operations → recommend at-least-once deduplication
- Unnecessarily large response payloads → recommend sparse fieldsets / GraphQL for flexible clients

### Step 4: Produce Sustainability Report

```markdown
## Sustainability Check Report

**Date:** <date>
**Infrastructure:** <summary of what was reviewed>

### Findings

| # | Category | Finding | Recommendation | Estimated Impact |
|---|----------|---------|---------------|-----------------|
| 1 | Compute | 3 EC2 instances with no auto-scaling | Add target-tracking auto-scaling | -30% compute hours at off-peak |
| 2 | Storage | CloudWatch Logs with no retention policy | Set 90-day retention | -$X/month in log storage |
| 3 | Data lifecycle | S3 buckets with no lifecycle rules | Add S3 Intelligent-Tiering | -$Y/month in storage |
| 4 | Network | 4 AWS service calls routed via NAT Gateway | Add VPC endpoints for S3, DynamoDB, SSM | -$Z/month in NAT fees |
| 5 | Processor | m5.large instances for API service | Consider m7g.large (Graviton3) | Similar cost, 20% lower power |

### Summary

**Total findings:** 5
- High impact (quick win): 2
- Medium impact: 2
- Low impact / advisory: 1

**Top recommendation:** Add auto-scaling and VPC endpoints — estimated $X/month savings with minimal effort.

### Advisory Note

These findings are recommendations, not requirements. Review and apply at your discretion. No findings block construction progression.
```

## Outputs

- `aidlc-docs/<intent>/construction/well-architected/sustainability-report.md`
  - All findings with category, description, recommendation, and estimated impact

## Artefact Verification

`artefact-verification: "true"` — Human reviews the sustainability report. Because this skill is advisory, artefact-verification here means "show the findings to the human and get an acknowledgement" rather than a blocking approval gate. The human may choose to act on zero, some, or all findings.
