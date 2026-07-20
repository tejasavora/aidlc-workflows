---
trigger: always_on
description: "AI-DLC V1 active — structured development lifecycle with three phases"
---

# AI-DLC Active

This project uses AI-DLC (AI-Driven Development Life Cycle).

## How to Start
- Run `/aidlc` to begin or resume a structured workflow
- Or describe what you want to build — AI-DLC will guide the process

## Organization
- **AGENTS.md** — Core workflow + oversized rules (always loaded)
- **.windsurf/rules/** — Phase-specific rules (loaded by context)
- **.windsurf/workflows/aidlc.md** — `/aidlc` trigger

## Lifecycle
1. **Inception**: Requirements → User Stories → Application Design → Units
2. **Construction**: Functional Design → NFR → Infrastructure → Code → Build & Test
3. **Operations**: Deploy (placeholder)

## Key Principles
- Ask clarifying questions before generating
- Present each stage for human approval before proceeding
- Every design decision traces to a requirement
- Adaptive depth based on project complexity
