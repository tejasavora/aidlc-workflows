---
trigger: model_decision
description: "AI-DLC V2 skill: infrastructure-design"
---


# Infrastructure Design

Map logical software components to concrete infrastructure choices for deployment. This skill takes the technology decisions from nfr-assessment and the design patterns from nfr-design, and produces the actual service selections, configurations, sizing, and deployment topology needed to run the unit in production.

Where nfr-assessment answered "what technology" and nfr-design answered "what patterns," infrastructure-design answers "where and how it runs."

## Research-First Requirement

Before specifying any cloud service configuration (especially newer services like AgentCore, Neptune Analytics, Bedrock Knowledge Bases):
1. Check `aidlc-docs/<intent>/research/` for cached research
2. If not cached: invoke the `knowledge-acquisition` meta-skill to verify current API, required IAM permissions, quotas, and pricing
3. Use `aidlc-common/conventions/aidlc-toolchain-schema.md` for IaC tool selection

Never assume service configurations from training data for services released or significantly updated in the last 12 months.

## Prerequisites

- NFR assessment must be complete for this unit — `nfr-requirements.md`, `tech-stack-decisions.md` must be approved
- NFR design should be complete (if applicable) — `nfr-design-patterns.md`, `logical-components.md`
- Functional design should be complete (if applicable) — `business-logic-model.md`, `domain-entities.md`, `business-rules.md`
- Application design artifacts must be available — `components.md`, `component-dependencies.md`, `services.md`, `cross-cutting.md`

## Input

- `nfr-requirements.md`, `tech-stack-decisions.md` (from nfr-assessment)
- `nfr-design-patterns.md`, `logical-components.md` (from nfr-design, if present)
- `business-logic-model.md`, `domain-entities.md` (from functional-design)
- `components.md`, `component-dependencies.md`, `services.md`, `cross-cutting.md` (from application-design)
- `units-of-work.md`, `units-of-work-dependency.md` (for inter-unit integration points)

## Question Guidance

Focus clarifying questions on:

- **Target platform** — what environment does this unit deploy into? Existing Kubernetes cluster, serverless platform, VM-based, container service, bare metal? What's already provisioned vs what needs to be created?
- **Cloud provider** (if not already decided in tech-stack-decisions) — AWS, Azure, GCP, on-prem, hybrid? Specific account/subscription constraints?
- **Compute** — which specific compute service for each component? (e.g. Lambda vs ECS vs EKS, App Service vs AKS, Cloud Run vs GKE). Instance sizing, scaling policies.
- **Storage** — which specific database/storage service? (e.g. RDS vs DynamoDB, Cosmos DB vs SQL Database). Instance class, storage allocation, backup strategy.
- **Messaging** — which specific messaging service for async communication? (e.g. SQS vs EventBridge vs Kafka, Service Bus vs Event Grid). Queue/topic configuration.
- **Networking** — load balancer type, API gateway, DNS, CDN. Internal vs external exposure per component.
- **Security infrastructure** — secrets management service, certificate provisioning, IAM/RBAC model, encryption key management.
- **Observability infrastructure** — which monitoring, logging, and tracing services? Retention policies, alerting channels.
- **Cost constraints** — does budget influence service tier or sizing choices? Reserved vs on-demand?
- **Environment strategy** — how many environments (dev, staging, prod)? Parity between them?
- **Inter-unit integration** — how does this unit connect to other units at the infrastructure level? Service mesh, direct DNS, message broker?

Do not ask about what to build, which technology to use, or what patterns to apply — those are decided upstream. Infrastructure-design maps existing decisions to real, deployable services.

## Output

Two artifacts:

### infrastructure-design.md

Per logical component (from `logical-components.md` or `components.md`):

- **Component name** — from upstream
- **Infrastructure service** — the concrete service (e.g. "AWS RDS PostgreSQL 15", "Azure Service Bus Standard")
- **Configuration** — instance type/size, storage, replicas, scaling policy, key settings
- **Networking** — how it's exposed (internal only, public via LB, behind API gateway), security groups/firewall rules
- **Security** — encryption at rest/in transit, IAM role/policy, secrets references
- **Observability** — metrics emitted, log destination, trace integration
- **Cost estimate** — approximate monthly cost at expected load (from nfr-requirements)
- **Rationale** — why this service was chosen over alternatives, referencing `tech-stack-decisions.md`
- **Platform assumptions** — what must already exist for this to work (e.g. "assumes VPC with private subnets exists", "assumes EKS cluster v1.28+")

### deployment-architecture.md

System-level view of how the unit's infrastructure fits together:

- **Topology** — text-based architecture description: what runs where, how components connect, traffic flow
- **Environments** — what differs between dev/staging/prod (sizing, replicas, feature flags)
- **Scaling strategy** — per component: trigger, min/max, cooldown
- **Failover and recovery** — multi-AZ/region strategy, backup/restore procedures, RTO/RPO mapping to actual mechanisms
- **Deployment pipeline** — how code gets from repo to running (CI/CD stages, approval gates, rollback strategy)
- **Inter-unit connectivity** — how this unit reaches other units and how they reach it (service discovery, DNS, message routing)
- **Infrastructure-as-code notes** — recommended IaC approach (Terraform, CDK, Pulumi, CloudFormation) and module/stack boundaries

## Validation

Validation rules for this skill's output live in `validation-spec.md` at the skill root. See `aidlc-common/protocols/aidlc-validator-protocol.md` for how they are applied.
