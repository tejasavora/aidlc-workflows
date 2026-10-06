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
//   2. .devin/hooks/aidlc-devin-adapter.ts — the payload translator (tool names,
//      the run_subagent and todo_write input shapes, subagent completion and the
//      subagent's own Stop). See its header for what was measured.
//
//   3. A build-time ASSERTION that no persona subagent carries a `model:` pin.
//      Devin runs an unpinned profile on the organization's default subagent
//      model, and a pinned profile was refused at spawn when the plan lacked
//      that model (CLI 3000.11.3), so the tier projection leaves the key out
//      and this refuses to ship one.
//
// EVENTS DEVIN DOES NOT HAVE — recorded so the gap is greppable in the harness,
// not only in a design doc:
//   SubagentStop -> NO EQUIVALENT. Completion is read from the run_subagent
//                   result (foreground) or the first read_subagent reply that
//                   reports it (background).
//   PreCompact    -> Devin has PostCompaction only, firing AFTER a successful
//                   compaction, so validate-state runs post hoc and cannot veto.
//   Notification  -> NO EQUIVALENT.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { EmitContext } from "../../scripts/manifest-types.ts";
import { copyChannelDispatcherCommands, copyChannelToolScripts } from "../../core/tools/aidlc.ts";

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

type HookCmd = { type: "command"; command: string; timeout: number };
type HookGroup = { matcher?: string; hooks: HookCmd[] };

function cmd(sub: string, timeout = 1800): HookCmd {
  // Relative path, no $VAR: Devin sets DEVIN_PROJECT_DIR (and CLAUDE_PROJECT_DIR),
  // and the adapter normalises it to AIDLC_PROJECT_DIR for the core hook bodies.
  // Timeouts are SECONDS on Devin and mirror the Claude Code wiring, so a slow
  // engine read under load is not killed into a silent fail-open.
  return { type: "command", command: `bun .devin/hooks/aidlc-devin-adapter.ts ${sub}`, timeout };
}

function hooksConfig(): Record<string, HookGroup[]> {
  // Devin-name matchers mirroring Claude Code's settings.json, mapped through
  // the adapter's TOOL_MAP. Claude ships ONE matcher for the three read/write
  // guards ("Read|NotebookRead|Edit|MultiEdit|Write|NotebookEdit|LS|Glob|Grep|Bash"),
  // so devin shares one too. Narrowing any of them to just the shell tool is a
  // SILENT enforcement hole: the hook loads and matches, and simply never sees
  // the write it was meant to stop.
  const edits = "^(write|edit|apply_patch)$";
  const guarded = "^(read|notebook_read|edit|apply_patch|write|notebook_edit|glob|grep|exec)$";
  // Claude: Edit|MultiEdit|Write|NotebookEdit|Bash|Task|Agent.
  const planFloor = "^(write|edit|apply_patch|notebook_edit|exec|run_subagent)$";
  return {
    SessionStart: [{ hooks: [cmd("session-start")] }],
    SessionEnd: [{ hooks: [cmd("session-end", 60)] }],
    UserPromptSubmit: [{ hooks: [cmd("record-human-turn")] }],
    // record-human-turn is deliberately NOT twinned onto PostToolUse the way
    // Claude twins it onto AskUserQuestion: a SKIPPED ask_user_question still
    // fires PostToolUse (CLI v3000.3.22), which would record a decision no
    // person made. Devin renders questions as prose instead, and the
    // matcher-free arm below refuses the picker while a workflow runs.
    PreToolUse: [
      // Matcher-free: the picker deny (ask_user_question is not a documented
      // matchable name) and subagent dispatch (stage rules ride the brief).
      { matcher: "", hooks: [cmd("deliver-stage-rules")] },
      { matcher: guarded, hooks: [cmd("state-transition-guard")] },
      { matcher: guarded, hooks: [cmd("reviewer-scope")] },
      { matcher: guarded, hooks: [cmd("review-freeze")] },
      { matcher: planFloor, hooks: [cmd("plan-approval-guard")] },
    ],
    PostToolUse: [
      { matcher: edits, hooks: [cmd("audit-and-sensors")] },
      { matcher: edits, hooks: [cmd("run-sensors", 3600)] },
      // The pairing is NOT interchangeable, and getting it backwards is silent:
      // sync-workflow-state reads a PLAN-UPDATE payload (Claude's TaskUpdate,
      // Devin's todo_write, projected by the adapter); rebuild-stage-graph reads
      // a SHELL payload (Claude's Bash, Devin's exec).
      { matcher: "^todo_write$", hooks: [cmd("sync-workflow-state")] },
      { matcher: "^exec$", hooks: [cmd("rebuild-stage-graph")] },
      // No SubagentStop on Devin. A foreground completion is the run_subagent
      // result; a background one is the first read_subagent reply reporting it.
      // The adapter logs each completion exactly once (aidlc-log-subagent.ts
      // appends unconditionally) and never for a refused spawn.
      { matcher: "^(run_subagent|read_subagent)$", hooks: [cmd("log-subagent")] },
    ],
    // PreCompact has no Devin equivalent; PostCompaction fires after the fact.
    PostCompaction: [{ hooks: [cmd("validate-state")] }],
    // Stop CAN block via {"decision":"block","reason":...}, so the forwarding-loop
    // gate survives on Devin.
    Stop: [{ hooks: [cmd("continue-workflow", 3600)] }],
  };
}


