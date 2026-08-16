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

import type { HarnessManifest } from "../../scripts/manifest-types.ts";
import onboardingFills from "./onboarding.fills.ts";
import emit from "./emit.ts";

const manifest: HarnessManifest = {
  name: "devin",
  harnessDir: ".devin",
  tierFlavor: "claude",

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
    { src: "skills/aidlc-session-cost", dst: "skills/aidlc-session-cost" },
    { src: "skills/aidlc-replay", dst: "skills/aidlc-replay" },
    { src: "skills/aidlc-outcomes-pack", dst: "skills/aidlc-outcomes-pack" },
  ],

  harnessFiles: [
    // The orchestrator skill. Devin discovers .devin/skills/<name>/SKILL.md.
    { src: "skills/aidlc/SKILL.md", dst: "skills/aidlc/SKILL.md" },
    { src: "skills/aidlc/question-rendering.md", dst: "skills/aidlc/question-rendering.md" },
    // NO rules/aidlc.md. Measured on CLI v3000.4.25: `devin rules paths` reports
    // only `.windsurf/rules/*.md` as the always-on rule dir, NOT `.devin/rules/`
    // — so a pointer placed there may never load. The method pointer therefore
    // lives in the project-root AGENTS.md (Devin's primary rules file, documented
    // and observed on CLI, Devin Local and Devin Cloud), which is also the surface
    // aidlc-includes.ts repoints on a space switch. One always-on surface, not two.
    { src: "dot-gitignore", dst: ".gitignore", projectRoot: true },
  ],

  // AGENTS.md at the project root — Devin's primary rules file, read
  // automatically by CLI, Devin Local and Devin Cloud. NOTE the 32 KiB always-on
  // cap (CLI changelog v2026.4.17-0): an oversized always-on file is TRUNCATED
  // with a path hint rather than rejected, so onboarding must stay well under it.
  // A guard in tests asserts this.
  onboarding: { dst: "AGENTS.md", projectRoot: true, fills: onboardingFills },

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
  // so the uniform bundle projection applies. Plugins are CLOSED BETA at the time
  // of writing, so this is projected for future use and not a supported install
  // path today.
  plugin: { manifestDir: ".devin-plugin", kind: "store" },
};

export default manifest;
