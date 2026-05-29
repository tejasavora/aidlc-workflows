# Task Sync — Validation Spec

## Pass Criteria

- Work items exist in the configured tool for all synced stories (verifiable via API)
- Sync state file exists with ID mappings
- Sync log records what was created/updated and when
- Human mapping preferences were captured on first run
- Integration failures were logged (not silently swallowed) and did not block workflow

## Fail Criteria

- Stories from `stories.md` have no corresponding work items in external tool (sync silently failed)
- Sync state file is missing (no record of what was pushed)
- API credentials were hardcoded (should reference secrets, not inline values)
- Sync failure blocked the main AI-DLC workflow

## Validation Steps

1. Verify sync state file exists: `aidlc-docs/<intent>/integrations/task-sync-state.json`
2. For 3 stories from `stories.md`: confirm the mapped work item ID exists in the external tool (API call or UI check)
3. Verify sync log exists with at least one entry
4. Confirm toolchain.yaml credentials reference secrets (e.g., `$JIRA_TOKEN`) not inline values
5. If any sync failed: verify failure was logged in task-sync-log.md and workflow continued
