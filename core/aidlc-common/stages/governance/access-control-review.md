---
slug: access-control-review
phase: governance
execution: CONDITIONAL
condition: Execute for enterprise or security-patch scope to audit IAM privilege, stale access, and MFA enforcement.
lead_agent: aidlc-devsecops-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - access-inventory
  - privilege-review-report
  - break-glass-audit
  - access-control-questions
consumes:
  - artifact: deployment-architecture
    required: false
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - security-patch
inputs: Deployed IAM policies, roles, users, service accounts
outputs: aidlc-docs/governance/access-control-review/access-inventory.md, aidlc-docs/governance/access-control-review/privilege-review-report.md, aidlc-docs/governance/access-control-review/break-glass-audit.md
---

# Access Control Review

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas
Load aidlc-devsecops-agent persona and knowledge.

### Step 2: Enumerate Access
- List all IAM roles, users, groups, and policies
- Identify service accounts and their attached policies
- Map: which service uses which role, which humans have which access

### Step 3: Detect Over-Privilege
- Run IAM Access Analyzer or policy simulator for each role
- Flag: wildcard actions (*), wildcard resources (*), unused permissions (via Access Advisor)
- Flag: roles not used in 90+ days (stale access)
- Verify: MFA enforced on all human accounts
- Verify: no root account usage (check CloudTrail for root events)

### Step 4: Audit Break-Glass
- Identify emergency access mechanisms (break-glass roles)
- Verify: break-glass usage is logged and alerted
- Verify: break-glass credentials are rotated after each use

### Step 5: Generate least-privilege recommendations per role

### Step 6: Update State
Mark access-control-review as `[x]` completed.

### Step 7: Present Completion & Request Approval
Completion emoji: :closed_lock_with_key:
Standard 2-option approval.
