---
name: aidlc-audit-trail
description: |
  Ensure every significant decision, change, and approval is logged immutably.
  Runs automatically alongside all other skills. Format: timestamp, actor, action,
  rationale, artefacts affected. Verify completeness at each phase boundary.
metadata:
  phase: common
  stage: audit-trail
  per-unit: "false"
  human-clarification: "false"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "false"
  pack: governance
  max-attempts: 1
---

# Audit Trail

Log every significant event in the AI-DLC workflow to an immutable, structured audit trail. The audit trail is the evidence of what happened, when, who decided, and why — essential for compliance, incident investigation, and accountability.

## Inputs

- Events emitted by all other skills as they execute (subscribe to skill lifecycle events)
- Human inputs (clarifications, approvals, rejections) — captured verbatim
- `aidlc-docs/<intent>/toolchain.yaml` → `governance.audit_trail`

## What Gets Logged

Every entry MUST contain:
- `timestamp` — ISO 8601 with timezone
- `actor` — who or what performed the action (`agent:<skill-name>` or `human:<identifier>`)
- `action` — what happened (enumerated action types, see below)
- `artefacts_affected` — list of files/documents created, modified, or deleted
- `rationale` — WHY this action was taken (not just what)
- `session_id` — AI-DLC session identifier for correlation

Action types:
```
SKILL_STARTED, SKILL_COMPLETED, SKILL_FAILED, SKILL_ESCALATED
HUMAN_APPROVED, HUMAN_REJECTED, HUMAN_MODIFIED, HUMAN_CLARIFIED
ARTEFACT_CREATED, ARTEFACT_UPDATED, ARTEFACT_DELETED
DESIGN_UPDATED, CODE_GENERATED, TEST_GENERATED
DEPLOYMENT_TRIGGERED, DEPLOYMENT_SUCCEEDED, DEPLOYMENT_FAILED, ROLLBACK_TRIGGERED
DEPENDENCY_UPGRADED, SECURITY_FINDING_ACKNOWLEDGED
```

## Log Format

Each entry is a JSON line (JSONL) appended to the audit log:

```json
{
  "timestamp": "2024-01-15T10:35:42Z",
  "session_id": "aidlc-2024-01-15-abc123",
  "actor": "agent:aidlc-static-analysis",
  "action": "ARTEFACT_UPDATED",
  "artefacts_affected": ["src/services/order.py"],
  "rationale": "Auto-fixed 3 style violations (ruff --fix). Remaining 0 violations.",
  "metadata": {
    "unit": "order-service",
    "attempt": 1,
    "fixes_applied": 3
  }
}
```

## Log Location

Primary: `aidlc-docs/<intent>/governance/audit-trail.jsonl`
Secondary (if S3 configured): replicate to `governance.evidence_output` bucket

The JSONL file is append-only. Entries are never modified or deleted.

## Completeness Verification

At each phase boundary (inception complete, construction complete, operations complete), verify:
1. Every skill that ran has at least one `SKILL_STARTED` and one `SKILL_COMPLETED` or `SKILL_FAILED` entry
2. Every human approval has a corresponding `HUMAN_APPROVED` or `HUMAN_REJECTED` entry
3. Every artefact referenced in other reports exists in the log as `ARTEFACT_CREATED` or `ARTEFACT_UPDATED`
4. No gaps in session timeline (missing events between two entries)

If gaps are found → reconstruct from available evidence (other report files) and mark as `RECONSTRUCTED`.

## Outputs

- `aidlc-docs/<intent>/governance/audit-trail.jsonl` (append-only, never overwritten)
- `aidlc-docs/<intent>/governance/audit-summary-<phase>.md` at each phase boundary (human-readable summary of the phase's activity)
