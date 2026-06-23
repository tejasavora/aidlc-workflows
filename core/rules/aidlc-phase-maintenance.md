# Maintenance Phase Guardrails

These rules apply to every stage whose `phase: maintenance` declaration
imports them as the matching phase rule.

## Design-First Principle

- Never fix code without first checking whether the design accounts for the case
- Trace every bug through the traceability chain: requirement → story → design → code → test
- If the design is wrong, fix the design first, then cascade to code and tests
- Symptom fixes without root cause analysis create recurring defects

## Change Safety

- Every maintenance change must have a regression test that reproduces the original issue
- Dependency updates must pass the full existing test suite before merging
- Tech debt remediation must not change observable behavior unless explicitly approved
- Prefer incremental improvements over large-batch rewrites

## Evidence-Based Decisions

- Bug severity classification must cite observable impact (user-facing, data corruption, security)
- Dependency updates must cite CVE IDs or staleness metrics, not just "newer is better"
- Tech debt prioritization must quantify developer friction or risk, not just subjective preference

## Blameless Culture

- Postmortems focus on systemic causes and process improvements, never individual fault
- Action items link to specific AI-DLC stages for implementation (not vague "be more careful")
- Contributing factors are described as system properties, not personal failings

## Corrections
