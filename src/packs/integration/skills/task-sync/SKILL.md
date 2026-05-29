---
name: aidlc-task-sync
description: |
  Create and update work items in the configured project management tool from AI-DLC
  artefacts. Stories → Jira/Linear/Asana epics and stories. Design artefacts linked.
  Tool-agnostic. human-clarification: true (ask mapping preferences on first run).
metadata:
  phase: common
  stage: task-sync
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "false"
  pack: integration
  max-attempts: 3
---

# Task Sync

Synchronise AI-DLC stories, units, and progress to the configured project management tool. Keeps the external backlog in sync with what AI-DLC actually builds, enabling traditional project tracking alongside the agentic workflow.

## Inputs

- `aidlc-docs/<intent>/inception/stories.md` — stories and acceptance criteria
- `aidlc-docs/<intent>/inception/units.md` — units (bounded contexts)
- `aidlc-docs/<intent>/toolchain.yaml` → `integrations.task_management`
- Construction progress (which units are complete)

## Execution

### Step 1: Human Clarification (first run only)

On first sync, ask:
1. How should stories map to work items? (epic → story, or 1:1, or flat)
2. Should units become epics?
3. What status should completed units get?
4. Should design document links be added to work items?
5. Should story acceptance criteria become sub-tasks?

Store preferences in `toolchain.yaml` → `integrations.task_management.mapping`.

### Step 2: Determine Sync Scope

What needs syncing now?
- **Inception complete**: create all stories + units as work items
- **Construction milestone**: update status of completed units
- **Bug fixed**: update linked work item status
- **Release published**: close sprint, update version

### Step 3: Create or Update Work Items

For each story in `stories.md`:
1. Check if work item already exists (search by title or AI-DLC ID tag)
2. If not exists → create:
   - Title from story title
   - Description from story description + acceptance criteria
   - Labels: `aidlc-generated`, unit name, phase
   - Link to functional-design document (if configured)
   - Priority from story priority label
3. If exists → update:
   - Update status (In Progress / Done based on construction state)
   - Add comment when design or implementation changes

Tool-specific API calls:
- **Jira**: `POST /rest/api/3/issue` → create; `PUT /rest/api/3/issue/{key}` → update
- **Linear**: GraphQL `issueCreate` / `issueUpdate`
- **GitHub Issues**: `POST /repos/{owner}/{repo}/issues` → create; `PATCH` → update
- **Asana**: `POST /tasks` → create; `PUT /tasks/{task_gid}` → update

### Step 4: Handle Failures

If external API is unavailable:
- Log the failure
- Queue the sync operation
- Retry on next trigger (non-blocking)
- After max-attempts: log and continue (integration failures do not block AI-DLC)

### Step 5: Record Sync State

Maintain `aidlc-docs/<intent>/integrations/task-sync-state.json`:
```json
{
  "last_synced": "2024-01-15T14:30:00Z",
  "tool": "jira",
  "mappings": {
    "story:USR-001": "MYPROJ-42",
    "story:USR-002": "MYPROJ-43"
  }
}
```

## Outputs

- Work items created/updated in configured tool
- `aidlc-docs/<intent>/integrations/task-sync-state.json` (ID mappings)
- `aidlc-docs/<intent>/integrations/task-sync-log.md` (what was synced, when)
