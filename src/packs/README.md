# Extension Packs

Extension packs bundle related capabilities that activate based on project needs. They extend the core AI-DLC workflow with autonomous quality gates, deployment, resilience testing, and more.

## Architecture

```
src/packs/
├── quality-gates/          Always active. Runs after code-generation per unit.
├── operations/             When deploy targets configured. Runs after construction.
├── resilience/             User-triggered or NFR-driven. Load/chaos/DR testing.
├── data-management/        When data sources identified. Migration/seeding/quality.
├── maintenance/            Event-triggered. Bug triage, deps, tech debt.
├── governance/             Regulated environments. Audit, compliance, change approval.
├── integration/            External tools. Jira/Confluence/Slack sync.
├── well-architected/       Enterprise workloads. HA/DR/cost/sustainability.
└── meta-skills/            On-demand. Knowledge acquisition, toolchain/data discovery.
```

## Pack Structure

Each pack follows this layout:

```
<pack-name>/
├── PACK.md                 Activation conditions, configuration, execution order
├── skills/
│   ├── <skill-name>/
│   │   ├── SKILL.md        Frontmatter + execution instructions
│   │   └── validation-spec.md  Pass/fail criteria
│   └── ...
└── tool-adapters/          (optional) Per-language defaults
    ├── python.yaml
    ├── typescript.yaml
    └── custom.yaml
```

## Key Concepts

### Tool-Agnostic
Skills define WHAT to do. `toolchain.yaml` (produced by toolchain-discovery) defines HOW. Skills read the toolchain to determine which tool to run, never hardcode a specific tool.

### Self-Healing Loops
Quality gate skills follow: run → fail → classify → auto-fix → re-run → pass/escalate. Max attempts configurable (default: 3).

### Activation
Packs activate during workflow-composition based on:
- Detected toolchain (from `toolchain.yaml`)
- User preferences (asked during composition)
- Project characteristics (regulated, multi-region, etc.)

### Trigger Points
- **quality-gates**: after each `code-generation` step
- **operations**: after all construction + quality gates pass
- **well-architected**: after `infrastructure-design`
- **data-management**: alongside `functional-design` and `infrastructure-design`
- **resilience**: user-triggered post-deploy
- **governance**: alongside all phases (continuous)
- **integration**: after each stage completes (post-hooks)
- **maintenance**: event-triggered (not during initial build)

### Meta-Skills
Not in workflow.md. Invoked on-demand by other skills:
- `knowledge-acquisition` — research unfamiliar tech via MCP
- `toolchain-discovery` — detect project tools, produce toolchain.yaml
- `data-discovery` — map data sources, verify access/schema/quality

## Schema Reference

- **toolchain.yaml format**: `aidlc-common/conventions/aidlc-toolchain-schema.md`
- **Pack skill flags**: See CATALOGUE.md Extension Packs section
- **State tracking**: `aidlc-common/conventions/aidlc-state-schema.md` (Active Packs table)
- **Workflow format**: `aidlc-common/conventions/aidlc-workflow-format.md` (`--pack` flag)

## Adding a New Pack

1. Create `src/packs/<pack-name>/PACK.md` with activation metadata
2. Create skills under `src/packs/<pack-name>/skills/<skill-name>/`
3. Each skill needs `SKILL.md` (with `pack:` in metadata) + `validation-spec.md`
4. Add pack to CATALOGUE.md Available Packs table + skill table
5. Add activation rule to workflow-composition SKILL.md §4
6. Run `make build-claude` and `make build-kiro` to verify
