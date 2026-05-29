---
name: aidlc-notification
description: |
  Notify team of workflow progress, failures, and required approvals. Configurable:
  which events trigger notifications, which channel receives them. Tool-agnostic:
  Slack, Teams, email, webhook. human-clarification: true (ask channels on first run).
metadata:
  phase: common
  stage: notification
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "false"
  pack: integration
  max-attempts: 3
---

# Notification

Send real-time notifications to the team when significant events occur in the AI-DLC workflow. Enables human oversight without requiring constant monitoring of the agent session.

## Inputs

- Event stream from all active skills (event type + context)
- `aidlc-docs/<intent>/toolchain.yaml` → `integrations.notifications`
- Human approval requests (from `change-approval`, `artefact-verification` gates)

## Execution

### Step 1: Human Clarification (first run only)

Ask:
1. Where should notifications be sent? (Slack workspace/channels, Teams channel, email, webhook URL)
2. Which events should trigger notifications? (suggest sensible defaults, allow override)
3. Should approval requests be sent to a dedicated channel?
4. Who should be tagged/mentioned for approvals? (@person or @role)

Default event-to-channel recommendations:
```
DEPLOYMENT_TRIGGERED     → #deployments
DEPLOYMENT_SUCCEEDED     → #deployments
DEPLOYMENT_FAILED        → #alerts + @on-call
HUMAN_APPROVAL_NEEDED    → #engineering-approvals + @lead-engineer
SKILL_FAILED             → #alerts
SECURITY_FINDING_HIGH    → #security + @security-reviewer
RELEASE_PUBLISHED        → #deployments + #general
```

Store configuration in `toolchain.yaml` → `integrations.notifications.channels`.

### Step 2: Subscribe to Events

Register to receive events from all active skills. On each event:
1. Check if event type matches any configured channel filter
2. If match: format and send notification

### Step 3: Format Notifications

Format depends on event type:

**Deployment succeeded:**
```
✓ Deployed order-service v1.2.0 to production
  3 units | 127 tests passing | smoke tests: 5/5 pass
  Deployed by: AI-DLC | Approved by: alice, bob
```

**Approval needed:**
```
⏸ Approval needed: deploy to production
  Requesting: @alice (lead-engineer)
  Change: order-service v1.2.0 + user-service v1.1.5
  Evidence: [link to approval request]
  Reply with: approve / reject
```

**Skill failed:**
```
✗ Static analysis failed: order-service unit
  3 remaining issues after 3 attempts
  Needs human guidance → [link to escalation report]
```

**Release published:**
```
🎉 Released v1.2.0
  2 new features | 1 bug fix
  Changelog: [link]
```

### Step 4: Handle Delivery Failures

If notification delivery fails:
- Retry up to max-attempts with exponential backoff
- Log delivery failure
- Do NOT block workflow for notification failures
- If approval notification fails: attempt alternative channel (fallback in config)

### Step 5: Capture Responses (Approval Channel)

If using a Slack/Teams bot that can receive responses:
- Parse `approve` / `reject` / `request-changes` responses
- Forward to the waiting `change-approval` skill
- This enables fully async human approval via chat

## Outputs

- Notifications delivered to configured channels
- `aidlc-docs/<intent>/integrations/notification-log.md` (what was sent, when, delivery status)
