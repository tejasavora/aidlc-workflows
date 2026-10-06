// harness/devin/onboarding.fills.ts — Devin's onboarding-doc fills.
// The packager fills core/templates/onboarding-harness.md into the always-on
// dist/devin/.devin/rules/aidlc-onboarding.md, with .devin token projection.
// The root AGENTS.md stays neutral, identical to the other sharing harnesses.
//
// Devin CLI and Devin Desktop's "Devin Local" agent read the same files, so
// one onboarding serves both. Devin Cloud is untested and makes no claim here.
//
// Devin TRUNCATES an oversized always-on rule rather than rejecting it (CLI
// changelog v2026.4.17-0 documents 32 KiB; measured on 3000.6.7 the effective
// threshold was lower). So these fills stay tight: the orientation a Claude user
// gets from a session banner has to live here, and nothing more.

import type { OnboardingFills } from "../../scripts/onboarding.ts";

const fills: OnboardingFills = {
  invoke: "/aidlc",
  slots: {
    // `.devin/rules/*.md` loads into every session only with `trigger: always_on`
    // (measured: `devin rules list` reports it as "[Devin] always-on").
    frontmatter: "---\ndescription: AI-DLC onboarding for Devin\ntrigger: always_on\n---",

    title_block: `# AI-DLC on Devin

This project uses AI-DLC (AI-Driven Development Life Cycle) for structured development, running on the **Devin harness** (Devin CLI in a terminal and the Devin Local agent in Devin Desktop share this install). The workspace shell ships in \`.devin/\`; describe what you want to build and it sets up the workflow for you. Run \`/aidlc\` followed by a scope or project description to begin. Run \`/aidlc --doctor\` to validate your setup, \`/aidlc --version\` to print the framework version, \`/aidlc --status\` for the current position, \`/aidlc --stage <slug>\` to jump to a stage, and \`/aidlc --help\` for every command. \`/aidlc compose "<task>"\` proposes a plan behind an approve/edit/reject gate.`,

    prereq_bullets: `- **Devin**: Devin CLI (\`devin\`) or Devin Desktop with the Devin Local agent. Hooks need Devin CLI 3000.3.22 or later: below it a hook cannot refuse a tool call. Devin Desktop bundles its own CLI, which can lag the standalone one; \`/aidlc --doctor\` reads whichever it finds.
- **Workspace trust**: Devin runs no project hooks in a workspace it has not trusted, and Devin Desktop's Restricted Mode disables every agent and hook silently. Trust the folder once (run \`devin\` in it interactively, or accept the Desktop prompt) before starting a workflow.
- **bun**: Required for the CLI tools and hook scripts (tracking progress, writing the decision log, deciding what runs next). Install via \`curl -fsSL https://bun.sh/install | bash\`. \`bun\` must be on your PATH for the non-interactive shells Devin spawns, so put the export in \`~/.zshenv\` (zsh) or \`~/.bashrc\` (bash), not \`~/.zshrc\`.
- **A git repository**: the workflow records state and uses worktrees for Construction.`,

    hook_permissions_note: `- **Hook wiring**: \`{{HARNESS_DIR}}/hooks.v1.json\` (the hooks object is the whole file). Check it with \`/hooks\` in the terminal, or **Open customizations** in Devin Desktop (\`/hooks\` is not available there).`,

    prereq_bullets_tail: `- **Permissions**: the shipped \`{{HARNESS_DIR}}/config.json\` pre-approves only AI-DLC's own workflow commands (its engine routes, read-only checks, and tool scripts), so their calls do not prompt; a command that changes the machine's AI-DLC install, and every other shell command, still asks. MERGE it if you already have a \`config.json\`: your \`read_config_from\`, \`mcpServers\` and \`hooks\` keys live in the same file. Avoid \`--permission-mode accept-edits\`; it approves every workspace edit, which is far broader than this install needs.`,

    agents_note: `On Devin each expert role is a custom subagent profile (\`{{HARNESS_DIR}}/agents/\`), dispatched with \`run_subagent\`. They carry no \`model:\`: Devin runs them on your organization's default subagent model (SWE-1.6 unless an admin chose another), not on your session model, because a profile pinned to a model the plan did not include was refused at spawn when tested. Each also carries an \`allowed-tools\` list without the delegation tools, so a persona cannot spawn another. Devin withholds \`ask_user_question\` from subagents, so any stage that must ask you questions runs in the main session.`,

    structure_extra: `- **Hook adapter**: \`{{HARNESS_DIR}}/hooks/aidlc-devin-adapter.ts\` translates Devin's lowercase tool names (\`exec\`, \`edit\`, \`write\`, \`run_subagent\`, \`todo_write\`) into the names the core hook bodies compare against, then hands off unchanged: Devin's payloads and its "exit 2 blocks, reason on stderr" convention already match.
- **Method pointer**: \`{{HARNESS_DIR}}/rules/aidlc.md\` (always-on) names the layered method files; Devin expands no \`@\`-imports, so the agent reads them. \`/aidlc space <name>\` re-points it in place.`,

    sections_before_resumption: `## What's different on this harness

This is the same AI-DLC core that ships to every harness: the same ordered steps, the same approval gates, and the same written record of what was decided, rendered onto Devin. On Devin:

- **One install, two surfaces.** Devin CLI and Devin Desktop's Devin Local agent read the same \`.devin/\` tree. Cascade, the legacy agent in the same app, is not a target.
- Approval gates and questions render as **numbered prose options**, so your next chat message is what the human-presence hook records. Devin's \`ask_user_question\` picker is refused while a workflow is running, because a skipped picker still fires the post-tool hook and would look like an answer. The questions FILE with \`[Answer]:\` tags remains the source of truth.
- The PreToolUse guards **block** natively (exit 2 with the reason on stderr), and the Stop hook keeps the forwarding loop going with \`{"decision":"block"}\`, the same contract as Claude Code.
- **Devin imports Claude Code's configuration by default, including its hooks** (\`read_config_from.claude\`). Do not install this distribution into a project that also carries the AI-DLC Claude Code install: both hook sets would load and every audit event would be written twice. One harness per project.
- **No per-subagent completion event.** Devin has no \`SubagentStop\`, so completion is recorded from the post-tool hook on \`run_subagent\`. A backgrounded subagent is not individually audited.
- **Compaction is observed after the fact.** Devin has \`PostCompaction\` but no \`PreCompact\`, so state validation runs after a compaction and cannot veto one.
- There is **no statusline**; use \`/aidlc --status\` and the progress lines at gates.
- **MCP servers**: none ship. Devin uses Claude Code's MCP shape; configure your own in \`{{HARNESS_DIR}}/mcp_config.json\` if needed.
- Construction swarm runs as **subagent fan-out only** (\`AIDLC_USE_SWARM=1\` is a loud no-op).

The Devin-specific guide (install, what differs, verification) is \`docs/guide/harnesses/devin.md\`.
`,

    sections_after_resumption: "",
  },
};

export default fills;
