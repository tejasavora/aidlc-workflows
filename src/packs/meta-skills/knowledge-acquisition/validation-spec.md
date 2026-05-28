# Knowledge Acquisition — Validation Spec

## Pass Criteria

- Research file created at expected path
- Research file contains: source, date, confidence level
- Research file has actionable details (not just "see documentation")
- If MCP was queried: results are specific (API signatures, config examples)
- If human provided info: source is marked as "human-provided"

## Fail Criteria

- No research file created
- Research is generic/unhelpful ("check the docs")
- Confidence is "low" with no human acknowledgment
- Research contradicts what other skills have already generated (inconsistency)

## Validation Steps

1. Verify research file exists at `aidlc-docs/<intent>/research/<topic>.md`
2. Verify file has all required sections (Summary, Details, Pitfalls)
3. If confidence is low: verify the calling skill's output is marked with uncertainty flag
