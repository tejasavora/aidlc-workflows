// t332-devin-adapter: pipe Devin hook payloads through the SHIPPED adapter and
// assert the on-the-wire contracts.
//
// covers: hook:aidlc-record-human-turn, hook:aidlc-log-subagent
//
// The fixture corpus (tests/fixtures/devin-hook-payloads/payloads.json) was
// captured live on Devin CLI 3000.6.12 and 3000.11.3 with a stdin-capture hook
// on every event. Devin's envelope IS Claude Code's; what the adapter translates
// is tool NAMES and three input/lifecycle differences. The contracts under test:
//
//   - TOOL_MAP: every Devin lowercase snake_case name reaches the core hook as the
//     PascalCase name that hook compares INTERNALLY.
//   - run_subagent `{title, task, profile, is_background}` reaches the core as
//     Claude's Task shape (`subagent_type`, `prompt`, `run_in_background`), and
//     todo_write `{todos: [...]}` as TaskUpdate `{status, activeForm}`.
//   - Subagent completion is logged exactly once: from a successful foreground
//     run_subagent result, or from the first read_subagent reply that reports a
//     known background agent done; never for a refused spawn or a repeat poll.
//   - A Stop seen while a foreground subagent is in flight is the subagent's own
//     and is not judged by the forwarding-loop gate.
//   - The person's message is recorded as HUMAN_TURN through the dispatcher's
//     authority path (a by-path launch of that hook mints nothing).
//   - The picker deny: ask_user_question is refused while the selected workflow is
//     Running, using Devin's block dialect ({"decision":"block"} on stdout at exit
//     0). It FAILS OPEN on every uncertain case.
//   - Fail-open on malformed stdin and on an unknown subcommand.
//
// Every case spawns the real emitted adapter file: the shipped path.

import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toCorePayload } from "../../dist/devin/.devin/hooks/aidlc-devin-adapter.ts";
import { writeSessionPidEntry } from "../../dist/devin/.devin/tools/aidlc-lib.ts";
import {
  createTestProject,
  seedAidlcMemory,
  seedAuditFile,
  seededAuditShard,
  seedStateFile,
} from "../harness/fixtures.ts";

setDefaultTimeout(30_000);

const REPO_ROOT = join(import.meta.dir, "..", "..");
const DIST = join(REPO_ROOT, "dist", "devin");
const PAYLOADS = JSON.parse(
  readFileSync(
    join(import.meta.dir, "..", "fixtures", "devin-hook-payloads", "payloads.json"),
    "utf-8",
  ),
) as Record<string, Record<string, unknown>>;

/** Seed a throwaway project from the emitted tree. */
function seedProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "aidlc-t332-"));
  cpSync(join(DIST, ".devin"), join(dir, ".devin"), { recursive: true });
  cpSync(join(DIST, "aidlc"), join(dir, "aidlc"), { recursive: true });
  cpSync(join(DIST, "AGENTS.md"), join(dir, "AGENTS.md"));
  return dir;
}

/** Give the project a workflow whose state carries the given Status. */
function seedWorkflow(dir: string, status: string): void {
  const record = join(dir, "aidlc", "spaces", "default", "intents", "t332-probe");
  mkdirSync(record, { recursive: true });
  writeFileSync(
    join(record, "aidlc-state.md"),
    [
      "# AI-DLC Workflow State",
      "",
      "- **Intent**: t332-probe",
      "- **State Version**: 8",
      `- **Status**: ${status}`,
      "- **Current Stage**: intent-capture",
      "",
    ].join("\n"),
    "utf-8",
  );
  writeFileSync(
    join(dir, "aidlc", "spaces", "default", "intents", "active-intent"),
    "t332-probe\n",
    "utf-8",
  );
}

interface Fired {
  status: number | null;
  stdout: string;
  stderr: string;
}

function fire(dir: string, subcommand: string, payload: unknown): Fired {
  const adapter = join(dir, ".devin", "hooks", "aidlc-devin-adapter.ts");
  const r = spawnSync(process.execPath, [adapter, subcommand], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    cwd: dir,
    encoding: "utf-8",
    env: { ...process.env, DEVIN_PROJECT_DIR: dir, AIDLC_PROJECT_DIR: dir },
  });
  return {
    status: r.status,
    stdout: String(r.stdout ?? ""),
    stderr: String(r.stderr ?? ""),
  };
}

