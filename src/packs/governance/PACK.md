---
name: governance
description: |
  Compliance and audit infrastructure for regulated environments. Provides immutable
  audit trails of all decisions and changes, compliance evidence collection mapped to
  regulatory frameworks (SOC2, HIPAA, PCI, ISO27001), and policy-driven change approval
  workflows. Activates when a regulated environment is declared or audit trail is requested.
metadata:
  activation: when-regulated-environment-or-audit-requested
  phase: common
  runs-after: none
  configurable: true
---

# Governance Extension Pack

## Activation

Activates when any of the following are true:
- User indicates a regulated environment (`compliance: [soc2, hipaa, pci, iso27001]` in toolchain.yaml)
- User requests an audit trail (`governance.audit_trail: true`)
- A deployment target is marked as production (change-approval always applies to production)

## Configuration (captured in toolchain.yaml under `governance` section)

- **Frameworks**: which compliance frameworks to target (soc2, hipaa, pci-dss, iso27001, any)
- **Audit trail**: always/never/production-only (default: always when governance pack is active)
- **Change approval policy**: Cedar policy document path or inline policy
- **Evidence output**: where to store compliance evidence (S3, local, Confluence, any)
- **Approvers**: map of role → approver identity (fed into change-approval)

Example toolchain.yaml governance section:
```yaml
governance:
  frameworks: [soc2, hipaa]
  audit_trail: always
  change_approval:
    policy: aidlc-docs/<intent>/governance/approval-policy.cedar
    environments:
      production:
        required_approvers: 2
        roles: [lead-engineer, security-reviewer]
      staging:
        required_approvers: 1
        roles: [engineer]
  evidence_output: s3://my-compliance-bucket/aidlc-evidence/
```

## Execution Model

Unlike other packs, governance is a **cross-cutting concern**:

- `audit-trail` runs **continuously** — it logs every significant event as it happens throughout all phases
- `compliance-evidence` runs **at each phase boundary** — collecting artifacts as phases complete
- `change-approval` runs **before each deployment** to any configured environment

No sequential ordering — these skills run alongside all other skills as their triggers fire.

## Cedar Policy Approach

`change-approval` uses Cedar policies to determine who can approve what. This provides a declarative, auditable, and enforceable approval model that is not hard-coded into the skill. Policy lives in `aidlc-docs/<intent>/governance/approval-policy.cedar` and is versioned with the project.
