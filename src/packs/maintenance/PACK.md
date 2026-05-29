---
name: maintenance
description: |
  Ongoing maintenance lifecycle: design-first bug triage, dependency updates,
  and technical debt assessment. Activates on event triggers (bug reported,
  dependency alert, scheduled tech-debt review). All fixes are traced to design
  documents first — bugs are fixed at the root, not the symptom.
metadata:
  activation: event-triggered
  phase: maintenance
  runs-after: operations
  configurable: true
---

# Maintenance Extension Pack

## Activation

Activates on event triggers:
- **Bug reported**: user reports a defect or automated monitoring fires an alert
- **Dependency alert**: Dependabot, Renovate, or npm/pip audit flags a vulnerability
- **Tech debt review**: scheduled review or user explicitly requests assessment

## Configuration (captured in toolchain.yaml under `maintenance` section)

- **Bug tracking**: issue tracker URL (Jira, GitHub Issues, Linear, any)
- **Dependency update tool**: auto-detected (Dependabot, Renovate, pip-audit, npm-audit, any)
- **Tech debt thresholds**: complexity ceiling, coverage floor, dependency staleness cutoff
- **Review cadence**: how often tech-debt-assessment should run (on-demand, monthly, quarterly)

Example toolchain.yaml maintenance section:
```yaml
maintenance:
  bug_tracker: github-issues
  dependency_tool: dependabot
  tech_debt:
    complexity_threshold: 10
    coverage_floor: 75
    staleness_days: 180
    review_cadence: monthly
```

## The Design-First Principle

Every maintenance skill in this pack operates on the same principle: **read the design before touching the code**. The most common source of recurring bugs is fixing symptoms rather than roots. AI-DLC maintenance always asks: does the design account for this case? If not, fix the design first, then cascade to code and tests.

## Execution

Skills in this pack are NOT sequenced — they run independently on their trigger:

- `bug-triage` → triggered by bug report or test failure
- `dependency-update` → triggered by vulnerability alert or update PR
- `tech-debt-assessment` → triggered by user request or schedule

Each skill runs its own self-contained workflow.
