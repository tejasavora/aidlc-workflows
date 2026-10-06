#!/usr/bin/env bun
// aidlc-devin-adapter.ts — the Devin hook shim (AUTHORED shell file; the
// aidlc-*.ts hook bodies beside it are PACKAGED core, byte-shared with the
// Claude Code harness). Wired by .devin/hooks.v1.json:
//
//   bun .devin/hooks/aidlc-devin-adapter.ts <target>
//
// Devin's hook contract is Claude Code's: the same event names, the same stdin
// envelope (`hook_event_name`, `tool_name`, `tool_input`, `tool_response`,
// `session_id`), the same stdout envelope (`decision`/`reason`,
// `hookSpecificOutput.additionalContext`, `hookSpecificOutput.updatedInput`),
// and the same "exit 2 blocks, reason on stderr" convention. What differs, and
// what this file translates, was MEASURED live on Devin CLI 3000.6.12 and
// 3000.11.3 (2026-10-05) with a stdin-capture hook on every event:
//
//   1. TOOL NAMES are lowercase snake_case: `exec` (Bash), `write`, `edit`,
//      `read`, `glob`, `grep`, `run_subagent` (Task), `todo_write` (TaskUpdate).
//      Several core hooks compare tool_name INTERNALLY (review-freeze and
//      state-transition-guard key on "Bash", reviewer-scope on Grep/Glob and a
//      read allowlist), so a matcher-only rename would leave them loaded,
//      matching, and silently doing nothing.
//      File tools already carry Claude's input keys (`file_path`,
//      `old_string`, `new_string`), so those inputs pass through unchanged.
//   2. `run_subagent` input is `{title, task, profile, is_background}`. The core
//      dispatch hooks read Claude's Task shape (`subagent_type`, `prompt`,
//      `run_in_background`), so the shim adds those aliases. A stage-rule
//      rewrite from deliver-stage-rules comes back as `updatedInput.prompt` and
//      is returned to Devin as `updatedInput.task` (Devin merges a partial
//      updatedInput into the tool arguments; measured).
//   3. `todo_write` input is `{todos: [{content, status}]}`. sync-workflow-state
//      keys on Claude's TaskUpdate `{status: "in_progress", activeForm}`, so the
//      in-progress todo is projected into that shape.
//   4. There is no SubagentStop. PostToolUse fires on `run_subagent` when a
//      foreground subagent returns, INCLUDING a failed spawn
//      (`tool_response.success: false`), so completion is logged only on
//      success. A background launch returns at once; its completion is read
//      from the first `read_subagent` reply that reports it.
//   5. A subagent's own tool calls AND its own Stop arrive with the parent's
//      `session_id` and no agent identity. A foreground subagent's Stop must
//      not be judged by the forwarding-loop gate as if the main session were
//      ending, so the shim records each foreground dispatch in flight and lets
//      a Stop through untouched while one is outstanding (the parent cannot
//      stop while it waits on a foreground call).
//   6. UserPromptSubmit fires only for the person's own message, not for a
//      subagent's brief, and carries the prompt unwrapped.
//
// The human-turn hook is an authority boundary: it mints HUMAN_TURN only when
// launched through the dispatcher with a one-time token, so it is never run by
// path. Every other core hook is run by path (or through the compiled binary).
//
// Events Devin does NOT have (kept greppable here):
//   SubagentStop -> see 4 above.
//   PreCompact   -> Devin has PostCompaction only, which fires AFTER a
//                   compaction; validate-state runs post hoc and cannot veto.
//   Notification -> no equivalent.
//
// Devin also imports Claude Code's hooks by default (`read_config_from.claude`),
// so a project carrying the AI-DLC Claude install too would run both hook sets
// and write every audit event twice. One harness per project.

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hookChildEnv,
  resolveWorkflowSelection,
  sessionsDir,
  stateFilePathForSelection,
  validSessionId,
} from "../tools/aidlc-lib.ts";

const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));

