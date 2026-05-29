---
name: aidlc-change-approval
description: |
  Gate changes through a configurable approval workflow. Cedar policy-driven:
  who can approve what, in which environment. All production changes require
  explicit human approval. Policy-driven (no human-clarification), artefact-verification: true.
metadata:
  phase: common
  stage: change-approval
  per-unit: "false"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "true"
  pack: governance
  max-attempts: 1
---

# Change Approval

Gate every change to a configured environment through a policy-driven approval workflow. The approval policy defines who must approve what — the skill enforces it, requests approvals, and blocks deployment until policy is satisfied.

## Inputs

- `aidlc-docs/<intent>/toolchain.yaml` → `governance.change_approval`
- Change details: what is being deployed, to which environment, which units changed
- Cedar policy document (if configured): `aidlc-docs/<intent>/governance/approval-policy.cedar`

## Execution

### Step 1: Determine Required Approvals

Read the approval policy for the target environment:
- How many approvers are required? (e.g., 2 for production)
- What roles are required? (e.g., lead-engineer + security-reviewer)
- Are any changes exempt? (e.g., documentation-only changes, hotfix path)

If Cedar policy exists → evaluate policy against the change context.
If no Cedar policy → use defaults from `toolchain.yaml` → `governance.change_approval.environments`.

Minimum default (non-configurable): production always requires at least 1 human approval.

### Step 2: Build Approval Request

Present the approval request to each required approver:
```markdown
## Change Approval Request

**Environment:** production
**Session:** aidlc-2024-01-15-abc123
**Requested by:** agent:aidlc-deploy
**Timestamp:** 2024-01-15T14:30:00Z

**Change Summary:**
- Deploying: order-service v1.2.0, user-service v1.1.5
- DB migrations: 2 pending (both reversible, reviewed in data-migration)
- Quality gates: all passed

**Required approvals:**
- [ ] lead-engineer (1 of 2)
- [ ] security-reviewer (2 of 2)

**Attached evidence:**
- static-analysis-report.md — all pass
- security-scan-report.md — 0 critical, 0 high, 2 medium (acknowledged)
- build-and-test-report.md — 127/127 tests passing
- smoke-test-staging.md — all critical paths pass

Approve? (approve / reject / request-changes)
```

### Step 3: Collect Approvals

For each required approver:
1. Present the request
2. Wait for response
3. Record: approver identity, decision, timestamp, any conditions

If rejected: block deployment, present rejection with reason to orchestrator.
If conditions: document conditions, present to deploy skill before proceeding.

### Step 4: Record Approval

Once all required approvals are collected:
1. Append to audit trail: `HUMAN_APPROVED` entries for each approver
2. Generate approval record:

```json
{
  "environment": "production",
  "change_id": "aidlc-2024-01-15-abc123-prod",
  "approvals": [
    {
      "approver": "human:alice@example.com",
      "role": "lead-engineer",
      "decision": "approved",
      "timestamp": "2024-01-15T14:35:00Z",
      "conditions": []
    },
    {
      "approver": "human:bob@example.com",
      "role": "security-reviewer",
      "decision": "approved",
      "timestamp": "2024-01-15T14:42:00Z",
      "conditions": ["monitor error rate for first 30 minutes post-deploy"]
    }
  ],
  "policy_satisfied": true
}
```

3. Write approval record to `aidlc-docs/<intent>/governance/approvals/<change-id>.json`
4. Unblock deployment

## Outputs

- `aidlc-docs/<intent>/governance/approvals/<change-id>.json` (per change)
- Audit trail entries for each approval decision

## Artefact Verification

`artefact-verification: "true"` — The approval record IS the artefact verification. Every approver sees the full evidence package before approving. No deployment proceeds without a complete, timestamped approval record.

## Policy Override

If the approval policy is evaluated as DENY for a proposed change:
- Present the policy denial with explanation
- Do NOT deploy
- Do NOT allow override without escalating to a human with override authority
- Log the denial in audit trail
