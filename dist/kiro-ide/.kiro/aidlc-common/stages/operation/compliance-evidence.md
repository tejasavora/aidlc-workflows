---
slug: compliance-evidence
phase: operation
execution: CONDITIONAL
condition: Execute when regulatory frameworks are declared (SOC2, HIPAA, PCI-DSS, ISO27001) or when compliance evidence collection is needed for audits.
lead_agent: aidlc-compliance-agent
support_agents:
  - aidlc-devsecops-agent
mode: inline
produces:
  - evidence-collection
  - control-mapping
  - compliance-evidence-questions
consumes:
  - artifact: security-scan-report
    required: false
  - artifact: build-test-results
    required: false
  - artifact: deployment-log
    required: false
requires_stage: []
sensors:
  - required-sections
scopes:
  - enterprise
  - feature
  - security-patch
inputs: All AI-DLC artifacts (requirements, designs, code, tests, deployments), security scan results, access logs
outputs: aidlc-docs/governance/compliance-evidence/evidence-collection.md, aidlc-docs/governance/compliance-evidence/control-mapping.md, aidlc-docs/governance/compliance-evidence/compliance-evidence-questions.md
---

# Compliance Evidence Collection

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load aidlc-compliance-agent persona from `agents/aidlc-compliance-agent.md` and knowledge from `.claude/knowledge/aidlc-compliance-agent/`.

### Step 2: Load Prior Context

- Read all available AI-DLC artifacts across phases
- Read security scan results from `aidlc-docs/construction/security-scan/`
- Read deployment logs from `aidlc-docs/operation/deployment-execution/`
- Read audit trail (if aidlc-audit.ts events exist)

### Step 3: Generate Clarifying Questions

Create questions file covering:
- What compliance frameworks apply (SOC2, HIPAA, PCI-DSS, ISO27001, FedRAMP)?
- What is the audit scope (full system, specific components)?
- What evidence format is required (narrative, screenshots, log exports)?
- Who is the auditor audience (internal audit, external auditor, regulator)?
- What control period applies (last quarter, last year)?

Follow stage-protocol.md question flow.

### Step 4: Map Controls to Evidence

Create `control-mapping.md`:

For each applicable framework, map controls to AI-DLC artifacts:

**SOC2 example:**
| Control | Category | Evidence Source | AI-DLC Artifact |
|---------|----------|----------------|-----------------|
| CC6.1 | Logical Access | IAM policies | infrastructure-design |
| CC7.1 | Change Management | PR reviews, approvals | audit trail, code-review |
| CC7.2 | System Monitoring | CloudWatch config | observability-setup |
| CC8.1 | Incident Management | Runbooks, postmortems | incident-response, postmortem |

### Step 5: Collect Evidence

For each control, gather the evidence artifact:
- Extract relevant sections from AI-DLC documents
- Capture configuration snapshots (IAM policies, security groups, encryption settings)
- Export audit logs for the control period
- Collect approval records (gate approvals from stage-protocol)
- Screenshot monitoring dashboards where applicable

### Step 6: Generate Evidence Collection

Create `evidence-collection.md`:
- Evidence index (control ID → evidence location → status)
- For each control: evidence narrative + artifact reference + gap analysis
- Overall compliance posture: percentage of controls with evidence
- Gaps: controls without sufficient evidence, with remediation recommendations
- Evidence freshness: when each piece of evidence was last validated

### Step 7: Update State

Mark compliance-evidence as `[x]` completed in `aidlc-docs/aidlc-state.md`.

### Step 8: Present Completion & Request Approval

Completion emoji: :clipboard:
Review path: `aidlc-docs/governance/compliance-evidence/`
Standard 2-option approval (Approve / Request Changes).