// Devin tool name -> Claude tool name. The Devin side is Devin's documented
// matchable set (docs.devin.ai/cli/extensibility/hooks/lifecycle-hooks); the
// correspondence is ours and is what to re-check when Devin adds tools.
// `apply_patch` -> "Edit" (its structured file edit; the default model was not
// offered it when measured).
export const TOOL_MAP: Readonly<Record<string, string>> = {
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

// Devin's structured-question picker. It is not in Devin's documented
// matchable set, so it is governed on the matcher-free PreToolUse arm.
// Aliases are included so the deny does not depend on one spelling.
export const DEVIN_QUESTION_PICKERS: ReadonlySet<string> = new Set([
  "ask_user_question",
  "ask_user",
  "askUserQuestion",
]);

// A foreground subagent still marked in flight after this long is treated as
// lost (its PostToolUse never arrived), so a leaked marker cannot keep the
// forwarding-loop gate off indefinitely.
const SUBAGENT_STALE_MS = 6 * 60 * 60 * 1000;

type Payload = {
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
  tool_use_id?: string;
  session_id?: string;
  prompt?: string;
  [key: string]: unknown;
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapToolName(name: string): string {
  if (!name || name.startsWith("mcp__")) return name; // MCP names match Claude's
  return TOOL_MAP[name] ?? name;
}

// The Claude-shaped payload the core hooks read. Original Devin keys stay in
// tool_input beside the added aliases; the core ignores keys it does not know.
export function toCorePayload(devin: Payload): Payload {
  const tool = str(devin.tool_name);
  const input = (devin.tool_input && typeof devin.tool_input === "object")
    ? devin.tool_input
    : {};
  const core: Payload = { ...devin };
  if (tool) core.tool_name = mapToolName(tool);
  if (tool === "run_subagent") {
    core.tool_input = {
      ...input,
      ...(str(input.profile) ? { subagent_type: input.profile } : {}),
      ...(str(input.task) ? { prompt: input.task } : {}),
      ...(input.is_background === true ? { run_in_background: true } : {}),
    };
  } else if (tool === "todo_write") {
    const todos = Array.isArray(input.todos) ? input.todos : [];
    const active = todos.find((todo) =>
      todo !== null && typeof todo === "object" &&
      (todo as Record<string, unknown>).status === "in_progress"
    ) as Record<string, unknown> | undefined;
    const activeForm = str(active?.activeForm) || str(active?.content);
    core.tool_input = activeForm
      ? { ...input, status: "in_progress", activeForm }
      : { ...input };
  }
  return core;
}

function reportedOk(response: unknown): boolean {
  return response !== null && typeof response === "object" &&
    (response as Record<string, unknown>).success === true;
}

function responseText(response: unknown): string {
  if (typeof response === "string") return response;
  if (response !== null && typeof response === "object") {
    return str((response as Record<string, unknown>).output);
  }
  return "";
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export async function run(target: string, rawInput: string): Promise<number> {
  let devin: Payload = {};
  if (rawInput.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(rawInput);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return 0;
      devin = parsed as Payload;
    } catch {
      return 0; // unparseable stdin -> fail open
    }
  }

  const projectDirRaw =
    process.env.AIDLC_PROJECT_DIR ??
    process.env.DEVIN_PROJECT_DIR ??
    process.env.CLAUDE_PROJECT_DIR ??
    process.cwd();
  const projectDir = isAbsolute(projectDirRaw) ? projectDirRaw : resolve(process.cwd(), projectDirRaw);
  const sessionId = validSessionId(str(devin.session_id) || undefined) ?? undefined;
  const childEnv = hookChildEnv(projectDir, sessionId, {
    AIDLC_PROJECT_DIR: projectDir,
    CLAUDE_PROJECT_DIR: projectDir,
  });
  const devinTool = str(devin.tool_name);
  const core = toCorePayload(devin);

  // --- core-hook subprocess plumbing -----------------------------------------

  function runCore(hookFile: string, input: string): { stdout: string; stderr: string; code: number } {
    const executable = process.env.AIDLC_COMPILED_EXECUTABLE;
    const hook = hookFile.replace(/^aidlc-|\.ts$/g, "");
    // The human-turn hook mints nothing unless the dispatcher launches it with
    // a one-time token, so it is never run by path.
    const authorityToken = hook === "record-human-turn" ? randomUUID() : "";
    const command = executable
      ? authorityToken
        ? [executable, "--internal-aidlc-record-human-turn", join(HOOKS_DIR, hookFile)]
        : [executable, "engine", "hook", hook]
      : authorityToken
        ? [
            process.execPath,
            join(HOOKS_DIR, "..", "tools", "aidlc.ts"),
            "--internal-aidlc-record-human-turn",
            join(HOOKS_DIR, hookFile),
          ]
        : [process.execPath, join(HOOKS_DIR, hookFile)];
    try {
      const r = Bun.spawnSync(command, {
        stdin: Buffer.from(input, "utf-8"),
        stdout: "pipe",
        stderr: "pipe",
        cwd: projectDir,
        env: authorityToken ? { ...childEnv, AIDLC_INTERNAL_HUMAN_TURN_TOKEN: authorityToken } : childEnv,
      });
      return { stdout: r.stdout?.toString() ?? "", stderr: r.stderr?.toString() ?? "", code: r.exitCode ?? 0 };
    } catch {
      return { stdout: "", stderr: "", code: 0 }; // a spawn failure never blocks
    }
  }

  // Advisory hooks: forward stdout (context, notices), never block.
  function advisory(hookFile: string, input: string = JSON.stringify(core)): number {
    const r = runCore(hookFile, input);
    if (r.stdout) process.stdout.write(r.stdout);
    return 0;
  }

  // Guards: the block contract (exit 2 + reason on stderr) survives the pipe;
  // anything else a guard exits with is answered as allow.
  function guard(hookFile: string, input: string = JSON.stringify(core)): number {
    const r = runCore(hookFile, input);
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.code === 2) {
      if (r.stderr) process.stderr.write(r.stderr);
      return 2;
    }
    return 0;
  }

  // --- subagent in-flight markers --------------------------------------------
  // <sessions>/devin-subagents/<session>/<fg|bg>-<key>. fg keys on tool_use_id
  // (identical on the Pre and Post of one call); bg keys on the agent id the
  // launch reply names.
  const markerDir = sessionId ? join(sessionsDir(projectDir), "devin-subagents", sessionId) : "";

  function writeMarker(name: string, record: Record<string, unknown>): void {
    if (!markerDir) return;
    try {
      mkdirSync(markerDir, { recursive: true });
      writeFileSync(join(markerDir, name), `${JSON.stringify({ ...record, ts: Date.now() })}\n`, "utf-8");
    } catch {
      // markers are advisory evidence; never block on them
    }
  }

  function readMarker(name: string): Record<string, unknown> | null {
    if (!markerDir) return null;
    try {
      return JSON.parse(readFileSync(join(markerDir, name), "utf-8")) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  function removeMarker(name: string): void {
    if (!markerDir) return;
    try {
      rmSync(join(markerDir, name), { force: true });
    } catch {
      // best effort
    }
  }

  function foregroundSubagentInFlight(): boolean {
    if (!markerDir || !existsSync(markerDir)) return false;
    try {
      const now = Date.now();
      return readdirSync(markerDir).some((name) => {
        if (!name.startsWith("fg-")) return false;
        try {
          return now - statSync(join(markerDir, name)).mtimeMs < SUBAGENT_STALE_MS;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }

  function logSubagentCompleted(profile: string, agentId: string, message: string): void {
    runCore("aidlc-log-subagent.ts", JSON.stringify({
      hook_event_name: "SubagentStop",
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(profile ? { agent_type: profile } : {}),
      ...(agentId ? { agent_id: agentId } : {}),
      ...(message ? { last_assistant_message: message.slice(0, 2000) } : {}),
    }));
  }

  // --- targets ----------------------------------------------------------------

  switch (target) {
    case "session-start":
      return advisory("aidlc-session-start.ts");
    case "session-end":
      return advisory("aidlc-session-end.ts");
    case "validate-state":
      return advisory("aidlc-validate-state.ts");

    case "record-human-turn":
      // UserPromptSubmit: the person's own message (measured: never fired for
      // a subagent's brief, prompt delivered unwrapped).
      return advisory("aidlc-record-human-turn.ts", JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        ...(sessionId ? { session_id: sessionId } : {}),
        prompt: str(devin.prompt),
      }));

    case "deliver-stage-rules": {
      // The matcher-free PreToolUse arm: the picker deny, then subagent dispatch.
      if (DEVIN_QUESTION_PICKERS.has(devinTool)) {
        // A picker answer arrives as a tool result, never as the person's own
        // message, so it cannot satisfy the human-presence check; and a picker
        // can be SKIPPED without blocking (CLI v3000.3.22), which would still
        // fire PostToolUse. While a workflow runs, questions go to chat as
        // numbered prose. Fails open whenever the state is unreadable.
        let running = false;
        try {
          const selection = resolveWorkflowSelection(projectDir, sessionId ? { sessionId } : {});
          const state = readFileSync(stateFilePathForSelection(projectDir, selection), "utf-8");
          running = state.match(/^- \*\*Status\*\*:\s*(\S+)\s*$/m)?.[1] === "Running";
        } catch {
          running = false;
        }
        if (running) {
          process.stdout.write(`${JSON.stringify({
            decision: "block",
            reason:
              "Render this AI-DLC question as numbered prose in chat per question-rendering.md, " +
              "then end the turn and wait for the person's next chat message. A picker answer " +
              "arrives as a tool result, not as the person's own message, so AI-DLC cannot record " +
              "it as their decision.",
          })}\n`);
        }
        return 0;
      }
      if (devinTool !== "run_subagent") return 0;
      const input = (devin.tool_input ?? {}) as Record<string, unknown>;
      const background = input.is_background === true;
      const callKey = digest(str(devin.tool_use_id) || randomUUID());
      const r = runCore("aidlc-deliver-stage-rules.ts", JSON.stringify(core));
      if (r.code === 2) {
        if (r.stderr) process.stderr.write(r.stderr);
        return 2; // the subagent is not started
      }
      if (!background) writeMarker(`fg-${callKey}`, { profile: str(input.profile) });
      // Hand a stage-rule rewrite back in Devin's own field.
      try {
        const out = JSON.parse(r.stdout) as {
          hookSpecificOutput?: { updatedInput?: Record<string, unknown> };
        };
        const updated = out.hookSpecificOutput?.updatedInput;
        const task = str(updated?.prompt);
        if (task && task !== str(input.task)) {
          process.stdout.write(`${JSON.stringify({
            hookSpecificOutput: { hookEventName: "PreToolUse", updatedInput: { task } },
          })}\n`);
        }
      } catch {
        // no rewrite: dispatch as authored
      }
      return 0;
    }

    case "state-transition-guard":
      return guard("aidlc-state-transition-guard.ts");
    case "reviewer-scope":
      return guard("aidlc-reviewer-scope.ts");
    case "review-freeze":
      return guard("aidlc-review-freeze.ts");
    case "plan-approval-guard":
      return guard("aidlc-plan-approval-guard.ts");

    case "audit-and-sensors":
      return advisory("aidlc-write-audit-log.ts");
    case "run-sensors":
      return advisory("aidlc-run-sensors.ts");
    case "sync-workflow-state":
      return advisory("aidlc-sync-workflow-state.ts");
    case "rebuild-stage-graph":
      return advisory("aidlc-rebuild-stage-graph.ts");

    case "log-subagent": {
      // PostToolUse on run_subagent / read_subagent. aidlc-log-subagent.ts
      // appends SUBAGENT_COMPLETED unconditionally, so this arm decides that a
      // completion happened exactly once.
      const input = (devin.tool_input ?? {}) as Record<string, unknown>;
      const text = responseText(devin.tool_response);
      if (devinTool === "run_subagent") {
        removeMarker(`fg-${digest(str(devin.tool_use_id))}`);
        if (!reportedOk(devin.tool_response)) return 0; // a refused spawn completed nothing
        const agentId = text.match(/agent_id=([A-Za-z0-9_-]+)/)?.[1] ?? "";
        if (input.is_background === true) {
          // A launch, not a completion: remember it until a read reports done.
          if (agentId) writeMarker(`bg-${digest(agentId)}`, { profile: str(input.profile), agentId });
          return 0;
        }
        logSubagentCompleted(str(input.profile), agentId, text);
        return 0;
      }
      if (devinTool === "read_subagent") {
        // Only the first read that reports a known background agent done counts.
        const agentId = str(input.agent_id);
        if (!agentId || !/\bcompleted\b/i.test(text)) return 0;
        const name = `bg-${digest(agentId)}`;
        const launch = readMarker(name);
        if (!launch) return 0;
        removeMarker(name);
        logSubagentCompleted(str(launch.profile), agentId, text);
      }
      return 0;
    }

    case "continue-workflow": {
      // A foreground subagent's own Stop arrives with the parent's session id;
      // the parent cannot stop while it waits on that call, so a Stop seen
      // with one in flight is the subagent's, and the gate is not for it.
      if (foregroundSubagentInFlight()) return 0;
      const r = runCore("aidlc-continue-workflow.ts", JSON.stringify(core));
      if (r.stdout) process.stdout.write(r.stdout);
      if (r.code === 2) {
        if (r.stderr) process.stderr.write(r.stderr);
        return 2;
      }
      return 0;
    }

    default:
      return 0; // unknown target: fail open rather than block on a packaging slip
  }
}

if (import.meta.main) {
  process.exit(await run(process.argv[2] ?? "", await Bun.stdin.text()));
}
