# Visual Regression — Validation Spec

## Activation Check

- If no frontend is present OR `quality.testing.visual_regression` is absent: skill was correctly skipped (not a failure)
- If frontend exists AND `visual_regression` is configured: skill MUST have run during construction

## Pass Criteria

- Application or Storybook was confirmed running before screenshots were captured
- Screenshots captured for all pages/components listed in `toolchain.yaml` → `visual_regression.pages`
- Diff ratio calculated for each page against the baseline
- Pages with diff exceeding `threshold` are flagged as FAIL in the report
- Human reviewed and made a decision (APPROVE / REJECT) for each failing page
- Report exists at expected path with diff images referenced

## Fail Criteria

- Skill was skipped when frontend and `visual_regression` configuration are both present
- Screenshots were taken but baseline does not exist (first run should establish baseline, not fail silently)
- Failing pages were not presented to human (auto-approved without review)
- Diff images are missing or not referenced in the report
- Threshold was not applied (all pages marked PASS regardless of diff ratio)
- No decision was recorded for failing pages

## Validation Steps

1. Verify activation: confirm `toolchain.yaml` → `quality.testing.visual_regression` is configured
2. Verify report exists: `aidlc-docs/<intent>/quality/visual-regression-report.md`
3. Confirm results table contains one row per configured page with diff percentages
4. For each page with diff > threshold: verify FAIL status and diff image path is present
5. Confirm human-decision section is present for each failing page (APPROVE or REJECT)
6. If any page was REJECTED: verify construction was blocked until fix was applied or decision revised
7. Verify no CSS or source code was auto-modified by this skill
