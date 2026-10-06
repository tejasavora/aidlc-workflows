// harness/devin/manifest.ts — the Devin distribution row.
//
// Devin = Devin CLI (terminal) + Devin Desktop's "Devin Local" agent (the IDE),
// which the vendor documents as "the same architecture as Devin CLI" and "the same
// agent harness", so ONE distribution serves both. (Windsurf was rebranded to
// Devin Desktop in June 2026; Cascade is the separate LEGACY agent in the same IDE
// and is NOT a target — it reads different files and, per the 2026-08-07 release
// notes, is disabled by default for enterprises.)
//
// Devin is the closest peer to Claude of any harness here, which is why this
// manifest reads almost identically to harness/claude/manifest.ts:
//   - the engine tree lives INSIDE the harness dir (.devin/), unlike opencode
//     which had to ship at .aidlc/ because opencode auto-imports every *.ts under
//     .opencode/tools/ as a tool definition. Devin scans nothing in .devin/.
//   - hooks are a JSON config in Claude Code's own shape, so core's hook bodies
//     need no rewriting — only tool-NAME translation (see emit.ts).
//   - skills are folder-drop SKILL.md, discovered under .devin/skills/.
//
// WHY .devin/ IS A VALID harnessDir (this was the load-bearing question):
// aidlc-lib.ts's harnessDir() derivation is OPEN-SET — it takes the basename of
// the grandparent of the shipped aidlc-lib.ts, "derived OPEN-SET, not matched
// against a fixed list, so harness #N needs no edit here". KNOWN_HARNESS_DIRS is
// only a probe-ORDER hint for the dev repo where several trees coexist. `.devin`
// is added to those lists so the dev-repo rung and aidlc-state's scan see it, but
// a real single-harness install resolves by script path and never probes.
//
// Devin surfaces this manifest deliberately does NOT use:
//   - .devin/workflows/  — Cascade-only. Devin CLI and Devin Local never read it,
//     and it is explicitly excluded from skill import. Shipping it would be dead
//     weight aimed at a legacy agent.
//   - .agents/skills/    — a valid cross-vendor path, but .devin/skills/ is read
//     by Devin CLI, Devin Local AND Devin Cloud, so one location suffices.
//     Shipping both would make each skill surface TWICE with location prefixes
//     (/devin:aidlc vs /agents:aidlc) — Devin stopped deduplicating same-named
//     skills in CLI v3000.2.17.

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { HarnessManifest } from "../../scripts/manifest-types.ts";
import onboardingFills from "./onboarding.fills.ts";
import emit from "./emit.ts";

// DERIVED from core/agents/, never hardcoded: a hardcoded roster silently stops
// constraining persona #15. kiro-ide hardcodes its list and has to be edited by
// hand whenever the roster moves.
const PERSONA_AGENTS = readdirSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "core", "agents"),
)
  .filter((f) => /^aidlc-.+-agent\.md$/.test(f))
  .map((f) => f.replace(/\.md$/, ""))
  .sort();

