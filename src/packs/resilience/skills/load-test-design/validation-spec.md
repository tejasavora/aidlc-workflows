# Load Test Design — Validation Spec

## Pass Criteria

- Test script exists and is executable by the configured tool
- Test scenarios map to actual user stories (not synthetic)
- All 5 test stages are defined (baseline, ramp, peak, spike, soak) or deviation is documented
- NFR targets are encoded as thresholds in the script (not just in the plan doc)
- Human approved the test plan before scripts were generated
- Load test design document exists at expected path

## Fail Criteria

- Test script does not execute (syntax error, missing dependencies)
- NFR targets from nfr-requirements.md were not encoded in script thresholds
- Scenarios are generic (health-check only) instead of user-journey based
- Human clarification was skipped when NFR targets were absent
- Script uses hardcoded production URLs without human approval

## Validation Steps

1. Verify test script exists: `tests/load/<tool>-load-test.<ext>`
2. Dry-run the script with 1 virtual user for 10 seconds: confirm it executes without error
3. Read script and verify NFR thresholds match values in `nfr-requirements.md`
4. Verify `aidlc-docs/<intent>/operations/load-test-design.md` lists all scenarios with story references
5. Confirm script targets staging (not production) unless explicitly approved
6. Verify scenarios include realistic think time (not hammering with zero delay)
