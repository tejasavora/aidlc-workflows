---
trigger: always_on
description: AI-DLC method — the standing practices for this workspace
---

# AI-DLC method

The AI-DLC method is authored once at the workspace root, under
`aidlc/spaces/default/memory/`. It is the single hand-editable source of truth and is
identical on every harness.

**Read these before acting on any development request**, and re-read the phase file
when a workflow enters a new phase:

- `aidlc/spaces/default/memory/org.md` — framework defaults and org-wide guardrails
- `aidlc/spaces/default/memory/team.md` — this team's affirmed practices
- `aidlc/spaces/default/memory/project.md` — project-specific specialisation
- `aidlc/spaces/default/memory/phases/ideation.md`
- `aidlc/spaces/default/memory/phases/inception.md`
- `aidlc/spaces/default/memory/phases/construction.md`
- `aidlc/spaces/default/memory/phases/operation.md`

Resolution is strict-additive: `org → team → project → phase → stage`. A narrower layer
specialises a broader one; it never contradicts it.

> **Why this is a pointer and not an include.** Claude Code pulls the method in with
> `@`-imports and opencode with an `instructions` glob. Devin has no documented
> file-include mechanism inside a rule, so this file NAMES the method rather than
> embedding it — which means the method reaches context by the agent reading the
> files listed above. If you are running an AI-DLC stage, the engine resolves the
> same tree directly and does not depend on this rule.
>
> The files are named explicitly rather than globbed because that is what a reader
> can act on without a directory listing.
