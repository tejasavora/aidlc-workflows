---
slug: data-privacy-compliance
phase: governance
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

Load aidlc-compliance-agent persona from `agents/aidlc-compliance-agent.md` and knowledge from `.claude/knowledge/aidlc-compliance-agent/`.

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

### Step 7: Update State

Mark data-privacy-compliance as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :lock:
Review path: `aidlc-docs/governance/data-privacy-compliance/`
Standard 2-option approval (Approve / Request Changes).
