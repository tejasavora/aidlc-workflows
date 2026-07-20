---
slug: dast
phase: construction
execution: CONDITIONAL
condition: Execute when security requirements exist and a running application endpoint is available. Skip for libraries, CLIs without network exposure, or when no security NFRs are defined.
lead_agent: aidlc-devsecops-agent
support_agents:
  - aidlc-quality-agent
mode: inline
produces:
  - dast-report
  - dast-questions
consumes:
  - artifact: security-scan-report
    required: true
  - artifact: security-requirements
    required: false
  - artifact: build-test-results
    required: true
requires_stage:
  - security-scan
  - build-and-test
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - security-patch
inputs: Running application from build-and-test, security requirements from nfr-requirements
outputs: aidlc-docs/construction/dast/dast-report.md, aidlc-docs/construction/dast/dast-questions.md
---

# Dynamic Application Security Testing (DAST)

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-devsecops-agent persona from `agents/aidlc-devsecops-agent.md` and knowledge from `.codex/knowledge/aidlc-devsecops-agent/`.

### Step 2: Load Prior Context

- Read security scan results from `aidlc-docs/construction/security-scan/`
- Read security requirements from `aidlc-docs/construction/nfr-requirements/`
- Read API specification from `aidlc-docs/construction/*/functional-design/`

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What DAST tool to use (OWASP ZAP, Nuclei, Burp Suite CLI, custom scripts)?
- What is the application's base URL for testing?
- What authentication mechanism is needed for authenticated scans?
- Are there any endpoints that should be excluded from testing (destructive operations)?

Follow stage-protocol.md question flow.

### Step 4: Configure and Execute DAST

1. Start the application in a test environment
2. Configure the DAST tool with target URL, authentication, and scan policy
3. Run passive scan (observe traffic, no active attacks)
4. Run active scan (injection tests, authentication bypass, SSRF, path traversal)
5. Collect findings with severity ratings

### Step 5: Self-Healing Loop

```
attempt = 0
max_attempts = 3

WHILE critical/high DAST findings exist AND attempt < max_attempts:
  1. CLASSIFY each finding:
     - auto-fixable: missing security headers, CORS misconfiguration,
       cookie flags, verbose error messages, directory listing
     - needs-code-fix: SQL injection, XSS, authentication bypass,
       insecure direct object reference
     - false-positive: confirm with manual verification
  2. AUTO-FIX auto-fixable findings (add headers, fix config)
  3. For needs-code-fix: apply input validation, parameterized queries,
     output encoding, access control checks
  4. RE-RUN affected scan categories
  5. attempt += 1

IF critical/high findings remain after max_attempts:
  ESCALATE: present findings with exploit evidence, impact assessment,
  and recommended remediation to user
```

### Step 6: Generate Report

Create `aidlc-docs/construction/dast/dast-report.md`:
- DAST tool and scan configuration
- Findings by OWASP Top 10 category and severity
- Auto-remediated findings
- Remaining findings with risk assessment and exploit evidence
- Compliance mapping (OWASP Top 10, CWE, PCI-DSS if applicable)

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :dart:
- Summary of dast-report
- Review path: `<record>/construction/dast/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun .codex/tools/aidlc-orchestrate.ts report --stage dast --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/construction/dast/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/dast/required-sections-<iso>.md`.

## Learn

While running this stage, maintain a running log in
`<record>/<phase>/<stage>/memory.md` (create on stage start if absent).
Append entries under four standard headings:

- **Interpretations** — choices made where the stage prose was ambiguous
- **Deviations** — places you intentionally departed from the stage prose, and why
- **Tradeoffs** — alternatives considered and why you picked what you did
- **Open questions** — anything to confirm before next run, or uncertain context

Format each entry with an ISO 8601 timestamp:
`- 2026-05-20T10:14:32Z — <summary>; <context>`

Before the approval gate, read memory.md and surface candidates as a
structured question. For each entry the user keeps, write to the appropriate
harness destination per `stage-protocol.md` §13 — never to this stage file:

- Prescriptive rule → a practice line under the routed heading in
  `aidlc/spaces/<active-space>/memory/project.md` (default) or `team.md` (promoted)
- Verification check → new manifest at `.codex/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
