# Production-Grade UX Patterns

When the design agent produces wireframes, interaction specs, or screen-data-maps, it must include enough detail for code-generation to produce fully functional UI — not just pages that return HTTP 200.

## Template Contract Pattern

Every page/screen specification must include a **template contract** — the exact data shape the rendering layer requires. This eliminates the gap between "what the design says the page shows" and "what the route actually passes."

### Format

```yaml
# overview.contract.yaml (or inline in screen-data-map.md per page)
page: /overview
render_strategy: server  # server | spa | hybrid

context:
  stats:
    type: object
    fields:
      clients: {type: int, source: "connection_manager.client_count"}
      servers: {type: int, source: "connection_manager.server_count"}
      tools: {type: int, source: "tool_index.count"}
  servers:
    type: "list[ServerStatus]"
    source: "connection_manager.get_all_status()"
  recent_calls:
    type: "list[CallRecord]"
    source: "metrics_db.get_recent(limit=5)"

partials:
  - url: "/api/partials/stats"
    trigger: "every 30s"
    target: "#stats-row"
    content_type: "text/html"
    renders: "partials/stats-row.html"
    context_subset: [stats]
  - url: "/api/partials/recent-calls"
    trigger: "every 15s"
    target: "#recent-calls-table"
    content_type: "text/html"
    renders: "partials/recent-calls-table.html"
    context_subset: [recent_calls]

websockets:
  - url: "/ws/feed"
    direction: "server→client"
    message_schema:
      type: "call_completed"
      timestamp: "ISO8601"
      client_id: "string"
      tool_name: "string"
      latency_ms: "number"
      status: "success | error"
```

### Rules

1. Every `{{ variable }}` in the design must have a `context:` entry with type and source
2. Every real-time update must specify: partial endpoint OR WebSocket channel
3. Every partial endpoint must specify: URL, trigger, target element, and content type (always HTML for htmx)
4. Never mix server-render and client-fetch for the same data section without explicit render_strategy annotation

## State Matrix Pattern

Every page design must specify all states, not just the happy path:

```markdown
## States: Tool Catalog Page

| State | Condition | What Renders |
|-------|-----------|-------------|
| Happy | tools.length > 0 | Full table with data, search, filters |
| Empty | tools.length == 0 | "No tools discovered yet" + "Run sync" CTA button |
| Loading | initial fetch in progress | Skeleton table (gray animated rows) |
| Error | API returns 5xx | "Unable to load tools. Retry?" + retry button |
| Partial | some servers unreachable | Table shows available tools + warning banner |
| Filtered-empty | search returns 0 results | "No tools match '[query]'. Clear search?" |
```

### Rules

1. Every page must have at minimum: happy, empty, error states defined
2. Empty state must include actionable copy (what to do, not just "no data")
3. Error state must include a retry mechanism (button, auto-retry timer)
4. Loading state must use skeleton/spinner (not blank space)
5. Code-generation MUST implement all defined states, not just happy

## Interaction Inventory Pattern

Every interactive element in the design must have an explicit backend contract:

```markdown
## Interactions: Server Status Page

| Element | Action | Backend | Request | Response | UI Feedback |
|---------|--------|---------|---------|----------|-------------|
| Restart btn | click | POST /api/servers/{id}/restart | {} | {status: "restarting"} | Button shows spinner → toast "Restarting..." → badge updates on next poll |
| Disable toggle | change | PUT /api/servers/{id} | {enabled: false} | {enabled: false} | Toggle animates → card grays out → tools removed from search |
| Sync btn | click | POST /api/servers/{id}/sync | {} | {tools_indexed: N} | Button shows spinner → toast "Synced N tools" |
| Server card | click | navigate | — | — | Navigate to /servers/{id}/detail |
```

### Rules

1. Every button, form, toggle, and link must have an interaction row
2. Each interaction specifies: trigger, backend endpoint, request shape, response shape, UI feedback
3. If the backend endpoint doesn't exist yet, it's flagged for code-generation
4. UI feedback must include: immediate feedback (spinner/disable), success feedback (toast/update), error feedback (toast/revert)

## Partial Endpoint Pattern (htmx/Turbo/AJAX)

For server-rendered apps with dynamic updates:

1. The initial page render and the partial refresh MUST produce identical HTML structure for the updated section
2. Partial endpoints return HTML fragments, NEVER JSON (htmx swaps innerHTML)
3. Each partial has its own template file (e.g., `partials/stats-row.html`) that is also `{% include %}`'d in the full-page template
4. This ensures visual continuity: initial render and subsequent polls produce the same HTML

```
Full page template:
  {% include "partials/stats-row.html" %}

Partial endpoint (/api/partials/stats):
  return render_template("partials/stats-row.html", **context_subset)
```

## WebSocket Contract Pattern

1. Define message schema in interaction-spec (type, fields, direction)
2. Specify the event source (what backend action triggers the WS message)
3. Specify the client handler (what DOM manipulation happens on message receipt)
4. Specify reconnection behavior (auto-reconnect with backoff, fallback to polling)

## Empty State Design Guidelines

Good empty states:
- Tell the user WHY it's empty (first run, no data yet, filtered too aggressively)
- Tell the user WHAT TO DO (specific action, not generic "add data")
- Provide a CTA button that takes the action (not just text instructions)
- Use friendly, non-technical language
- Include a subtle visual (icon, illustration) that reinforces the message

Bad empty states:
- "No data" (what data? why? what now?)
- Blank white space (is it loading or empty?)
- Technical error message ("null reference in data provider")
- Table headers with zero rows and no explanation
