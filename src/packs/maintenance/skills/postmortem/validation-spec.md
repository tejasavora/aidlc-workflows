# Postmortem — Validation Spec

## Pass Criteria

- Human clarification was collected before drafting (incident description, timeline, participants, impact)
- Timeline is reconstructed from audit-trail events and/or deploy/canary reports
- Root cause is traced to a specific technical origin (not just "deployment failed")
- Contributing factors are listed separately from the root cause
- At least one action item exists for every identified root cause
- Action items include an AI-DLC link (bug-triage, deployment-design, documentation-generation)
- "What went well" section is present (blameless format requirement)
- Human reviewed and approved the postmortem before sharing
- Postmortem document exists at expected path

## Fail Criteria

- Postmortem was drafted without human clarification (incident details not confirmed)
- Timeline is absent or contains no timestamped events
- Root cause is stated as "human error" without a systems-level explanation (violates blameless format)
- Action items have no AI-DLC linkage
- Postmortem was shared without human review and approval
- Document not created at `aidlc-docs/<intent>/maintenance/postmortem-<date>-<slug>.md`

## Validation Steps

1. Verify report exists: `aidlc-docs/<intent>/maintenance/postmortem-<date>-<slug>.md`
2. Confirm human-clarification section is present with incident description and timeline
3. Verify timeline table contains at least 3 timestamped entries sourced from artefacts
4. Check root cause section: must include a causal chain (5-Whys or equivalent), not just a symptom
5. Verify each contributing factor has at least one corresponding action item
6. For each action item: confirm AI-DLC link is specified (skill name or workflow reference)
7. Confirm "what went well" section is present
8. Verify human approval is documented (approval section or audit-trail HUMAN_APPROVED event)
