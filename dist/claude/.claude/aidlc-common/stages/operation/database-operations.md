---
slug: database-operations
phase: operation
execution: CONDITIONAL
condition: Execute when the system uses databases that require Day-2 operational management (monitoring, maintenance, failover verification).
lead_agent: aidlc-operations-agent
support_agents:
  - aidlc-aws-platform-agent
mode: inline
produces:
  - db-operations-plan
  - db-health-checks
  - maintenance-schedule
  - database-operations-questions
consumes:
  - artifact: deployment-log
    required: true
  - artifact: migration-plan
    required: false
requires_stage:
  - deployment-execution
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
inputs: Deployed database, migration artifacts, infrastructure design
outputs: aidlc-docs/operation/database-operations/db-operations-plan.md, aidlc-docs/operation/database-operations/db-health-checks.md, aidlc-docs/operation/database-operations/maintenance-schedule.md
---

# Database Operations

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas
Load aidlc-operations-agent persona and knowledge from `.claude/knowledge/aidlc-operations-agent/database-operations-patterns.md`.

### Step 2: Configure Health Monitoring
- Connection pool utilization alarm (> 80% = warning, > 95% = critical)
- Replication lag alarm (> 5s = warning, > 30s = critical)
- Storage utilization alarm (> 80% = warning, auto-scale or alert)
- IOPS utilization alarm (sustained > 80% = review provisioning)
- Slow query log threshold (> 1s = log, > 5s = alert)
- Deadlock detection and alerting

### Step 3: Define Maintenance Schedule
- Vacuum/analyze schedule (PostgreSQL: nightly off-peak, or autovacuum tuning)
- Index maintenance (rebuild bloated indexes, identify unused indexes)
- Statistics update cadence
- Maintenance window for RDS (when patches apply)
- Backup verification schedule (monthly restore test)

### Step 4: Connection Pool Sizing
- Formula: pool_size = (cpu_cores * 2) + spindles (or SSD equivalent)
- Verify application connection pool matches database max_connections
- Configure connection timeout, idle timeout, validation query
- Leak detection: alert if connections not returned within threshold

### Step 5: Failover Testing
- Script automated failover test (RDS: reboot with failover)
- Measure: time to detect failure + time to route to replica
- Verify: application reconnects without manual intervention
- Verify: no data loss during failover (check replication lag at switch time)

### Step 6: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :floppy_disk:
- Summary of db-operations-plan, db-health-checks, maintenance-schedule
- Review path: `<record>/operation/database-operations/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .claude/tools/aidlc-orchestrate.ts report --stage database-operations --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/database-operations/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/database-operations/required-sections-<iso>.md`.

## Learn

While running this stage, maintain a running log in
`<record>/<phase>/<stage>/memory.md` (create on stage start if absent).
Append entries under four standard headings:

- **Interpretations** — choices made where the stage prose was ambiguous
- **Deviations** — places you intentionally departed from the stage prose, and why
- **Tradeoffs** — alternatives considered and why you picked what you did
- **Open questions** — anything to confirm before next run, or uncertain context

Format each entry with an ISO 8601 timestamp:
`- 2026-05-20T10:14:32Z — <summary>; <context>`

Before the approval gate, read memory.md and surface candidates as a
structured question. For each entry the user keeps, write to the appropriate
harness destination per `stage-protocol.md` §13 — never to this stage file:

- Prescriptive rule → a practice line under the routed heading in
  `aidlc/spaces/<active-space>/memory/project.md` (default) or `team.md` (promoted)
- Verification check → new manifest at `.claude/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
