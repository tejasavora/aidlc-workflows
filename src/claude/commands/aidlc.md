---
description: Start or resume an AI-DLC workflow
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
---

# AI-DLC Orchestrator

You are activating the AI-DLC v2 workflow orchestrator.

## Instructions

1. Read the orchestrator protocol: `.aidlc/aidlc-common/protocols/aidlc-orchestrator-protocol.md`
2. Read the folder structure convention: `.aidlc/aidlc-common/conventions/aidlc-folder-structure.md`
3. Check if any `*/state/process-checkpoint.json` exists (indicates a workflow in progress)
4. Follow the orchestrator protocol exactly:
   - If no active workflow: run the bootstrap pre-loop (intent capture → workflow composition)
   - If resuming: read the process checkpoint and continue from where you left off
5. For each skill, load its `SKILL.md` from `.aidlc/skills/<skill-name>/` or `.aidlc/packs/<pack-name>/skills/<skill-name>/`
6. Use the Agent tool with `subagent_type: "aidlc-builder"` for clarification, planning, and execution steps. Pass all required file paths and context in the `prompt`.
7. Use the Agent tool with `subagent_type: "aidlc-validator"` for validation steps. Pass artifact paths and validation-spec path in the `prompt`.
8. After every builder/validator Agent invocation, run process_checker:
   ```bash
   node .aidlc/aidlc-common/scripts/aidlc-process-checker.js --from-state <intent-dir>/state/process-checkpoint.json
   ```
9. Read the checkpoint file and follow its instructions before proceeding

## Extension Packs

After code-generation, check `.aidlc/packs/` for active extension packs. The quality-gates pack runs automatically after each unit's code generation:
- static-analysis → security-scan → build-and-test → coverage-enforcement → code-review

Each pack skill follows a self-healing loop: run → diagnose → fix → re-run (max 3 attempts → escalate to human).

## Meta-Skills

Invoke meta-skills when needed:
- `knowledge-acquisition`: Before generating code for unfamiliar technology
- `toolchain-discovery`: During bootstrap to detect project tools → produces toolchain.yaml
- `data-discovery`: During application-design to map all data sources

## Platform Notes

- When the orchestrator protocol says `invokeSubAgent` with `aidlc-builder-agent` → use Agent tool with `subagent_type: "aidlc-builder"`
- When it says `invokeSubAgent` with `aidlc-validator-agent` → use Agent tool with `subagent_type: "aidlc-validator"`
- The install root for all `.aidlc/` paths is the project root (NOT `.claude/`)
- A PostToolUse hook automatically runs process_checker on Edit/Write operations; still run it manually after Agent tool returns

## Path Convention

All framework paths (`skills/...`, `packs/...`, `aidlc-common/...`) resolve relative to `.aidlc/`. Project artifacts are written to `aidlc-docs/` at the project root.

$ARGUMENTS
