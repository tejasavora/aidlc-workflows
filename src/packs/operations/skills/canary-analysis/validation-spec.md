# Canary Analysis — Validation Spec

## Activation Check

- If `toolchain.yaml` → `ci_cd.deploy_strategy` is NOT `canary` or `blue-green`: skill was correctly skipped (not a failure)
- If strategy is `canary` or `blue-green`: skill MUST have run after deploy and before full traffic promotion

## Pass Criteria

- Canary metrics were collected for the full `canary_analysis_duration` (or extended window if requested)
- Baseline metrics were collected over the same time window for comparison
- All configured thresholds were evaluated (error rate delta, P95 latency delta at minimum)
- Request count meets `min_requests` before a PROMOTE or ROLLBACK decision was made
- Decision (PROMOTE / ROLLBACK / INCONCLUSIVE) is explicit and supported by the metrics table
- For production: human reviewed and confirmed the decision before execution
- Report exists with full metrics comparison, decision, and execution confirmation

## Fail Criteria

- Skill was skipped when deploy strategy was `canary` or `blue-green`
- Decision was made with fewer requests than `min_requests` without documenting it as INCONCLUSIVE
- Promotion occurred without comparing canary metrics to baseline (no analysis performed)
- Threshold breach was detected but rollback was not executed (or not presented to human)
- Production promotion executed without human confirmation
- Report is missing or contains the decision without the supporting metrics table
- Analysis window was shorter than `canary_analysis_duration` without a documented reason

## Validation Steps

1. Verify activation: confirm `ci_cd.deploy_strategy` is `canary` or `blue-green` in toolchain.yaml
2. Verify report exists: `aidlc-docs/<intent>/operations/<env>/canary-analysis-report.md`
3. Confirm metrics table is present with canary value, baseline value, delta, and threshold for each metric
4. Verify request count in report meets `min_requests` (or INCONCLUSIVE is stated with justification)
5. Check decision field: PROMOTE, ROLLBACK, or INCONCLUSIVE — confirm it matches the metrics (e.g., if any delta exceeds threshold, decision must be ROLLBACK)
6. For production: verify human-confirmation section is present in the report
7. Confirm post-decision action: if PROMOTE, verify old baseline was decommissioned; if ROLLBACK, verify canary instances were terminated
