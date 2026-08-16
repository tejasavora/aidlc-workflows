// harness/devin/onboarding.fills.ts — Devin's fills for the shared onboarding
// skeleton (core/templates/onboarding.md), rendered to dist/devin/AGENTS.md.
//
// AGENTS.md is Devin's PRIMARY rules file and is read automatically by Devin CLI,
// Devin Local and Devin Cloud. It is also ALWAYS-ON, and Devin CLI caps an
// always-on rule file at 32 KiB, TRUNCATING the overflow with a path hint rather
// than erroring (CLI changelog v2026.4.17-0). So these fills stay tight; a test
// asserts the rendered file is under the cap.
//
// Devin has no equivalent of Claude Code's `companyAnnouncements` setting (which
// renders an orientation banner at session start), so the orientation a Claude user
// gets in a banner has to live here instead — it is the first thing the model reads.

import type { OnboardingFills } from "../../scripts/onboarding.ts";

const fills: OnboardingFills = {
  invoke: "/aidlc",

  slots: {
    title_block: [
      "# AI-DLC — AI-Driven Development Life Cycle",
      "",
      "Run **`/aidlc`** to start or resume a workflow. Describe what to build and the scope is",
      "auto-detected. In Devin Cloud, `@skills:aidlc` also works.",
      "",
      "Every stage stops at an approval gate. Nothing advances without your decision.",
    ].join("\n"),

    prereq_bullets: [
      "- **bun**: required for the CLI tools and hook scripts (state, audit log, sensors,",
      "  orchestration). Install with `curl -fsSL https://bun.sh/install | bash`; on Windows",
      "  `npm install -g bun`. It must be on your PATH for **non-interactive** shells, so put the",
      "  export in `~/.zshenv` (zsh) or `~/.bashrc` (bash) — NOT `~/.zshrc`. Check with `which bun`.",
      "- **A git repository**: the workflow records state and uses worktrees for Construction.",
    ].join("\n"),

    prereq_bullets_tail: [
      "- **Permission prompts**: Devin scopes an `Exec` grant to the *wrapped program*, so",
      "  `bun {{HARNESS_DIR}}/tools/aidlc-orchestrate.ts` is approved separately from other",
      "  scripts. Expect several approvals on the first run; approving each once is enough.",
      "  `--permission-mode accept-edits` reduces prompting in a workspace you trust.",
      "- **Hooks**: wired in `{{HARNESS_DIR}}/hooks.v1.json`. Verify with `/hooks` in the",
      "  terminal, or **Open customizations** in Devin Desktop (`/hooks` is not available over",
      "  the IDE's agent protocol).",
    ].join("\n"),

    agents_note: [
      "Each persona carries an explicit `model:`. Devin runs a custom subagent profile on its",
      "*default subagent model* when `model:` is absent — not on the session model — so the tier",
      "is projected to an explicit model name at build time.",
      "",
      "**`ask_user_question` is withheld from Devin subagents**, so any stage where a persona",
      "must interrogate you runs INLINE in the root agent rather than being delegated.",
    ].join("\n"),

    structure_extra: [
      "- **Hook config**: `{{HARNESS_DIR}}/hooks.v1.json` — Devin's hook wiring. The hooks object",
      "  is the entire file (no wrapper key). A single adapter,",
      "  `{{HARNESS_DIR}}/hooks/aidlc-devin-adapter.ts`, translates Devin's lowercase tool names",
      "  (`exec`, `edit`, `run_subagent`) into the names the core hook bodies compare against,",
      "  then hands off unchanged — Devin's stdin/stdout envelopes and its \"exit 2 blocks, reason",
      "  on stderr\" convention already match.",
    ].join("\n"),

    sections_after_resumption: [
      "## Known limits on this harness",
      "",
      "Devin's hook surface covers most of the framework, but not all of it. These gaps are real",
      "and are not worked around:",
      "",
      "- **No per-subagent completion event.** Devin has no `SubagentStop`, so per-subagent",
      "  tracking does not fire and subagent activity is not individually audited.",
      "- **Compaction is observed after the fact.** Devin has `PostCompaction` but no",
      "  `PreCompact`, so state validation runs *after* a compaction and cannot inspect or veto",
      "  one. Nothing fires if a compaction fails.",
      "- **Restricted Mode disables everything, silently.** A workspace open in Restricted Mode",
      "  has all agents *and* all hooks disabled. That is indistinguishable from a broken",
      "  install — check workspace trust first.",
      "- **Devin Cloud is partial.** Cloud has no repo-level hooks, no subagents, and allows only",
      "  one active skill at a time, so the orchestrator cannot dispatch stage skills there.",
      "  Cloud also needs a blueprint `initialize:` step and a snapshot build before `bun` exists.",
      "",
      "Where a hook is absent, gate discipline is a human responsibility.",
    ].join("\n"),

    gitignore_extra: "",
  },
};

export default fills;
