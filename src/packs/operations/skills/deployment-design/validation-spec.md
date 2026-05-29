# Deployment Design — Validation Spec

## Pass Criteria

- Pipeline configuration file exists and is syntactically valid for the configured CI/CD tool
- All configured environments are represented in the pipeline
- Production environment requires explicit human approval gate
- Rollback strategy is documented for each environment
- Human approved the pipeline plan before files were written
- `aidlc-docs/<intent>/operations/deployment-design.md` exists and is complete
- `aidlc-docs/<intent>/operations/rollback-runbook.md` exists with actionable steps

## Fail Criteria

- Pipeline configuration file is missing or syntactically invalid
- Production environment has auto-approve (no human gate)
- Rollback strategy is absent or undocumented
- Human clarification was skipped when deployment config was incomplete
- Design was written without plan-verification approval

## Validation Steps

1. Verify pipeline configuration file exists in project root
2. Parse pipeline file: confirm it is valid for the tool (e.g., `act --list` for GitHub Actions, `gitlab-runner exec` for GitLab)
3. Confirm production environment has a manual approval step or gate
4. Verify `deployment-design.md` documents all environments, promotion gates, and rollback triggers
5. Verify `rollback-runbook.md` has concrete commands (not just descriptions)
6. Confirm `toolchain.yaml` is updated with finalized deployment config