/** A project with a real running workflow and its audit shard, the Devin tree installed. */
function runningProject(): string {
  const dir = createTestProject();
  cpSync(join(DIST, ".devin"), join(dir, ".devin"), { recursive: true });
  seedAidlcMemory(dir);
  seedStateFile(dir, "state-construction.md");
  seedAuditFile(dir);
  return dir;
}

function eventCount(dir: string, event: string): number {
  const shard = seededAuditShard(dir);
  return existsSync(shard) ? readFileSync(shard, "utf-8").split(`**Event**: ${event}`).length - 1 : 0;
}

function markerNames(dir: string): string[] {
  const root = join(dir, "aidlc", ".aidlc-sessions", "devin-subagents", "probe-session-0001");
  return existsSync(root) ? readdirSync(root) : [];
}

describe("t332 devin adapter — on-the-wire contracts", () => {
  test("1: the fixture corpus covers every wired event", () => {
    const wiring = JSON.parse(
      readFileSync(join(DIST, ".devin", "hooks.v1.json"), "utf-8"),
    ) as Record<string, unknown>;
    // Every event the emitted config registers should have at least one payload
    // in the corpus, or the corpus is not exercising the shipped wiring.
    const covered = new Set(
      Object.values(PAYLOADS)
        .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
        .map((p) => p.hook_event_name)
        .filter((n): n is string => typeof n === "string"),
    );
    for (const event of Object.keys(wiring)) {
      expect(covered.has(event), `corpus covers wired event ${event}`).toBe(true);
    }

    // ...and every TOOL NAME the matchers select. Event coverage alone is too weak:
    // it passed while `read_subagent` sat in the log-subagent matcher with no payload
    // in the corpus, so nothing ever exercised that arm -- and because
    // aidlc-log-subagent.ts appends SUBAGENT_COMPLETED with no dedupe, the untested
    // arm was writing duplicate "unknown" events into an append-only ledger. A wired
    // tool with no payload is an arm no test can see.
    const coveredTools = new Set(
      Object.values(PAYLOADS)
        .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
        .map((p) => p.tool_name)
        .filter((n): n is string => typeof n === "string"),
    );
    for (const [event, groups] of Object.entries(wiring)) {
      for (const group of groups as Array<{ matcher?: string }>) {
        const matcher = group.matcher ?? "";
        if (matcher === "") continue; // matcher-free arms fire for every tool
        for (const tool of matcher.replace(/[\^$()]/g, "").split("|").filter(Boolean)) {
          expect(
            coveredTools.has(tool),
            `corpus has a payload for ${tool}, wired on ${event}`,
          ).toBe(true);
        }
      }
    }
  });

  test("2: TOOL_MAP translates every Devin name the core hooks compare internally", () => {
    const adapter = readFileSync(
      join(DIST, ".devin", "hooks", "aidlc-devin-adapter.ts"),
      "utf-8",
    );
    // The three internal comparisons the mapping exists to satisfy.
    for (const [devinName, claudeName] of [
      ["exec", "Bash"],
      ["edit", "Edit"],
      ["apply_patch", "Edit"],
      ["write", "Write"],
      ["notebook_edit", "NotebookEdit"],
      ["grep", "Grep"],
      ["glob", "Glob"],
      ["read", "Read"],
      ["run_subagent", "Task"],
      ["todo_write", "TaskUpdate"],
    ] as const) {
      expect(
        new RegExp(`${devinName}\\s*:\\s*"${claudeName}"`).test(adapter),
        `${devinName} -> ${claudeName}`,
      ).toBe(true);
    }
  });

  test("3: the picker is denied while the selected workflow is Running", () => {
    const dir = seedProject();
    try {
      seedWorkflow(dir, "Running");
      const r = fire(dir, "deliver-stage-rules", PAYLOADS.preToolUseAskUserQuestion);
      // Devin's own block dialect: decision on stdout, exit 0. NOT Copilot's
      // hookSpecificOutput.permissionDecision, which is undocumented here.
      expect(r.status).toBe(0);
      const parsed = JSON.parse(r.stdout) as { decision?: string; reason?: string };
      expect(parsed.decision).toBe("block");
      expect(parsed.reason).toContain("question-rendering.md");
      expect(r.stdout).not.toContain("permissionDecision");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("4: the picker FAILS OPEN when no workflow is running", () => {
    const dir = seedProject();
    try {
      // Status that is not Running, plus the no-state case below.
      seedWorkflow(dir, "Complete");
      const settled = fire(dir, "deliver-stage-rules", PAYLOADS.preToolUseAskUserQuestion);
      expect(settled.status).toBe(0);
      expect(settled.stdout).not.toContain('"decision":"block"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("5: the picker FAILS OPEN when there is no workflow state at all", () => {
    const dir = seedProject();
    try {
      const r = fire(dir, "deliver-stage-rules", PAYLOADS.preToolUseAskUserQuestion);
      expect(r.status).toBe(0);
      expect(r.stdout).not.toContain('"decision":"block"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("6: a non-picker tool on the same arm is never denied", () => {
    const dir = seedProject();
    try {
      seedWorkflow(dir, "Running");
      for (const key of ["preToolUseRead", "preToolUseGrep", "preToolUseExec"] as const) {
        const r = fire(dir, "deliver-stage-rules", PAYLOADS[key]);
        expect(r.stdout, `${key} not denied by the picker branch`).not.toContain(
          "question-rendering.md",
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("7: malformed stdin fails open rather than blocking the turn", () => {
    const dir = seedProject();
    try {
      seedWorkflow(dir, "Running");
      for (const junk of ["", "not json", "{unterminated"]) {
        const r = fire(dir, "deliver-stage-rules", junk);
        expect(r.status, `junk stdin ${JSON.stringify(junk)} fails open`).toBe(0);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("8: an unknown subcommand fails open (packaging slip must not block)", () => {
    const dir = seedProject();
    try {
      const r = fire(dir, "no-such-subcommand", PAYLOADS.preToolUseExec);
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("9: a foreground completion logs one SUBAGENT_COMPLETED, attributed to the profile", () => {
    const dir = runningProject();
    try {
      const before = eventCount(dir, "SUBAGENT_COMPLETED");
      expect(fire(dir, "log-subagent", PAYLOADS.postToolUseRunSubagent).status).toBe(0);
      expect(eventCount(dir, "SUBAGENT_COMPLETED")).toBe(before + 1);
      const shard = readFileSync(seededAuditShard(dir), "utf-8");
      expect(shard).toContain("**Agent Type**: aidlc-developer-agent");
      expect(shard).toContain("**Agent ID**: a1b2c3d4");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("11: a refused spawn and a poll of an unknown agent log nothing", () => {
    // PostToolUse fires on a refused spawn too (success:false), and
    // aidlc-log-subagent.ts appends unconditionally, so the adapter decides.
    const dir = runningProject();
    try {
      const before = eventCount(dir, "SUBAGENT_COMPLETED");
      expect(fire(dir, "log-subagent", PAYLOADS.postToolUseRunSubagentRefused).status).toBe(0);
      expect(fire(dir, "log-subagent", PAYLOADS.postToolUseReadSubagent).status).toBe(0);
      expect(eventCount(dir, "SUBAGENT_COMPLETED")).toBe(before);
      expect(readFileSync(seededAuditShard(dir), "utf-8")).not.toContain("**Agent Type**: unknown");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("12: a background launch logs nothing; its first completed read logs once", () => {
    const dir = runningProject();
    try {
      const before = eventCount(dir, "SUBAGENT_COMPLETED");
      expect(fire(dir, "log-subagent", PAYLOADS.postToolUseRunSubagentBackground).status).toBe(0);
      expect(eventCount(dir, "SUBAGENT_COMPLETED")).toBe(before);
      expect(markerNames(dir).some((n) => n.startsWith("bg-"))).toBe(true);
      expect(fire(dir, "log-subagent", PAYLOADS.postToolUseReadSubagent).status).toBe(0);
      expect(fire(dir, "log-subagent", PAYLOADS.postToolUseReadSubagent).status).toBe(0);
      expect(eventCount(dir, "SUBAGENT_COMPLETED")).toBe(before + 1);
      expect(readFileSync(seededAuditShard(dir), "utf-8")).toContain("**Agent Type**: aidlc-product-agent");
      expect(markerNames(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("13: run_subagent and todo_write reach the core in Claude's shapes", () => {
    const task = toCorePayload(PAYLOADS.preToolUseRunSubagent as never);
    expect(task.tool_name).toBe("Task");
    expect(task.tool_input).toMatchObject({
      subagent_type: "aidlc-developer-agent",
      prompt: "implement unit",
      profile: "aidlc-developer-agent",
      task: "implement unit",
    });
    expect((task.tool_input as Record<string, unknown>).run_in_background).toBeUndefined();
    const bg = toCorePayload(PAYLOADS.postToolUseRunSubagentBackground as never);
    expect((bg.tool_input as Record<string, unknown>).run_in_background).toBe(true);
    const todo = toCorePayload(PAYLOADS.postToolUseTodoWrite as never);
    expect(todo.tool_name).toBe("TaskUpdate");
    expect(todo.tool_input).toMatchObject({
      status: "in_progress",
      activeForm: "Running domain design [domain-design]",
    });
    // File tools already carry Claude's keys and pass through unchanged.
    const edit = toCorePayload(PAYLOADS.preToolUseEdit as never);
    expect(edit.tool_name).toBe("Edit");
    expect(edit.tool_input).toEqual((PAYLOADS.preToolUseEdit as { tool_input: Record<string, unknown> }).tool_input);
  });

  test("14: a Stop while a foreground subagent is in flight is passed through", () => {
    // The subagent's own Stop arrives with the parent's session id. The parent
    // cannot stop while it waits on the foreground call, so that Stop is the
    // subagent's and must not be judged by the forwarding-loop gate.
    const dir = runningProject();
    try {
      const pre = fire(dir, "deliver-stage-rules", PAYLOADS.preToolUseRunSubagent);
      expect(pre.status).toBe(0);
      // The stage rules ride the brief in Devin's own `task` field (Devin merges
      // a partial updatedInput into the tool arguments; measured live).
      const updated = JSON.parse(pre.stdout) as {
        hookSpecificOutput: { hookEventName: string; updatedInput: Record<string, unknown> };
      };
      expect(updated.hookSpecificOutput.hookEventName).toBe("PreToolUse");
      expect(Object.keys(updated.hookSpecificOutput.updatedInput)).toEqual(["task"]);
      expect(String(updated.hookSpecificOutput.updatedInput.task)).toContain("AIDLC_DISPATCH_RULES_BEGIN");
      expect(markerNames(dir).filter((n) => n.startsWith("fg-"))).toHaveLength(1);
      const stop = fire(dir, "continue-workflow", PAYLOADS.stop);
      expect(stop.status).toBe(0);
      expect(stop.stdout.trim()).toBe("");
      expect(fire(dir, "log-subagent", PAYLOADS.postToolUseRunSubagent).status).toBe(0);
      expect(markerNames(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("15: the person's message lands HUMAN_TURN through the dispatcher's authority path", () => {
    const dir = runningProject();
    try {
      // The adapter is this process's child, so the ancestry walk finds the
      // session through this pid, as it finds Devin's on a real host.
      writeSessionPidEntry(dir, process.pid, "probe-session-0001");
      const before = eventCount(dir, "HUMAN_TURN");
      expect(fire(dir, "record-human-turn", PAYLOADS.userPromptSubmit).status).toBe(0);
      expect(eventCount(dir, "HUMAN_TURN")).toBe(before + 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("10: the picker set is separate from the matchable tool list", () => {
    // ask_user_question is NOT a documented matchable Devin tool name, so it must
    // never appear in a hooks.v1.json matcher (emit.ts would reject the build) and
    // the deny must live on the matcher-free arm instead.
    const wiring = readFileSync(join(DIST, ".devin", "hooks.v1.json"), "utf-8");
    expect(wiring).not.toContain("ask_user_question");
    const adapter = readFileSync(
      join(DIST, ".devin", "hooks", "aidlc-devin-adapter.ts"),
      "utf-8",
    );
    expect(adapter).toContain("DEVIN_QUESTION_PICKERS");
    expect(adapter).toContain("ask_user_question");
    // Devin's dialect, not Copilot's. Matched loosely on the key/value pair so a
    // reformat does not fail the test, but the WRONG dialect still does.
    expect(adapter).toMatch(/decision:\s*"block"/);
    // Copilot's permissionDecision must not be EMITTED here. The word appears in a
    // comment explaining why it is not used, so strip comment lines before
    // asserting - checking the raw file would fail on its own rationale.
    const code = adapter
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toContain("permissionDecision");
  });
});
