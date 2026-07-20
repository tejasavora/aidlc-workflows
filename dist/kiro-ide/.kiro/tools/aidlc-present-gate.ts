// aidlc-present-gate.ts — The ONLY way for the agent to request stage approval.
//
// The agent calls this after completing stage work. It:
// 1. Verifies artifacts exist (same checks as the old approve guard)
// 2. Verifies workspace_requires (if applicable)
// 3. If checks FAIL → returns error (agent needs to do more work)
// 4. If checks PASS → marks stage as awaiting-approval in state
//    and returns a signal telling the agent to present AskUserQuestion
//
// The agent CANNOT approve the stage itself. After this tool returns success,
// the agent MUST present an AskUserQuestion to the human. The human's click
// triggers approval via the PostToolUse hook on AskUserQuestion.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  findStageBySlug,
  getField,
  harnessDir,
  isoTimestamp,
  readStateFile,
  resolveProjectDir,
  setCheckbox,
  setField,
  writeStateFile,
} from "./aidlc-lib.ts";
import { appendAuditEntry } from "./aidlc-audit.ts";

function error(msg: string): never {
  console.log(JSON.stringify({ error: msg }));
  process.exit(1);
}

const args = process.argv.slice(2);

// Extract --project-dir flag
let projectDir: string | undefined;
const pdIdx = args.indexOf("--project-dir");
if (pdIdx !== -1 && pdIdx + 1 < args.length) {
  projectDir = args[pdIdx + 1];
  args.splice(pdIdx, 2);
}

const slug = args.filter(a => !a.startsWith("--"))[0];
if (!slug) error("Usage: aidlc-present-gate.ts <stage-slug> [--confirm]");

const pd = resolveProjectDir(projectDir);
const content = readStateFile(pd);

// --- CONFIRM MODE: called after human approves via AskUserQuestion ---
if (args.includes("--confirm")) {
  const checkboxMatch = content.match(new RegExp(`- \\[\\?\\] ${slug}`));
  if (!checkboxMatch) {
    error(`Cannot confirm "${slug}" — stage is not in awaiting-approval [?] state. Call without --confirm first.`);
  }

  const approveProc = Bun.spawnSync({
    cmd: ["bun", join(pd, ".claude", "tools", "aidlc-state.ts"), "approve", slug, "--user-input", "Approve (human confirmed via AskUserQuestion)"],
    cwd: pd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, AIDLC_CI: "true" },
    timeout: 10000,
  });

  if (approveProc.exitCode === 0) {
    const result = new TextDecoder().decode(approveProc.stdout).trim();
    console.log(JSON.stringify({
      status: "approved",
      slug,
      engine_result: result,
      message: `Stage "${slug}" approved and advanced. Call \`bun ${harnessDir()}/tools/aidlc-orchestrate.ts next\` for the next directive.`
    }));
  } else {
    const err = new TextDecoder().decode(approveProc.stderr).trim();
    error(`Approve failed: ${err}`);
  }
  process.exit(0);
}
// --- END CONFIRM MODE ---

// --- REVIEWER ENFORCEMENT ---
// The orchestrator must dispatch a reviewer subagent BEFORE calling present-gate.
// The reviewer writes its verdict to aidlc-docs/.aidlc-reviews/<slug>-review.md
// present-gate checks that file exists and contains "PASS"
const reviewDir = join(pd, "aidlc-docs", ".aidlc-reviews");
const reviewFile = join(reviewDir, `${slug}-review.md`);

// Skip reviewer requirement for initialization stages (they're auto-proceed)
const initStages = ["workspace-scaffold", "workspace-detection", "state-init"];
if (!initStages.includes(slug)) {
  if (!existsSync(reviewFile)) {
    error(
      `Cannot present gate for "${slug}" — no reviewer verdict found.\n` +
      `Expected: aidlc-docs/.aidlc-reviews/${slug}-review.md\n` +
      `You MUST dispatch aidlc-stage-reviewer-agent (Task tool) to review the stage output BEFORE calling present-gate.\n` +
      `The reviewer writes its verdict to the file above. Only then can you present the gate.`
    );
  }
  const reviewContent = readFileSync(reviewFile, "utf-8");
  if (!reviewContent.includes("PASS")) {
    error(
      `Cannot present gate for "${slug}" — reviewer verdict is NOT PASS.\n` +
      `Review content:\n${reviewContent.slice(0, 500)}\n\n` +
      `Fix the issues the reviewer identified, then re-dispatch the reviewer. Only a PASS verdict allows gate presentation.`
    );
  }
}
// --- END REVIEWER ENFORCEMENT ---

