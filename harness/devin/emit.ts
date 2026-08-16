// harness/devin/emit.ts — the Devin per-shell emission plugin.
//
// The unified packager copies core/ → dist/devin/.devin/ and runs graph compile +
// runner-gen there. This emit() then produces the three surfaces the generic
// projection cannot:
//
//   1. .devin/hooks.v1.json — Devin's hook config. Devin uses Claude Code's JSON
//      SHAPE (event → [{matcher, hooks:[{type, command, timeout}]}]) but its own
//      lowercase snake_case TOOL NAMES, and a different event set. In
//      hooks.v1.json specifically the hooks object IS the whole file — no "hooks"
//      wrapper key.
//
//   2. .devin/hooks/aidlc-devin-adapter.ts — the tool-name translator. Devin's
//      stdin/stdout envelopes and its "exit 2 blocks, reason on stderr" convention
//      already match Claude Code exactly, so the core hook BODIES need no change.
//      What they do need is Claude's PascalCase tool names, because three of them
//      compare tool_name INTERNALLY rather than relying on the matcher:
//        aidlc-review-freeze.ts            toolName === "Bash"
//        aidlc-reviewer-scope.ts           "Grep" / "Glob" / a 10-name allowlist
//        aidlc-state-transition-guard.ts   parsed.tool_name !== "Bash"
//      Fixing only the matchers would leave those three LOADED, MATCHING and
//      SILENTLY NO-OP — enforcement that looks installed and does nothing.
//
//   3. Devin-valid `model:` on every persona subagent. tierFlavor "claude" emits
//      `model: inherit` for the judgment tier, which Devin does not understand,
//      and a custom subagent profile with NO model: runs on Devin's default
//      subagent model rather than the session model. Both cases silently degrade,
//      so the tier is projected to an explicit Devin model name here.
//
// EVENTS DEVIN DOES NOT HAVE — recorded so the gap is greppable in the harness,
// not only in a design doc:
//   SubagentStop -> NO EQUIVALENT. aidlc-log-subagent cannot fire per subagent;
//                   PostToolUse on run_subagent is unreliable for BACKGROUNDED
//                   subagents (the parent's tool call has already returned).
//   PreCompact    -> Devin has PostCompaction only, firing AFTER a successful
//                   compaction, so validate-state runs post hoc and cannot veto.
//   Notification  -> NO EQUIVALENT.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { EmitContext } from "../../scripts/manifest-types.ts";

// Devin's documented matchable tool names (docs.devin.ai/cli/extensibility/hooks/
// lifecycle-hooks). Kept as a constant so the hooks.v1.json matchers below and the
// harness test can be checked against one list.
export const DEVIN_TOOL_NAMES = [
  "read", "write", "edit", "apply_patch", "notebook_read", "notebook_edit",
  "grep", "glob",
  "exec", "get_output", "write_to_process", "kill_shell",
  "webfetch",
  "todo_write", "exit_plan_mode",
  "skill",
  "run_subagent", "read_subagent",
  "request_scope",
  "mcp_list_servers", "mcp_list_tools", "mcp_call_tool", "mcp_read_resource",
] as const;

// Devin model names accepted by a subagent/skill `model:` field
// (docs.devin.ai/cli/models). "inherit" is NOT one of them.
const DEVIN_MODELS = ["opus", "sonnet", "swe", "codex", "gemini"] as const;
const DEVIN_JUDGMENT_MODEL = "opus";

type HookCmd = { type: "command"; command: string; timeout: number };
type HookGroup = { matcher?: string; hooks: HookCmd[] };

function cmd(sub: string, timeout = 30): HookCmd {
  // Relative path, no $VAR: Devin sets DEVIN_PROJECT_DIR (never
  // CLAUDE_PROJECT_DIR), and the adapter normalises it to AIDLC_PROJECT_DIR for
  // the core hook bodies. Keeping the command relative means the package works
  // regardless of which env var the host exports.
  return { type: "command", command: `bun .devin/hooks/aidlc-devin-adapter.ts ${sub}`, timeout };
}

function hooksConfig(): Record<string, HookGroup[]> {
  const edits = "^(write|edit|apply_patch|notebook_edit)$";
  const reads = "^(read|notebook_read|edit|apply_patch|write|notebook_edit|glob|grep|exec)$";
  return {
    SessionStart: [{ hooks: [cmd("session-start")] }],
    SessionEnd: [{ hooks: [cmd("session-end")] }],
    UserPromptSubmit: [{ hooks: [cmd("record-human-turn")] }],
    PreToolUse: [
      { matcher: "", hooks: [cmd("deliver-stage-rules")] },
      { matcher: "^exec$", hooks: [cmd("state-transition-guard")] },
      { matcher: reads, hooks: [cmd("reviewer-scope")] },
      { matcher: "^exec$", hooks: [cmd("review-freeze")] },
      { matcher: "^(run_subagent|exit_plan_mode)$", hooks: [cmd("plan-approval-guard")] },
    ],
    PostToolUse: [
      { matcher: edits, hooks: [cmd("audit-and-sensors", 60)] },
      { matcher: edits, hooks: [cmd("run-sensors", 60)] },
      { matcher: "^exec$", hooks: [cmd("sync-workflow-state")] },
      { matcher: "^todo_write$", hooks: [cmd("rebuild-stage-graph")] },
    ],
    // PreCompact has no Devin equivalent; PostCompaction is the nearest seam and
    // fires after the fact.
    PostCompaction: [{ hooks: [cmd("validate-state")] }],
    // Stop CAN block via {"decision":"block","reason":...}, so the forwarding-loop
    // gate survives on Devin.
    Stop: [{ hooks: [cmd("continue-workflow")] }],
  };
}

