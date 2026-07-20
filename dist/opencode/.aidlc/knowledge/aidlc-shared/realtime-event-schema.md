# Real-Time Event Schema — Dashboard & Frontend Integration

AI-DLC emits structured events throughout workflow execution. These events power real-time dashboards, mobile notifications, project management UIs, and analytics. Any frontend (web, mobile, Slack bot, CLI) can consume this stream to show stakeholders what the AI is doing RIGHT NOW.

## Event Transport

Events are emitted to `aidlc-docs/events.jsonl` (append-only) AND optionally to a WebSocket/SSE endpoint for real-time UIs.

Each event is one JSON line with a common envelope:

```json
{
  "id": "<uuid>",
  "type": "<event-type>",
  "timestamp": "<ISO8601>",
  "workflow_id": "<workflow-uuid>",
  "session_id": "<session-uuid>",
  "stage": "<slug or null>",
  "phase": "<phase-name>",
  "unit": "<unit-name or null>",
  "agent": "<agent-slug or null>",
  "trust_level": "L1|L2|L3|L4",
  "payload": { ... }
}
```

## Event Types

### Workflow Lifecycle

```
WORKFLOW_STARTED
  payload: { scope, intent, trust_level, stages_planned, estimated_duration_minutes }

WORKFLOW_COMPLETED
  payload: { duration_seconds, stages_executed, stages_skipped, confidence_mean, readiness_score }

WORKFLOW_FAILED
  payload: { reason, last_stage, recovery_options }

WORKFLOW_PAUSED
  payload: { reason: "awaiting_human" | "cost_ceiling" | "escalation", resume_action }
```

### Phase Transitions

```
PHASE_STARTED
  payload: { phase, stages_in_phase, estimated_minutes }

PHASE_COMPLETED
  payload: { phase, duration_seconds, stages_completed, confidence_mean }
```

### Stage Execution

```
STAGE_STARTED
  payload: { slug, lead_agent, description, estimated_minutes }

STAGE_PROGRESS
  payload: { slug, step_current, step_total, description }

STAGE_AWAITING_HUMAN
  payload: { slug, question, options[], context_summary }

STAGE_HUMAN_RESPONDED
  payload: { slug, response, response_time_seconds }

STAGE_COMPLETED
  payload: { slug, duration_seconds, confidence, findings_count, auto_fixed, gate_outcome }

STAGE_FAILED
  payload: { slug, error, recovery_attempted, escalation_needed }
```

### Contract Events

```
CONTRACT_DEFINED
  payload: { unit, test_count, categories: {acceptance: N, api: N, integration: N} }

CONTRACT_TEST_RUN
  payload: { unit, function, test_name, result: "pass"|"fail", attempt, duration_ms }

CONTRACT_PASS_RATE_UPDATE
  payload: { unit, passed, total, rate_percent, delta_from_last }
```

### Code Generation Events

```
FUNCTION_GENERATED
  payload: { unit, function_name, file_path, lines_of_code }

FUNCTION_VERIFIED
  payload: { unit, function_name, contracts_passed, contracts_total }

FUNCTION_REGENERATED
  payload: { unit, function_name, attempt, reason, previous_error }

FUNCTION_ESCALATED
  payload: { unit, function_name, reason, attempts_exhausted }
```

### Deployment Events

```
SANDBOX_DEPLOYED
  payload: { version, endpoint_url, services_healthy, deploy_duration_seconds }

SANDBOX_HEALTH_CHECK
  payload: { status: "healthy"|"degraded"|"failed", endpoints_up, endpoints_total }

SANDBOX_ROLLBACK
  payload: { reason, from_version, to_version }
```

### Quality Events

```
QUALITY_CHECK_RUN
  payload: { type: "lint"|"security"|"coverage"|"contract", findings_count, severity_breakdown }

QUALITY_SELF_HEAL
  payload: { finding_id, category, action: "auto_fixed"|"design_fixed"|"escalated", description }

QUALITY_SCORE_UPDATE
  payload: { coverage_line, coverage_branch, security_score, readiness_score }
```

### Agent Interaction Events

```
AGENT_INVOKED
  payload: { agent, purpose, context_tokens_loaded }

AGENT_QUESTION_ASKED
  payload: { agent, question_text, options[], awaiting_human: boolean }

AGENT_DECISION_MADE
  payload: { agent, decision, reasoning_summary, confidence }

AGENT_KNOWLEDGE_CONSULTED
  payload: { agent, knowledge_file, query, result_useful: boolean }

AGENT_MCP_QUERY
  payload: { agent, server, tool, query, result_found: boolean, duration_ms }
```

### Human Interaction Events

```
HUMAN_APPROVAL_REQUESTED
  payload: { stage, artifact_summary, metrics_at_gate, auto_approve_eligible: boolean }

HUMAN_APPROVED
  payload: { stage, response_time_seconds, comments }

HUMAN_REVISION_REQUESTED
  payload: { stage, feedback_text, revision_number }

HUMAN_ESCALATION_RECEIVED
  payload: { stage, issue_description, resolution_action }
```

