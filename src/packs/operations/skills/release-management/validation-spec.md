# Release Management — Validation Spec

## Pass Criteria

- Version was determined using configured release strategy (not guessed)
- Human approved the version before tagging
- `CHANGELOG.md` exists and contains the new version section
- Git tag `v<version>` exists on the remote
- Version manifest (package.json, pyproject.toml, etc.) reflects new version
- Release summary exists at `aidlc-docs/<intent>/operations/release-<version>.md`

## Fail Criteria

- Version was incremented without human approval
- Git tag was not pushed to remote
- `CHANGELOG.md` was not updated (or new version section is missing)
- Version manifest still shows old version
- Release was created without changelog (empty or placeholder release notes)

## Validation Steps

1. Verify `CHANGELOG.md` contains a section for the new version with at minimum 1 entry
2. Run `git tag --list` and confirm the new version tag exists
3. Run `git ls-remote --tags origin` and confirm tag is on remote
4. Check project manifest file: version field matches new version
5. Verify `aidlc-docs/<intent>/operations/release-<version>.md` exists
6. If GitHub/GitLab release is configured: verify release exists via API
