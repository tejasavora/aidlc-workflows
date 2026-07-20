---
slug: api-governance
phase: operation
execution: CONDITIONAL
condition: Execute when the system exposes APIs consumed by external clients or other services and needs lifecycle management.
lead_agent: aidlc-architect-agent
support_agents:
  - aidlc-developer-agent
mode: inline
produces:
  - api-lifecycle-plan
  - deprecation-schedule
  - api-registry
  - api-governance-questions
consumes:
  - artifact: backward-compat-report
    required: false
  - artifact: code-summary
    required: true
requires_stage:
  - backward-compat
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
inputs: API specifications, backward compatibility report, generated code
outputs: aidlc-docs/governance/api-governance/api-lifecycle-plan.md, aidlc-docs/governance/api-governance/deprecation-schedule.md, aidlc-docs/governance/api-governance/api-registry.md
---

# API Governance

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas
Load aidlc-architect-agent persona and knowledge.

### Step 2: Build API Registry
Catalog all API endpoints: URL, method, version, consumers, authentication, rate limits.

### Step 3: Lifecycle Management
- Define versioning strategy (URL-based /v1, header-based, query param)
- Define deprecation policy (sunset period, sunset header in responses, consumer notification)
- Verify: deprecated endpoints emit Sunset header with date
- Verify: SDK generation from OpenAPI spec produces correct client code
- Audit: rate limits are fair across consumers (no single consumer starving others)

### Step 4: Generate deprecation schedule for any marked-for-removal endpoints

### Step 5: Update State
Mark api-governance as `[x]` completed.

### Step 6: Present Completion & Request Approval
Completion emoji: :globe_with_meridians:
Standard 2-option approval.