const manifest: HarnessManifest = {
  name: "devin",
  productName: "Devin",
  configNextStep:
    "start Devin in this project (`devin` in a terminal, or open the folder in Devin Desktop with the Devin Local agent), then run `/aidlc --doctor`",
  harnessDir: ".devin",
  orchestratorSkillPath: ".devin/skills/aidlc/SKILL.md",
  tierFlavor: "devin",
  // Same root-file policy as the other AGENTS.md harnesses: the .gitignore block
  // is a line-set union, and the root AGENTS.md is the byte-identical neutral
  // onboarding every sharing harness ships, so any of them may own the block.
  // No legacy signatures: no unmarked Devin root file ever shipped from here.
  rootIntegrations: [
    { path: ".gitignore", policy: "managed-block", marker: "gitignore", shared: "union" },
    { path: "AGENTS.md", policy: "managed-block", marker: "agents", shared: "identical" },
  ],

  // core/<src> → .devin/<dst>. Devin keeps every core dir name, exactly like
  // Claude: the method itself lives at the workspace-root
  // aidlc/spaces/default/memory/ and reaches ambient context through the
  // always-on AGENTS.md (Devin's primary rules file), not through a copy in here.
  coreDirs: [
    { src: "tools", dst: "tools" },
    { src: "aidlc-common", dst: "aidlc-common" },
    { src: "knowledge", dst: "knowledge" },
    { src: "sensors", dst: "sensors" },
    { src: "scopes", dst: "scopes" },
    { src: "agents", dst: "agents" },
    { src: "hooks", dst: "hooks" },
    { src: "skills/aidlc-knowledge", dst: "skills/aidlc-knowledge" },
    { src: "skills/aidlc-session-cost", dst: "skills/aidlc-session-cost" },
    { src: "skills/aidlc-replay", dst: "skills/aidlc-replay" },
    { src: "skills/aidlc-outcomes-pack", dst: "skills/aidlc-outcomes-pack" },
  ],

  harnessFiles: [
    // The orchestrator skill. Devin discovers .devin/skills/<name>/SKILL.md.
    { src: "skills/aidlc/SKILL.md", dst: "skills/aidlc/SKILL.md" },
    { src: "skills/aidlc/question-rendering.md", dst: "skills/aidlc/question-rendering.md" },
    // The method pointer: an always-on Devin rule naming the layered method
    // files (Devin expands no @-imports). aidlc-includes.ts re-points it on a
    // space switch, the way it re-points Cursor's rules/*.mdc.
    { src: "rules-aidlc.md", dst: "rules/aidlc.md" },
    { src: "dot-gitignore", dst: ".gitignore", projectRoot: true },
    // Scoped permission allowlist for the framework's own deterministic tools.
    // Every peer harness pre-approves its bun tool prefix (claude's
    // settings.json `Bash(bun ".claude/tools/"*)`, codex's `prefix_rule`,
    // cursor's `Shell(bun)`, opencode's `permission.bash`); devin shipped none,
    // and AGENTS.md instead advised `--permission-mode accept-edits`, which
    // auto-approves EVERY workspace edit - strictly broader than any peer.
    //
    // `Exec(prefix)` matches on WHOLE WORDS, so a directory prefix such as
    // `Exec(bun .devin/tools)` does not cover `bun .devin/tools/aidlc.ts ...`
    // (measured on CLI 3000.11.3). emit.ts therefore generates the allowlist
    // from the dispatcher's route table, the same source Claude and Cursor use.
    //
    // MERGE, do not overwrite: `.devin/config.json` is also where a user's own
    // `read_config_from`, `mcpServers` and `hooks` live. This file carries ONLY
    // `permissions` so a merge is a single key.
    { src: "config.json", dst: "config.json" },
  ],

  // AGENTS.md at the project root is the NEUTRAL onboarding, byte-identical to
  // the other sharing harnesses; Devin reads it automatically on CLI and Devin
  // Local. The Devin-specific setup renders into .devin/rules/aidlc-onboarding.md,
  // an always-on Devin rule (same split as Cursor's rules/aidlc-onboarding.mdc
  // and Kiro's steering file).
  //
  // The always-on budget matters on Devin: it TRUNCATES an oversized always-on
  // rule rather than rejecting it. Measured 2026-09-02 on 3000.6.7, a single
  // 19,908-byte AGENTS.md (the old one-file layout) was truncated while 15,309
  // bytes was not. This layout keeps each always-on file well under that; the
  // live result for the split layout is recorded in docs/guide/harnesses/devin.md.
  onboarding: { dst: "AGENTS.md", projectRoot: true, harnessDst: "rules/aidlc-onboarding.md", fills: onboardingFills },

  // Generated stage/scope runners are USER-invocable only. Devin has NO
  // `disable-model-invocation` key (that is Claude's/Cursor's); the documented
  // equivalent is `triggers`, which defaults to `[user, model]`. Narrowing it to
  // `user` stops an ordinary coding prompt auto-activating a state-mutating
  // workflow shortcut. Emitting Claude's key here would have shipped a no-op.
  // Flow style, one key line: the harness.json validator requires each entry to
  // be a `key:` line (aidlc-lib.ts), so a two-line block sequence is rejected.
  runnerFrontmatterAdditions: ["triggers: [user]"],

  // Per-persona tool allowlist. Core's agent .md files carry
  // `disallowedTools: Task`, which Devin does not understand and silently
  // ignores - so without this every delegated persona inherits the FULL toolset,
  // including `run_subagent`. Devin's documented allowlist vocabulary is
  // read/edit/grep/glob/exec (+ mcp__*), and `allowed-tools` is its own key name
  // (it also accepts Claude's `tools:` as a substitute). Omitting the delegation
  // tools is the Devin spelling of "No nested delegation": the conductor
  // orchestrates every agent invocation, and an agent never spawns another.
  frontmatterAdditions: PERSONA_AGENTS.map((agent) => ({
    file: `agents/${agent}.md`,
    lines: [`allowed-tools: ["read", "edit", "grep", "glob", "exec"]`],
  })),

  // .devin/rules/ needs no rename — `rules` is already Devin's own subdir name
  // (unlike Kiro's `steering` or Codex's `aidlc-rules`).
  rulesRename: null,

  // emit() owns the two Devin-native surfaces the generic projection cannot
  // produce: .devin/hooks.v1.json (Devin's hook config, in Claude Code's shape
  // but with Devin's snake_case tool names) and the adapter that translates those
  // tool names back for the core hook bodies.
  emit,

  // Devin's own plugin format is a folder with .devin-plugin/plugin.json shipping
  // skills/rules/hooks/MCP/subagents — the same folder-drop shape as Claude's,
  // so the uniform bundle projection applies. As of CLI 3000.6.7 the surface is
  // GENERAL (`devin plugins install|list|info|update|remove|prune`), so
  // dist/plugins/<name>/devin/ is installable rather than speculative. One real
  // constraint to know: plugin-supplied hooks do NOT support SessionStart or
  // SessionEnd, so a plugin cannot contribute the session-lifecycle arms this
  // distribution wires directly in hooks.v1.json.
  plugin: { manifestDir: ".devin-plugin", kind: "store" },
};

export default manifest;
