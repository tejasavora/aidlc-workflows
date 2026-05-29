---
name: aidlc-documentation-sync
description: |
  Push design documents to the configured knowledge base. Maps AI-DLC artefacts to
  knowledge base pages. Tool-agnostic: Confluence, Notion, GitBook, wiki, any.
  human-clarification: true (ask where to push on first run). Non-blocking on failure.
metadata:
  phase: common
  stage: documentation-sync
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "false"
  pack: integration
  max-attempts: 3
---

# Documentation Sync

Push AI-DLC design documents to the configured knowledge base platform, making them discoverable and navigable by the broader team without requiring access to the git repository.

## Inputs

- `aidlc-docs/<intent>/` — all phase documents (requirements, stories, design, reports)
- `aidlc-docs/<intent>/toolchain.yaml` → `integrations.documentation`
- Phase boundary signal (sync triggers after each phase completes)

## Execution

### Step 1: Human Clarification (first run only)

Ask:
1. Where should AI-DLC documents live in your knowledge base?
   - Confluence: which space and parent page?
   - Notion: which database or page?
   - GitBook: which space?
2. Should documents be public or restricted to the project team?
3. Should previous versions be archived or overwritten?
4. Which document types should be synced? (all, or only requirements + API docs, etc.)

Store preferences in `toolchain.yaml` → `integrations.documentation.mapping`.

### Step 2: Determine Documents to Sync

Based on what just completed:
- **After inception**: sync requirements.md, stories.md, domain-model.md, nfr-requirements.md
- **After each unit construction**: sync functional-design, nfr-design for that unit
- **After operations**: sync deployment-design.md, API docs, ADRs, README
- **On demand**: sync all

### Step 3: Push Documents

For each document:
1. Convert from markdown to platform format (Confluence: storage format; Notion: blocks API)
2. Check if page already exists (search by title or stored ID)
3. If not exists → create under configured parent
4. If exists → update content, preserve page metadata (labels, watchers)
5. Preserve AI-DLC cross-links: `aidlc-docs/` relative links → converted to platform page links

Tool-specific push:
- **Confluence**: `PUT /wiki/rest/api/content/{id}` with storage format body
- **Notion**: `PATCH /v1/blocks/{block_id}/children` with blocks payload
- **GitBook**: Git push to GitBook-synced repository branch
- **GitHub Wiki**: `git push` to wiki repository
- **Generic wiki**: API call per platform

### Step 4: Maintain Page Map

Store page ID ↔ aidlc-doc path mapping in `aidlc-docs/<intent>/integrations/doc-sync-state.json`:
```json
{
  "last_synced": "2024-01-15T14:30:00Z",
  "tool": "confluence",
  "mappings": {
    "inception/requirements.md": "https://myorg.atlassian.net/wiki/spaces/TECH/pages/12345",
    "construction/order-service/functional-design/api-design.md": "https://..."
  }
}
```

### Step 5: Handle Failures

Non-blocking: if the documentation platform is unreachable, log and continue.
Do not fail the AI-DLC workflow for documentation sync failures.

## Outputs

- Pages created/updated in configured documentation platform
- `aidlc-docs/<intent>/integrations/doc-sync-state.json`
- `aidlc-docs/<intent>/integrations/doc-sync-log.md`