/**
 * Make the persona's `model:` Devin-valid.
 *
 * The packager has ALREADY projected core's `tier:` line through tierFlavor
 * "claude" by the time emit() runs, so the dist copy carries `model: inherit`
 * (judgment tier) or `model: sonnet` (balanced/templated). `inherit` is Claude
 * Code's session-inheritance sentinel and is NOT one of Devin's model names
 * (docs.devin.ai/cli/models: opus, sonnet, swe, codex, gemini) — and a Devin
 * subagent profile whose model is unrecognised or absent runs on Devin's DEFAULT
 * SUBAGENT MODEL rather than the session model. Judgment work would silently
 * downshift, which is exactly the failure this replacement prevents.
 */
function devinModelLine(raw: string, srcPath: string): string {
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) throw new Error(`${srcPath}: agent .md has no closed frontmatter block.`);
  const fm = m[1];
  const modelMatch = fm.match(/^model:\s*(\S+)\s*$/m);
  if (!modelMatch) {
    throw new Error(
      `${srcPath}: no model: line after the packager's tier projection. A Devin subagent ` +
        `profile without model: runs on the default subagent model, not the session model.`,
    );
  }
  const current = modelMatch[1];
  if (current !== "inherit") {
    if (!(DEVIN_MODELS as readonly string[]).includes(current)) {
      throw new Error(`${srcPath}: model "${current}" is not a Devin model name.`);
    }
    return raw; // already Devin-valid (e.g. sonnet)
  }
  const newFm = fm.replace(/^model:\s*inherit\s*$/m, `model: ${DEVIN_JUDGMENT_MODEL}`);
  return raw.replace(m[0], () => `---\n${newFm}\n---\n`);
}

export default function emit(ctx: EmitContext): void {
  const { coreRoot, harnessRoot, distRoot } = ctx;
  const TREE = join(distRoot, ".devin");

  // 1. hooks.v1.json — the hooks object IS the entire file (no wrapper key).
  const cfg = hooksConfig();
  for (const [event, groups] of Object.entries(cfg)) {
    for (const g of groups) {
      if (!g.matcher) continue;
      for (const tok of g.matcher.match(/[a-z_]+/g) ?? []) {
        if (!(DEVIN_TOOL_NAMES as readonly string[]).includes(tok)) {
          throw new Error(
            `devin emission: matcher for ${event} names "${tok}", which is not a documented ` +
              `Devin tool name. A matcher naming a Claude tool (Bash/Edit/Task) loads and ` +
              `never fires.`,
          );
        }
      }
    }
  }
  writeFileSync(join(TREE, "hooks.v1.json"), `${JSON.stringify(cfg, null, 2)}\n`, "utf-8");

  // 2. the adapter (authored in harness/devin/hooks/).
  const adapterSrc = join(harnessRoot, "hooks", "aidlc-devin-adapter.ts");
  if (!existsSync(adapterSrc)) {
    throw new Error(`devin emission requires the authored adapter at ${adapterSrc}.`);
  }
  const adapterDst = join(TREE, "hooks", "aidlc-devin-adapter.ts");
  mkdirSync(dirname(adapterDst), { recursive: true });
  writeFileSync(adapterDst, readFileSync(adapterSrc, "utf-8"), "utf-8");

  // Every subcommand the config references must exist in the adapter, or a hook
  // fires into a no-op. Checked at BUILD time so it cannot ship broken.
  const adapterText = readFileSync(adapterSrc, "utf-8");
  for (const groups of Object.values(cfg)) {
    for (const g of groups) {
      for (const h of g.hooks) {
        const sub = h.command.split(" ").pop()!;
        if (!adapterText.includes(`"${sub}":`)) {
          throw new Error(`devin emission: adapter has no handler for subcommand "${sub}".`);
        }
      }
    }
  }

  // 3. Devin-valid model: on every persona subagent copy under .devin/agents/.
  const agentsDir = join(coreRoot, "agents");
  for (const f of readdirSync(agentsDir).filter((x) => x.endsWith(".md")).sort()) {
    const dst = join(TREE, "agents", f);
    if (!existsSync(dst)) continue; // the packager owns the copy; skip if absent
    writeFileSync(
      dst,
      devinModelLine(readFileSync(dst, "utf-8"), dst),
      "utf-8",
    );
  }
}