/**
 * Assert the packager's tier projection left NO `model:` on a persona.
 *
 * Devin's documented profile keys are name/description/model/allowed-tools/
 * max-nesting, and a pinned `model:` looks like the right way to keep judgment
 * work off a weaker model. Measured on CLI 3000.11.3 it is not safe: on an
 * account whose plan did not include the pinned model, every pinned profile
 * (`opus`, `sonnet`, `swe`, a full model id) was refused at spawn with
 * "Permission denied: an internal error occurred", while the unpinned profile
 * ran. TIER_PROJECTIONS.devin therefore
 * projects no model; this function refuses to ship a projection that ever
 * brings one back, because the failure it causes is every delegated stage.
 */
function assertNoDevinModel(raw: string, srcPath: string): void {
  const body = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const m = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) throw new Error(`${srcPath}: agent .md has no closed frontmatter block.`);
  const pinned = m[1].match(/^model:\s*(\S+)\s*$/m);
  if (pinned) {
    throw new Error(
      `${srcPath}: model "${pinned[1]}" on a Devin subagent profile. A pinned profile ` +
        `was refused at spawn on Devin CLI 3000.11.3, so devin personas ship unpinned. ` +
        `Check TIER_PROJECTIONS.devin in core/tools/aidlc-tiers.ts.`,
    );
  }
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

  // 1b. config.json permissions. Devin's `Exec(prefix)` matches WHOLE WORDS, so
  //     `Exec(bun .devin/tools)` does not cover `bun .devin/tools/aidlc.ts ...`
  //     (measured on 3000.11.3: the first engine call was refused in print
  //     mode). The allowlist is therefore generated from the same sources
  //     Claude's and Cursor's use: every dispatcher `engine` route, the
  //     dispatcher's read-only commands, and each tool script, so a command
  //     that changes the machine's AI-DLC install still asks. The native
  //     release runs the `aidlc` command instead, so it pre-approves only that
  //     command's trusted namespace (the same swap Cursor's cli.json gets).
  {
    const configPath = join(TREE, "config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8")) as {
      permissions?: { allow?: unknown };
    };
    const authored = Array.isArray(config.permissions?.allow) ? config.permissions.allow : [];
    const kept = authored.filter((entry) => typeof entry !== "string" || !entry.startsWith("Exec(bun "));
    const native = ctx.substituteToken("{{INVOKE}}") === "aidlc";
    const tool = (script: string) => `Exec(bun ${ctx.harnessDir}/tools/${script}`;
    const framework = native
      ? [`Exec(aidlc ${ctx.trustedRouteNamespace})`]
      : [
          `${tool("aidlc.ts")} ${ctx.trustedRouteNamespace})`,
          ...copyChannelDispatcherCommands().map((command) => `${tool("aidlc.ts")} ${command})`),
          ...copyChannelToolScripts().map((script) => `${tool(script)})`),
        ];
    config.permissions = { ...config.permissions, allow: [...framework, ...kept] };
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
  }

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

  // 3. Verify the tier projection on every persona subagent copy, and reconcile
  //    the reviewer turn cap with what Devin actually honours.
  //
  //    `maxTurns:` is NOT a documented Devin subagent frontmatter key (the set is
  //    name/description/model/allowed-tools/max-nesting), so it is silently
  //    ignored - `devin doctor` reports it as an unsupported key. The
  //    harness-neutral reviewer prose CITES it ("the `maxTurns: <n>` frontmatter
  //    above - keep the two numbers in sync"), which would leave devin shipping a
  //    dangling pointer to a key that does nothing. Codex hit the identical
  //    problem and rewrites the citation; do the same, and drop the inert key so
  //    nothing reads it as an enforced cap.
  const agentsDir = join(coreRoot, "agents");
  for (const f of readdirSync(agentsDir).filter((x) => x.endsWith(".md")).sort()) {
    const dst = join(TREE, "agents", f);
    if (!existsSync(dst)) continue; // the packager owns the copy; skip if absent
    let body = readFileSync(dst, "utf-8");
    assertNoDevinModel(body, dst);
    // display_name / examples: core-authored persona keys. Devin's doctor flags
    // them as unsupported (CFG005), and it is tempting to drop them here - but
    // AI-DLC's OWN doctor requires display_name as a schema check. Dropping
    // regresses aidlc-utility.ts doctor with a real failure while trading it for
    // Devin's `ok=true` informational noise. So they ship, and the guide narrates
    // the expected CFG005 warnings so nothing reads as a shipped defect.
    // The reviewer personas ship a `maxTurns:` key + a prose citation of the
    // number. Devin honours no per-agent turn cap key, so drop the key and rewrite
    // the citation - same fix codex applies. Non-reviewer personas have no match,
    // so this is a no-op there.
    const capped = body.match(/^maxTurns:\s*(\d+)\s*$/m);
    if (capped) {
      body = body
        .split(/\r?\n/)
        .filter((line) => !/^maxTurns:\s*\d+\s*$/.test(line))
        .join("\n")
        .replace(
          /the `maxTurns: (\d+)` frontmatter above - keep the two numbers in sync/g,
          "the core persona's `maxTurns: $1` cap - Devin honours no per-agent turn " +
            "cap key, so this number is prose-only here and is a discipline you keep " +
            "yourself; update it by hand if the authored cap changes",
        );
    }
    // Persist whatever the frontmatter and maxTurns filters produced. The write
    // used to sit inside `if (capped)`, so a non-reviewer's frontmatter drop
    // silently didn't persist - the entire class of `display_name`/`examples`
    // warnings was hidden that way for the 12 non-reviewer personas.
    if (body !== readFileSync(dst, "utf-8")) writeFileSync(dst, body, "utf-8");
  }
}
