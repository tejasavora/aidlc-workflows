# Bug Triage — Validation Spec

## Pass Criteria

- Bug was reproduced before classification (reproduction test or confirmed steps)
- Root cause was traced through design documents (requirements → stories → design → code → test)
- Bug was classified with one of the four valid classifications (DESIGN_BUG, CODE_BUG, TEST_GAP, REQUIREMENT_GAP)
- Fix was applied at the correct level (design first if DESIGN_BUG)
- A regression test was added (for DESIGN_BUG and CODE_BUG)
- Reproduction test passes after fix
- Full test suite passes after fix (no regressions)
- Human approved the fix plan before code was changed
- Triage report exists at expected path

## Fail Criteria

- Code was changed before reading design documents
- Root cause was classified without tracing through the design chain
- Fix was applied to code without updating design (for DESIGN_BUG)
- No regression test was added
- Fix plan was not presented to human before execution
- Full test suite was not run after fix
- REQUIREMENT_GAP was silently "fixed" with undocumented code changes

## Validation Steps

1. Verify report exists: `aidlc-docs/<intent>/maintenance/bug-<id>-report.md`
2. Confirm report contains: reproduction steps, design trace, classification, fix plan
3. Verify reproduction test exists and passes
4. Run full test suite: confirm no regressions
5. For DESIGN_BUG: diff the design document — confirm it was updated before code
6. Confirm human approval is documented in the report (fix plan approval section)
7. Verify no REQUIREMENT_GAP was silently fixed without a story being created
