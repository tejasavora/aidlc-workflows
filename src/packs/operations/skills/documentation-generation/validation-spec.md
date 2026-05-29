# Documentation Generation — Validation Spec

## Pass Criteria

- API documentation file exists and is parseable (valid OpenAPI/AsyncAPI YAML or JSON)
- At least one ADR exists per major architectural decision made during construction
- `README.md` was updated (installation, configuration, or API reference sections)
- Docs were published to the configured destination (or confirmed local-only)
- Documentation report exists at expected path
- Spot-check: at least 3 API endpoints verified to match implementation

## Fail Criteria

- API documentation was not generated (no openapi.yaml or equivalent)
- API spec does not match actual routes (wrong paths, wrong response shapes)
- No ADRs generated despite significant design decisions existing in aidlc-docs
- README was not updated or was fully replaced instead of updated
- Docs publication failed without documentation of failure

## Validation Steps

1. Verify `docs/api/openapi.yaml` (or equivalent) exists and is valid YAML/JSON
2. Parse the API spec: spot-check 3 endpoints against source code routes for accuracy
3. Verify at least 1 ADR exists in `docs/adr/` with status, context, decision, consequences
4. Diff `README.md` against previous version: confirm relevant sections were updated, not removed
5. Verify `aidlc-docs/<intent>/operations/documentation-report.md` lists all generated artifacts
6. If docs_output is not local: verify publication succeeded (HTTP check or S3 ls)
