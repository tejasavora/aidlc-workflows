#!/usr/bin/env bun
// aidlc-devin-adapter.ts — the ONLY hand-authored file in the V2 Devin package.
//
// WHY THIS EXISTS, and why it is thin.
//
// Devin's hook contract is already Claude Code's contract: same event names, same
// stdin envelope (`hook_event_name`, `tool_name`, `tool_input`, `session_id`), same
// stdout envelope (`decision`/`reason`, `hookSpecificOutput.additionalContext`,
// `hookSpecificOutput.updatedInput`), and the same "exit 2 blocks, reason on stderr"
// convention. Devin even reads `.claude/settings.json` hooks by default.
//
// So unlike the Codex adapter (which reshapes a genuinely foreign payload), this
// adapter exists for exactly ONE reason: TOOL NAMES.
//
// Devin names tools in lowercase snake_case (`exec`, `edit`, `grep`, `run_subagent`).
// Three CORE hooks compare `tool_name` against Claude's PascalCase names INTERNALLY,
// not just via the matcher:
//
//   aidlc-review-freeze.ts:652          if (toolName === "Bash")
//   aidlc-reviewer-scope.ts:655,659,739 "Grep" / "Glob" / a 10-name allowlist
//   aidlc-state-transition-guard.ts:946 if (parsed.tool_name !== "Bash") return 0
//
// Fixing only the matchers in hooks.v1.json would leave those three hooks LOADED,
// MATCHING, and SILENTLY NO-OP — enforcement that looks installed and does nothing.
// That is the failure mode this file prevents.
//
// It also normalises the project-dir env var: Devin sets DEVIN_PROJECT_DIR; the core
// hooks read AIDLC_PROJECT_DIR.
//
// Everything else is passed through untouched, including exit codes and stderr.

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Devin tool name -> Claude tool name.
//
// Sources: Devin's matchable tool list (docs.devin.ai/cli/extensibility/hooks/
// lifecycle-hooks "Tool names you can match") mapped onto the names the core hooks
// compare against. The Devin side of this table is DOCUMENTED; the correspondence
// is our mapping and is the thing to re-check when Devin adds tools.
//
// `apply_patch` -> "Edit": it is Devin's structured file-edit tool, so the core
// hooks' Edit handling is the correct destination (Codex's adapter makes the same
// call for the same reason).
// ---------------------------------------------------------------------------
const TOOL_MAP: Record<string, string> = {
  read: "Read",
  write: "Write",
  edit: "Edit",
  apply_patch: "Edit",
  notebook_read: "NotebookRead",
  notebook_edit: "NotebookEdit",
  grep: "Grep",
  glob: "Glob",
  exec: "Bash",
  get_output: "Bash",
  write_to_process: "Bash",
  kill_shell: "Bash",
  webfetch: "WebFetch",
  todo_write: "TaskUpdate",
  exit_plan_mode: "ExitPlanMode",
  skill: "Skill",
  run_subagent: "Task",
  read_subagent: "Task",
  request_scope: "RequestScope",
};

// Devin's MCP tools use the same `mcp__<server>__<tool>` shape as Claude, so they
// pass through unmapped by design.
function mapToolName(name: string | undefined): string | undefined {
  if (!name) return name;
  if (name.startsWith("mcp__")) return name;
  return TOOL_MAP[name] ?? name;
}

const subcommand = process.argv[2] ?? "";

// Advisory-by-default: a malformed or absent payload must never block the agent.
let raw = "";
try {
  raw = await Bun.stdin.text();
} catch {
  process.exit(0);
}

let payload: Record<string, unknown> = {};
if (raw.trim().length > 0) {
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    process.exit(0); // unparseable stdin -> fail open
  }
}

// --- the one translation -----------------------------------------------------
const devinTool = typeof payload.tool_name === "string" ? payload.tool_name : undefined;
const mapped = mapToolName(devinTool);
if (mapped && mapped !== devinTool) payload.tool_name = mapped;

// Devin sets DEVIN_PROJECT_DIR; core hooks read AIDLC_PROJECT_DIR.
const projectDir =
  process.env.AIDLC_PROJECT_DIR ??
  process.env.DEVIN_PROJECT_DIR ??
  process.cwd();

const childEnv = {
  ...process.env,
  AIDLC_PROJECT_DIR: projectDir,
  // Record which host we are, so core hooks and the audit trail can attribute
  // behaviour to Devin rather than to Claude Code.
  AIDLC_HOST: "devin",
};

// Events Devin does NOT have. Kept as an explicit, greppable record so the gap is
// visible in the package rather than only in a design doc:
//   SubagentStop -> NO EQUIVALENT. `aidlc-log-subagent` cannot fire per subagent.
//                   `PostToolUse` on run_subagent is unreliable for BACKGROUNDED
//                   subagents (the parent's tool call has already returned).
//   PreCompact    -> Devin has PostCompaction only, which fires AFTER a successful
//                   compaction. `aidlc-validate-state` therefore runs post hoc; it
//                   cannot inspect or veto a compaction, and nothing fires if the
//                   compaction fails.
//   Notification  -> NO EQUIVALENT.
const CORE: Record<string, { file: string; stderr: boolean }> = {
  "session-start":          { file: "aidlc-session-start.ts",          stderr: false },
  "session-end":            { file: "aidlc-session-end.ts",            stderr: false },
  "record-human-turn":      { file: "aidlc-record-human-turn.ts",      stderr: false },
  "deliver-stage-rules":    { file: "aidlc-deliver-stage-rules.ts",    stderr: true  },
  "state-transition-guard": { file: "aidlc-state-transition-guard.ts", stderr: true  },
  "reviewer-scope":         { file: "aidlc-reviewer-scope.ts",         stderr: true  },
  "review-freeze":          { file: "aidlc-review-freeze.ts",          stderr: true  },
  "plan-approval-guard":    { file: "aidlc-plan-approval-guard.ts",    stderr: true  },
  "audit-and-sensors":      { file: "aidlc-write-audit-log.ts",        stderr: false },
  "run-sensors":            { file: "aidlc-run-sensors.ts",            stderr: false },
  "sync-workflow-state":    { file: "aidlc-sync-workflow-state.ts",    stderr: false },
  "rebuild-stage-graph":    { file: "aidlc-rebuild-stage-graph.ts",    stderr: false },
  "validate-state":         { file: "aidlc-validate-state.ts",         stderr: false },
  "continue-workflow":      { file: "aidlc-continue-workflow.ts",      stderr: true  },
};

const target = CORE[subcommand];
if (!target) {
  // Unknown subcommand: fail open rather than block a turn on a packaging slip.
  process.exit(0);
}

const input = JSON.stringify(payload);
const r = spawnSync(process.execPath, [join(HOOKS_DIR, target.file)], {
  input,
  cwd: projectDir,
  env: childEnv,
  encoding: "utf-8",
  stdio: ["pipe", "pipe", target.stderr ? "pipe" : "ignore"],
});

// Pass the core hook's contract straight through. Devin's envelope IS Claude's, so
// no re-wrapping is needed or wanted — re-wrapping is how Codex's adapter had to
// handle a per-event output schema, and doing it here would corrupt valid output.
if (r.stdout) process.stdout.write(r.stdout);
if (target.stderr && r.stderr) process.stderr.write(r.stderr);

// Exit 2 = block, with the reason taken from stderr. Devin adopted Claude Code's
// convention in CLI v3000.3.22, so the core hooks' block channel survives unchanged.
process.exit(r.status ?? 0);
