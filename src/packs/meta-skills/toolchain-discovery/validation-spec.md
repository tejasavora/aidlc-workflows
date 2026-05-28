# Toolchain Discovery — Validation Spec

## Pass Criteria

- `toolchain.yaml` exists at expected path
- Language field is set and matches project reality
- At least static_analysis, testing, and security sections are present
- All tool references are valid (tool exists, command is reasonable)
- User approved the toolchain (artefact-verification passed)

## Fail Criteria

- toolchain.yaml missing or empty
- Language detection is wrong
- Tools referenced don't exist in the project
- Required categories (testing, security) are completely empty with no justification

## Validation Steps

1. Verify file exists: `aidlc-docs/<intent>/toolchain.yaml`
2. Parse YAML: must be valid
3. Verify `language` field matches detected language(s)
4. For each tool referenced: verify config file exists OR tool is globally available
5. Verify user approval was recorded in audit trail
