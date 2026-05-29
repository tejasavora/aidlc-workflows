---
name: integration
description: |
  Synchronise AI-DLC workflow output to external tools: project management (Jira, Linear,
  Asana, GitHub Issues), documentation platforms (Confluence, Notion, GitBook), and
  notification channels (Slack, Teams, webhook). Activates when external tool integrations
  are configured. Syncs after each stage completes.
metadata:
  activation: when-external-tools-configured
  phase: common
  runs-after: each-stage
  configurable: true
---

# Integration Extension Pack

## Activation

Activates when `aidlc-docs/<intent>/toolchain.yaml` contains an `integrations` section with at least one configured external tool.

## Configuration (captured in toolchain.yaml under `integrations` section)

- **Task management**: tool name + project/board config (Jira, Linear, Asana, GitHub Issues, Azure DevOps, any)
- **Documentation**: target platform + space/folder (Confluence, Notion, GitBook, wiki, any)
- **Notifications**: channels + event filter (Slack, Teams, email, webhook, any)
- **Sync direction**: read (pull existing items), write (push AI-DLC output), or both

Example toolchain.yaml integrations section:
```yaml
integrations:
  task_management:
    tool: jira
    project: MYPROJ
    base_url: https://myorg.atlassian.net
    epic_per_story: true
    link_design_docs: true
  documentation:
    tool: confluence
    space: TECH
    parent_page: "AI-DLC Projects"
  notifications:
    tool: slack
    channels:
      deploy_events: "#deployments"
      approvals_needed: "#engineering-approvals"
      failures: "#alerts"
    events: [DEPLOYMENT_TRIGGERED, DEPLOYMENT_FAILED, HUMAN_APPROVAL_NEEDED, SKILL_FAILED]
```

## Execution Model

Integration skills run as **post-hooks** — they fire after key workflow events, not as a primary workflow step:
- `task-sync`: after inception completes (stories → tasks), after construction milestones
- `documentation-sync`: after each phase boundary (documents created → push to platform)
- `notification`: on any configured trigger event in real time

Integration failures are **non-blocking** — if Jira is unreachable, the AI-DLC workflow continues. Failures are logged and retried.

## Tool Adapter Pattern

Each skill reads `toolchain.yaml` → `integrations` to determine which external tool to use. The SKILL.md defines the CAPABILITY; the toolchain.yaml defines the TOOL and API credentials (via references to secrets — never inline).
