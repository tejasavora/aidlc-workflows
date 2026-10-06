# AI-DLC on Devin

`dist/devin/` is one of the framework's harness distributions, for
[Devin](https://devin.ai). One tree serves both the **Devin CLI** (terminal) and
**Devin Desktop**'s "Devin Local" agent, which the vendor documents as the same
agent harness reading the same project files. One deterministic core, many
harnesses: the engine, state machine, audit log, graph, swarm referee, and
learnings gate are byte-identical across every distribution - only the shell
differs. The tree is **generated** from `core/` + `harness/devin/` by
`bun scripts/package.ts`; never hand-edit it.

Two Devin surfaces are deliberately **not** targets:

- **Cascade**, the legacy agent inside the same app (Windsurf was rebranded to
  Devin Desktop in June 2026). It reads different files.
- **Devin Cloud**, which is **untested here**. Nothing in this chapter should be
  read as a Cloud claim.

Facts below were measured on Devin CLI **3000.6.12** and **3000.11.3**
(2026-10-05) with a stdin-capture hook on every event, unless another version is
named. Devin auto-updates (it moved from 3000.6.12 to 3000.11.3 during that
measurement), so re-check a fact against your build before relying on it.

## Layout

- **`.devin/`** - the framework tree. Devin reads these subdirs as native
  meaning: `skills/` (the orchestrator, session skills, and generated stage
  runners - 42 in all), `agents/` (the 14 personas as subagent profiles),
  `rules/` (two always-on rules, below), and `hooks.v1.json` (the hook wiring)
  with `hooks/aidlc-devin-adapter.ts` beside the core hooks. `config.json`
  carries only a `permissions` allowlist. The engine dirs (`tools/`,
  `aidlc-common/`, `knowledge/`, `sensors/`, `scopes/`) are inert data to Devin.
- **`aidlc/`** - the workspace shell (the pre-built
  `aidlc/spaces/default/memory/` method tree the engine reads).
- **`AGENTS.md`** - the neutral project-root onboarding, byte-identical to the
  other `AGENTS.md` harnesses. Devin reads it as an always-on rule.

Always-on rules this install adds (as `devin rules list` reports them):

| Rule | File | Bytes |
|---|---|---|
| `AGENTS [Standard]` | `AGENTS.md` | 7,826 |
| `aidlc-onboarding [Devin]` | `.devin/rules/aidlc-onboarding.md` | 15,357 |
| `aidlc [Devin]` | `.devin/rules/aidlc.md` (the method pointer) | 1,753 |

`.devin/rules/*.md` loads only with `trigger: always_on` in its frontmatter;
`devin rules paths` omits the directory, which is a reporting gap only.

## Prerequisites

- **Devin CLI, or Devin Desktop.** Hooks need CLI **3000.3.22** or later: below
  it a hook's exit 2 cannot refuse a tool call. Desktop bundles its own CLI at
  `/Applications/Devin.app/Contents/Resources/app/extensions/windsurf/devin/bin/devin`
  (not on PATH), and it can lag the standalone CLI. `/aidlc --doctor` reads PATH,
  then that bundle path, and degrades to advisory when it finds neither.
- **Workspace trust.** Devin runs no project hooks in a workspace it has not
  trusted. Run `devin` interactively in the project once and accept the trust
  prompt (or accept it in Desktop). Desktop's **Restricted Mode** disables every
  agent and every hook silently, so check it first when nothing fires.
- **bun** on the PATH that Devin's non-interactive shells see.
- **A capable model for the main session.** The orchestrator skill is about
  92 KB; Devin 3000.11.3 reports it as "too large to return inline" and the model
  reads it in parts. SWE-1.6 was observed answering a bare `/aidlc <request>`
  without running the first step. Use the strongest model your plan offers.

## Install

1. Copy the distribution into your project:

   ```bash
   cp -R dist/devin/.devin dist/devin/aidlc your-project/
   cp dist/devin/AGENTS.md your-project/          # see the collision note below
   ```

   Copy or merge the AI-DLC block of `dist/devin/.gitignore` into your
   project's `.gitignore`.

   > **If your project already has an `AGENTS.md`, a `.gitignore`, or a
   > `.devin/config.json`, do not overwrite them.** Merge the shipped content in.
   > `.devin/config.json` carries only `permissions`, so merging it is one key.

2. Start Devin in the project and run `/aidlc --doctor`, then `/aidlc` followed
   by what you want to build.

## What's different on this harness

- **Devin imports Claude Code's configuration by default - including its
  hooks** (`read_config_from.claude`). Do not install this distribution into a
  project that also carries the AI-DLC Claude Code install: both hook sets would
  load and each audit event would be written twice. One harness per project.
  `~/.claude/CLAUDE.md` is imported as an always-on rule too, which matters for
  the rule budget below.
- **The always-on rule budget is shared, and Devin now omits rather than
  truncates.** Measured on 3000.11.3: with only this install's three rules
  (24,936 bytes) every rule loaded in full. With a 12,711-byte personal
  `~/.claude/CLAUDE.md` also imported (37,647 bytes in total), Devin left
  `AGENTS.md` out and told the model "These rules were triggered but could not
  be injected due to token limits. Read them when relevant using the read_file
  tool" (the string is in the 3000.11.3 binary). So a large personal rule file
  can push AI-DLC's neutral onboarding out of the always-on context; the model
  is told where to read it. Older builds (3000.6.7) truncated an oversized rule
  instead.
- **Hooks ride `.devin/hooks.v1.json`** through the adapter. The hooks object
  **is** the whole file; there is no `"hooks"` wrapper key. Devin's payloads are
  Claude Code's envelope with three differences the adapter translates:
  - **Tool names** are lowercase snake_case (`exec`, `write`, `edit`, `read`,
    `glob`, `grep`, `run_subagent`, `todo_write`). Several core hooks compare
    `tool_name` internally, so a matcher-only rename would leave them loaded and
    silently doing nothing. File tools already carry Claude's input keys
    (`file_path`, `old_string`, `new_string`).
  - **`run_subagent`** sends `{title, task, profile, is_background}`. The adapter
    adds Claude's Task keys for the core and returns a stage-rule rewrite to
    Devin as `updatedInput.task` (Devin merges a partial `updatedInput`;
    verified live: the dispatched persona received the stage's rule bundle).
  - **`todo_write`** sends `{todos: [{content, status}]}`; the adapter projects
    the in-progress todo into the shape state sync reads.
- **Seven hook events are wired**: `SessionStart`, `SessionEnd`,
  `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PostCompaction`, and `Stop`.
- **No `SubagentStop`.** A foreground subagent's completion is its
  `run_subagent` result; a background one's is the first `read_subagent` reply
  that reports it done. The adapter logs each completion exactly once, and never
  for a refused spawn (Devin fires `PostToolUse` on a refused spawn too, with
  `success: false`).
- **A subagent's own tool calls and its own `Stop` arrive with the parent's
  session id** and no agent identity. The adapter records each foreground
  dispatch while it is in flight and lets a `Stop` through untouched while one is
  outstanding: without that, the forwarding-loop gate would tell the subagent to
  drive the parent workflow (verified by removing the check in a test). For the
  same reason the per-unit **reviewer read-scope bound is not enforced on
  Devin**: that hook identifies the reviewer from the payload's `agent_type`,
  which Devin never sends, so it fails open (as on Kiro IDE).
- **No `PreCompact`.** `PostCompaction` fires after a compaction, so state
  validation runs afterwards and cannot veto one.
- **Personas carry no `model:`.** Devin runs an unpinned profile on the
  organization's default subagent model (SWE-1.6 unless an admin chose another),
  not on the session model. A pinned profile (`opus`, `sonnet`, `swe`, or a full
  model id) was refused at spawn ("Permission denied: an internal error
  occurred") on an account whose plan did not include that model, while the same
  profile unpinned ran. A refused spawn stops every delegated stage, so AI-DLC
  ships none. Each persona carries `allowed-tools: ["read", "edit", "grep",
  "glob", "exec"]`, which leaves out `run_subagent` (no nested delegation);
  `edit` is enough to create a new file (verified).
- **Questions render as numbered prose.** While a workflow runs, the adapter
  refuses Devin's `ask_user_question` picker (verified live), because a picker
  answer arrives as a tool result rather than as the person's own message, and
  a picker can be skipped without blocking. Devin also withholds the picker from
  subagents, so a stage that must ask questions runs in the main session.
- **Your messages are what record a decision.** `UserPromptSubmit` fires only
  for the person's own message (not for a subagent's brief) and delivers it
  unwrapped; the adapter hands it to the human-turn hook through the dispatcher,
  which records `HUMAN_TURN` (verified live).
- **Permissions.** `Exec(...)` grants match whole words, so a directory prefix
  such as `Exec(bun .devin/tools)` does not cover `bun .devin/tools/aidlc.ts`.
  The shipped `config.json` lists AI-DLC's own engine routes, read-only checks
  (including the `--version`, `--status` and `--help` spellings), and tool
  scripts; every other command still asks. Avoid
  `--permission-mode accept-edits` outside a scratch project.
- **Print mode (`devin -p`) cannot answer a prompt.** A reviewer subagent that
  needs a shell command outside the shipped list is refused ("Subagent error:
  Tool was rejected", CLI 3000.11.3), and the engine then refuses the gate with
  `REVIEW_EVIDENCE_MISSING`. A Devin permission applies to every agent in the
  session, not only the reviewer, so the package does not ship broader rules;
  grant read-only shell commands in your own `.devin/config.local.json` for an
  unattended run.
- **No statusline.** Use `/aidlc --status` and the progress lines at gates.
- **`devin doctor` is not the AI-DLC doctor.** Use `/aidlc --doctor`.

## Verifying an install

```bash
bun .devin/tools/aidlc.ts doctor      # AI-DLC's own checks
devin rules list                      # AGENTS, aidlc-onboarding, aidlc all "always-on"
devin skills list                     # /aidlc and its runners under ./.devin/skills
```

On a fresh copy, `doctor` reports no problems. Its Devin checks cover
`.devin/hooks.v1.json`, the adapter, `.devin/config.json`, the CLI version
floor, and the models line ("every agent uses your Devin organization's default
subagent model").

## Next steps

- [Your First Workflow](../02-your-first-workflow.md) - an annotated end-to-end run.
- [Phases and Stages](../04-phases-and-stages.md) - the 5 phases and 33 stages.
- [Scopes, Depth, and Test Strategy](../05-scopes-and-depth.md) - right-sizing a run.
- [Glossary](../glossary.md) - every term defined.

Other harnesses: [AI-DLC on Cursor](cursor.md) · [the harness family index](README.md).
