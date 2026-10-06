---
description: AI-DLC standing practices for this workspace
trigger: always_on
---

<!--
  .devin/rules/aidlc.md — the always-on AIDLC method pointer (a READ
  instruction, not a copy). The AI-DLC method is authored ONCE at the
  workspace root under aidlc/spaces/default/memory/ — the single hand-editable
  source of truth, identical on every harness.

  Devin rules do not expand @-import lines (measured: `devin rules show`
  prints the literal @-line), so this rule names the method files and the
  agent reads them. `.devin/rules/*.md` with `trigger: always_on` loads on
  Devin CLI and Devin Local (measured with `devin rules list`, which reports it
  as "[Devin] always-on"; `devin rules paths` omits the directory, a reporting
  gap only). The paths ship pointed at the always-present `default` space;
  `/aidlc space <name>` re-points them IN PLACE. At `default` the re-point is a
  byte-identical no-op. AIDLC's own stage resolver reads the same tree
  directly, so stage correctness does not depend on this file.

  Edit the METHOD at aidlc/spaces/default/memory/*, never here.
-->

This workspace uses the AI-DLC method. Its standing practices are the layered
files listed below (org -> team -> project; strict-additive). Read them before
acting on AIDLC work, and honour them in casual chat that touches process,
practices, or workflow questions:

- aidlc/spaces/default/memory/org.md
- aidlc/spaces/default/memory/team.md
- aidlc/spaces/default/memory/project.md

When a workflow is in a phase, also read that phase's practices:

- aidlc/spaces/default/memory/phases/ideation.md
- aidlc/spaces/default/memory/phases/inception.md
- aidlc/spaces/default/memory/phases/construction.md
- aidlc/spaces/default/memory/phases/operation.md
