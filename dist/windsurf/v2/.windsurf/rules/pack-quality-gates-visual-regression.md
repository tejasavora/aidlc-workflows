---
trigger: model_decision
description: "AI-DLC V2 quality-gates: visual-regression"
---


# Visual Regression Testing

Catch unintended visual changes by comparing screenshots of key UI pages and components against a known-good baseline. Complements functional E2E tests — a test can pass while layout, spacing, or colour are broken.

## Activation Condition

Activates when BOTH conditions are true:
1. The project has a frontend (detected by: `package.json` with a UI framework, or `toolchain.yaml` → `quality.testing.e2e_framework` is set)
2. `toolchain.yaml` → `quality.testing.visual_regression` section is configured with at least `tool` and `baseline_dir`

## Figma as Source of Truth (optional)

When Figma wireframes were approved during inception (`figma_url` exists in `wireframe-guidance.md`):
- Use `get_screenshot` (Figma MCP) to capture the APPROVED design as baseline
- Compare deployed screenshots against the Figma design (not just previous deployment)
- This catches drift between "what was designed" and "what was built" — not just "what changed since last deploy"
- If both Figma baseline and deployment baseline exist, report both comparisons:
  1. vs Figma (design fidelity)
  2. vs previous deploy (regression detection)

If either condition is false, this skill is silently skipped.

## Inputs

- `aidlc-docs/<intent>/toolchain.yaml` → `quality.testing.visual_regression`:
  ```yaml
  visual_regression:
    tool: backstop            # percy | chromatic | backstop | playwright-pixelmatch | custom
    baseline_dir: .vr-baseline  # directory containing approved baseline screenshots
    pages:                    # pages/components to capture
      - name: home
        url: /
      - name: checkout
        url: /checkout
      - name: product-card
        component: ProductCard  # component name (for Chromatic/Storybook)
    threshold: 0.01           # max allowed pixel diff ratio (0.01 = 1%)
    viewport:
      width: 1280
      height: 800
    mobile_viewport:          # optional: also capture at mobile size
      width: 375
      height: 812
  ```
- Baseline screenshots in `baseline_dir` (or cloud baseline for Percy/Chromatic)
- Running application or Storybook instance

## Execution

### Step 1: Verify Application Is Running

Before capturing screenshots, confirm the application (or Storybook) is running and reachable:
- For full-page screenshots: `curl -s -o /dev/null -w "%{http_code}" <base_url>` → expect 200
- For Storybook/component tools: verify Storybook server is running on configured port

If the application is not running → start it per `toolchain.yaml` → `ci_cd.local_env`, or escalate if it cannot be started automatically.

### Step 2: Capture Current Screenshots

Run the configured tool against each page/component in the `pages` list:

**BackstopJS:**
```bash
backstop test --config backstop.json
# generates screenshots in backstop_data/bitmaps_test/
```

**Playwright + pixelmatch:**
```bash
npx playwright test --config vr.config.ts
# uses snapshots directory for comparison
```

**Percy:**
```bash
npx percy exec -- npx playwright test
# uploads to Percy cloud and returns diff URLs
```

**Chromatic:**
```bash
npx chromatic --project-token=$CHROMATIC_PROJECT_TOKEN --exit-zero-on-changes
# uploads Storybook stories to Chromatic cloud
```

**Custom:** read `visual_regression.command` from toolchain.yaml and execute it.

If the tool is unfamiliar → invoke `knowledge-acquisition` meta-skill.

### Step 3: Compare Against Baseline

For each page/component:
- Compare current screenshot against baseline
- Calculate pixel diff ratio: `changed_pixels / total_pixels`
- Flag as FAIL if diff ratio exceeds `threshold`
- Flag as PASS if diff ratio is at or below `threshold`

For cloud tools (Percy, Chromatic): retrieve diff results from the cloud API or CLI output.

For local tools: use pixelmatch or the tool's built-in diff engine.

### Step 4: Produce Visual Regression Report

Generate the report with diff evidence:

```markdown
## Visual Regression Report

**Date:** 2024-01-15T16:22:00Z
**Tool:** BackstopJS 6.3.x
**Viewport:** 1280×800 (also 375×812 mobile)
**Threshold:** 1.0%
**Result:** FAIL — 2 of 5 pages exceed threshold

### Results

| Page | Desktop Diff | Mobile Diff | Status |
|---|---|---|---|
| home | 0.0% | 0.1% | PASS |
| checkout | 4.3% | 8.7% | FAIL |
| product-card | 0.8% | 0.9% | PASS |
| profile | 0.0% | 0.0% | PASS |
| cart | 12.1% | — | FAIL |

### Failing Pages

#### checkout — 4.3% desktop, 8.7% mobile [FAIL]

- **Desktop diff:** `.vr-diffs/checkout-desktop-diff.png`
- **Current:** `.vr-current/checkout-desktop.png`
- **Baseline:** `.vr-baseline/checkout-desktop.png`
- **Observation:** Button alignment shifted ~4px right; background colour changed from #F5F5F5 to #FAFAFA

#### cart — 12.1% desktop [FAIL]

- **Desktop diff:** `.vr-diffs/cart-desktop-diff.png`
- **Observation:** Product image placeholder replaced by broken image icon (likely missing test data)

### Decision Required

For each failing page, decide:
- **APPROVE**: accept as new baseline (intentional design change)
- **REJECT**: this is an unintended regression — fix CSS/layout before proceeding

checkout: ___
cart: ___
```

### Step 5: Human Decision

Present the report. The human must decide for each failing page:

- **APPROVE NEW BASELINE**: the visual change is intentional (e.g., design update). Update the baseline screenshots for the approved pages. Construction continues.
- **REJECT — FIX REQUIRED**: the visual change is unintended. Construction is blocked for the affected pages until the CSS/layout regression is fixed.

If all pages PASS (within threshold): construction proceeds automatically without human intervention for this skill.

## Outputs

- `aidlc-docs/<intent>/quality/visual-regression-report.md`
  - Results table with diff percentages per page/viewport
  - Links to diff images, current screenshots, baseline screenshots
  - Human decision documented per failing page

## Human Review Gate

`artefact-verification: "true"` — Visual diffs require human judgment. Automated thresholds catch significant changes but only a human can determine whether a visual change is intentional. Even a 0.5% diff could represent a broken font load or a correct design update.

## No Retry Loop

`max-attempts: 1` — Visual regression runs once per construction cycle. If pages fail, the human either approves the new baseline or blocks until the regression is fixed. The skill does not attempt to auto-fix CSS.
