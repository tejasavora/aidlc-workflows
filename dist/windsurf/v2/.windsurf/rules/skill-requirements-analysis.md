---
trigger: model_decision
description: "AI-DLC V2 skill: requirements-analysis"
---


# Requirements Analysis

Elicit, structure, and validate requirements from the human's statement of intent. Determine whether the intent is greenfield, brownfield, or a mix by reasoning over the RE-kb.

## Prerequisites

- org-ai-kb must be set up
- RE-kb must be hydrated (if existing repos are in scope)

## Input

- Human's statement of intent
- RE-kb summaries, integration maps, and domain entities for all repos

## Question Guidance

Focus clarifying questions on:

- What exactly is being requested? What is the expected outcome?
- Request type: new feature, bug fix, refactoring, migration, enhancement, new project?
- Scope: single component, multiple components, system-wide, cross-system?
- Based on RE-kb, infer whether this is greenfield or brownfield. If RE-kb has relevant repos, state your assessment and ask the human to confirm: "This looks like a brownfield change affecting repos X and Y — is that correct?"
- If RE-kb has repos, identify which appear affected and confirm scope with the human.
- Functional requirements: core features, user interactions, system behaviours, data requirements.
- Non-functional requirements: performance, security, scalability, usability.
- Business context: goals, success criteria, stakeholder needs, constraints.
- Compliance: regulatory, accessibility, data privacy considerations.

## Output

A requirements document named `requirements.md` containing:

- **Intent summary** — type (new feature, bug fix, migration, etc.), scope (single component to system-wide), complexity, greenfield/brownfield classification, affected repos
- **Functional requirements** — numbered `FR-<n>`, each verifiable as pass/fail
- **Non-functional requirements** — measurable where possible (e.g. "p95 < 200ms", not "fast")
- **Assumptions** — flagged as assumptions, not stated as facts
- **Out of scope** — explicitly excluded items

All sections mandatory. If empty, state "None identified".

## Validation

Validation rules for this skill's output live in `validation-spec.md` at the skill root. Deterministic post-condition scripts live in `scripts/`. See `aidlc-common/protocols/aidlc-validator-protocol.md` for how they are applied.