### Cost Events

```
COST_UPDATE
  payload: { tokens_input_total, tokens_output_total, estimated_cost_usd, budget_remaining_percent }

COST_WARNING
  payload: { threshold_percent: 80, current_cost, budget_ceiling }

COST_CEILING_HIT
  payload: { final_cost, budget_ceiling, action: "paused" }
```

## Dashboard Data Queries

A dashboard frontend needs these read endpoints (or computes from events.jsonl):

### Project Overview
```json
GET /api/workflow/{id}/status
{
  "workflow_id": "...",
  "status": "running | paused | completed | failed",
  "progress_percent": 67,
  "current_stage": "code-generation",
  "current_agent": "aidlc-developer-agent",
  "current_activity": "Generating auth module (function 3/8)",
  "started_at": "...",
  "estimated_completion": "...",
  "trust_level": "L2",
  "stages": { "completed": 12, "total": 18, "current": 13 },
  "health": { "contracts_passing": 24, "contracts_total": 30 },
  "confidence": 0.82
}
```

### Stage Timeline
```json
GET /api/workflow/{id}/timeline
[
  { "stage": "requirements-analysis", "status": "completed", "duration": 180, "confidence": 0.9 },
  { "stage": "contract-generation", "status": "completed", "duration": 120, "confidence": 0.95 },
  { "stage": "code-generation", "status": "running", "progress": 0.6, "functions_done": 5, "functions_total": 8 },
  { "stage": "security-scan", "status": "pending" }
]
```

### Live Agent Activity
```json
GET /api/workflow/{id}/agent/current
{
  "agent": "aidlc-developer-agent",
  "activity": "Generating createProject endpoint",
  "started_at": "...",
  "context": "Contract test: POST /api/projects returns 201",
  "attempts": 1,
  "last_action": "Generated 45 lines, running contract test..."
}
```

### Quality Dashboard
```json
GET /api/workflow/{id}/quality
{
  "coverage": { "line": 84, "branch": 72, "target": 80 },
  "security": { "critical": 0, "high": 0, "medium": 2, "low": 5 },
  "contracts": { "passing": 24, "failing": 2, "total": 26, "rate": 92 },
  "findings_history": [
    { "stage": "static-analysis", "found": 8, "fixed": 8, "remaining": 0 },
    { "stage": "security-scan", "found": 3, "fixed": 1, "remaining": 2 }
  ]
}
```

### Human Interaction Queue
```json
GET /api/workflow/{id}/pending
{
  "awaiting_human": true,
  "stage": "contract-generation",
  "question": "Are these 12 acceptance tests the correct definition of done?",
  "options": ["Approve", "Request Changes"],
  "context": { "tests_count": 12, "unit": "auth-module" },
  "waiting_since": "...",
  "auto_approve_eligible": false,
  "reason_human_needed": "L2 trust level — human approves all contracts"
}
```

## Mobile Push Notifications

Events that should trigger push notifications:

| Event | Notification |
|-------|-------------|
| WORKFLOW_COMPLETED | "Project X completed — 92% confidence, ready for review" |
| STAGE_AWAITING_HUMAN | "AI needs your input on [stage] — tap to respond" |
| FUNCTION_ESCALATED | "AI couldn't generate [function] after 3 attempts — needs help" |
| COST_WARNING | "Project X at 80% budget ($160/$200)" |
| QUALITY_SCORE_UPDATE (regression) | "Coverage dropped to 72% — below 80% threshold" |
| SANDBOX_HEALTH_CHECK (failed) | "Sandbox unhealthy — deployment may have issues" |

## Slack/Teams Integration

Post to configured channel:

```
🟢 [Project X] Stage completed: code-generation (confidence: 0.88)
   Contracts: 24/26 passing | Coverage: 84% | Next: security-scan
   
⚠️ [Project X] Awaiting human input: contract-generation
   "Are these acceptance tests correct for the auth module?"
   [Approve] [View Details]

🎉 [Project X] Workflow complete!
   Duration: 4h 23m | Confidence: 0.85 | Readiness: 91%
   Runtime validation: 100% endpoints healthy
   [View Dashboard] [Promote to Production]
```

## Analytics (Cross-Project)

For organizational metrics (across all projects):

```json
GET /api/analytics/summary
{
  "projects_completed_30d": 12,
  "mean_confidence": 0.83,
  "mean_contract_first_attempt_rate": 87,
  "mean_self_healing_rate": 91,
  "human_interventions_per_project": 4.2,
  "autonomous_readiness": "3/12 projects met L3 thresholds",
  "top_improvement_areas": [
    "functional-design detail (drives 40% of regenerations)",
    "frontend contract completeness (drives 30% of UI failures)"
  ],
  "cost_per_project": { "mean": 180, "p50": 150, "p95": 350 },
  "time_per_project": { "mean_hours": 5.2, "p50": 4.5, "p95": 8.0 }
}
```