const stage = findStageBySlug(slug);
if (!stage) error(`Unknown stage: ${slug}`);

// Verify the stage is the current stage
const currentStage = getField(content, "Current Stage");
if (currentStage !== slug) {
  error(`Cannot present gate for "${slug}" — current stage is "${currentStage}". Do the stages in order.`);
}

// --- Artifact verification (same as old approve guard) ---
const docsDir = join(pd, "aidlc-docs");
const produces = stage.produces ?? [];

let docsExist = false;
if (produces.length > 0) {
  const phaseDirs = ["ideation", "inception", "construction", "operation", "maintenance", "governance"];
  for (const phase of phaseDirs) {
    const stageDir = join(docsDir, phase, slug);
    try {
      const files = readdirSync(stageDir);
      if (files.filter((f: string) => f.endsWith(".md") && f !== "memory.md").length > 0) {
        docsExist = true;
        break;
      }
    } catch { /* */ }
  }
  if (!docsExist) {
    const constDir = join(docsDir, "construction");
    try {
      const units = readdirSync(constDir);
      for (const unit of units) {
        try {
          const files = readdirSync(join(constDir, unit, slug));
          if (files.filter((f: string) => f.endsWith(".md")).length > 0) {
            docsExist = true;
            break;
          }
        } catch { /* */ }
      }
    } catch { /* */ }
  }
} else {
  docsExist = true;
}

// Workspace requires check
const workspaceRequired = (stage as any).workspace_requires === true;
let workspaceChanged = false;

if (workspaceRequired) {
  try {
    const { spawnSync } = require("child_process");
    // Check uncommitted
    let proc = spawnSync("git", ["diff", "--name-only", "HEAD", "--", "src/"], { cwd: pd, timeout: 5000 });
    let output = proc.stdout?.toString().trim() || "";
    if (output.length > 0) {
      workspaceChanged = true;
    } else {
      // Check untracked
      proc = spawnSync("git", ["ls-files", "--others", "--exclude-standard", "--", "src/"], { cwd: pd, timeout: 5000 });
      output = proc.stdout?.toString().trim() || "";
      if (output.length > 0) {
        workspaceChanged = true;
      } else {
        // Check last commit
        proc = spawnSync("git", ["diff", "--name-only", "HEAD~1", "HEAD", "--", "src/"], { cwd: pd, timeout: 5000 });
        output = proc.stdout?.toString().trim() || "";
        workspaceChanged = output.length > 0;
      }
    }
  } catch { /* */ }
}

// Enforce checks
if (workspaceRequired && !workspaceChanged) {
  error(
    `Cannot present gate for "${slug}" — workspace_requires is true but no source files changed in src/. ` +
    `Write real code before presenting the gate.`
  );
}

if (!docsExist && !workspaceChanged) {
  error(
    `Cannot present gate for "${slug}" — no output detected. ` +
    `Expected artifacts: ${produces.join(", ")}. ` +
    `Produce output before presenting the gate.`
  );
}

// --- All checks pass — mark awaiting-approval ---
let newContent = content;
newContent = setCheckbox(newContent, slug, "awaiting-approval");
newContent = setField(newContent, "Last Updated", isoTimestamp());

try {
  appendAuditEntry("STAGE_AWAITING_APPROVAL", { Stage: slug }, pd);
} catch (e) {
  // Non-fatal
}

writeStateFile(pd, newContent);

// Return success — agent must now present AskUserQuestion to human
console.log(JSON.stringify({
  status: "ready_for_human_approval",
  slug,
  message: `Stage "${slug}" is ready for approval. Present the completion summary to the human using AskUserQuestion.`,
  next_steps: [
    "1. Present AskUserQuestion with options: Approve / Request Changes",
    `2. AFTER human clicks Approve, call: bun ${harnessDir()}/tools/aidlc-present-gate.ts ${slug} --confirm`,
    `3. Then call: bun ${harnessDir()}/tools/aidlc-orchestrate.ts next`,
    "DO NOT skip step 2. DO NOT call next without calling --confirm first. The workflow will not advance without --confirm."
  ]
}));

