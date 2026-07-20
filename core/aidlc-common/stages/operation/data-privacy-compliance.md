---
slug: data-privacy-compliance
phase: operation
execution: CONDITIONAL
condition: Execute when the system processes personal data (PII, PHI, financial) or operates in regulated jurisdictions (EU/GDPR, CCPA, HIPAA).
lead_agent: aidlc-compliance-agent
support_agents:
  - aidlc-devsecops-agent
  - aidlc-developer-agent
mode: inline
produces:
  - privacy-implementation-report
  - data-classification-map
  - erasure-verification
  - data-privacy-questions
consumes:
  - artifact: code-summary
    required: true
  - artifact: requirements
    required: false
requires_stage:
  - code-generation
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
inputs: Generated code, requirements (for data handling descriptions), infrastructure design
outputs: aidlc-docs/governance/data-privacy-compliance/privacy-implementation-report.md, aidlc-docs/governance/data-privacy-compliance/data-classification-map.md, aidlc-docs/governance/data-privacy-compliance/erasure-verification.md
---

# Data Privacy Compliance

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-compliance-agent persona from `agents/aidlc-compliance-agent.md` and knowledge from `{{HARNESS_DIR}}/knowledge/aidlc-compliance-agent/`.

### Step 2: Data Classification Scan

Scan the codebase for personal data handling:
- Identify all data models/entities containing PII fields (name, email, phone, address, SSN, DOB)
- Identify PHI fields if healthcare (diagnoses, medications, lab results)
- Identify financial data (card numbers, bank accounts, transactions)
- Map data flow: where PII enters → where it's stored → where it's logged → where it exits
- Flag: PII in logs, PII in error messages, PII in analytics events, PII in caches without TTL

### Step 3: Generate Clarifying Questions

- Which privacy frameworks apply (GDPR, CCPA, HIPAA, PCI-DSS)?
- What is the lawful basis for processing each data category?
- What is the data retention period per category?
- Is cross-border data transfer involved (data residency requirements)?
- Who is the Data Protection Officer / privacy contact?

### Step 4: Verify Privacy Implementations

For each applicable requirement:
- **Right to erasure (GDPR Art. 17):** Verify deletion endpoint exists, cascades to all stores (DB, cache, search index, backups), and is tested
- **Data minimization:** Verify only necessary fields are collected and stored
- **Log sanitization:** Verify PII is masked/redacted in application logs, CloudWatch, X-Ray traces
- **Encryption:** Verify PII encrypted at rest (KMS/field-level) and in transit (TLS)
- **Access logging:** Verify access to PII tables/fields is audited
- **Retention automation:** Verify TTL/lifecycle policies auto-delete data after retention period
- **Consent management:** If applicable, verify consent is recorded and honored
- **Data residency:** Verify data stays in required region (no cross-region replication of PII without basis)

### Step 5: Self-Healing Loop

```
WHILE privacy violations found AND attempt < 3:
  - PII in logs → add log sanitization middleware/filter
  - Missing erasure endpoint → generate deletion API + cascade logic
  - No encryption at rest → enable KMS encryption on data store
  - Missing retention policy → add TTL/lifecycle rule
  - RE-VERIFY affected areas
```

### Step 6: Generate Report

Create `privacy-implementation-report.md`:
- Frameworks assessed against
- Data classification summary (what PII, where, how much)
- Per-requirement verification status (pass/fail/partial)
- Violations found and auto-remediated
- Remaining gaps requiring human decision (legal basis determination)

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :lock:
- Summary of privacy-implementation-report, data-classification-map, erasure-verification
- Review path: `<record>/operation/data-privacy-compliance/`
- Structured approval question with options: Approve (continue to `directive.next_stage`) / Request Changes

STOP for the human response. Report **Approve** with
`bun {{HARNESS_DIR}}/tools/aidlc-orchestrate.ts report --stage data-privacy-compliance --result approved --user-input "<exact choice>"`; report
**Request Changes** with `--result rejected --user-input "<feedback>"`, run the
revision loop, and report `--result revised` before re-presenting. The engine
owns every lifecycle transition and advancement — never call `aidlc-state.ts`
directly, never hand-edit the state file, never mark checkboxes yourself.

## Sensors

This stage's outputs are markdown artefacts under `<record>/operation/data-privacy-compliance/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.aidlc-sensors/data-privacy-compliance/required-sections-<iso>.md`.

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
- Verification check → new manifest at `{{HARNESS_DIR}}/sensors/aidlc-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

Even when nothing surfaces, still ask the mandatory "Anything to add for next time?" question from stage-protocol.md section 13. Do not infer "Nothing to add." Only after the human answers that question may you proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
