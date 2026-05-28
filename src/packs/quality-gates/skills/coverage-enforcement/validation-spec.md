# Coverage Enforcement — Validation Spec

## Pass Criteria

- Coverage tool ran successfully
- Line coverage >= configured threshold (or human-approved exception)
- Branch coverage >= configured threshold (or human-approved exception)
- Generated tests all pass
- Generated tests are meaningful (not trivially passing stubs)
- Report file exists with coverage percentages

## Fail Criteria

- Coverage tool failed to run
- Coverage below threshold with no remediation or exception
- Generated tests fail (broken test generation)
- Generated tests are trivial (assert True, no assertions)

## Validation Steps

1. Run coverage tool: verify exit code and output
2. Parse coverage data: extract line% and branch%
3. Compare against thresholds from toolchain.yaml
4. If below: verify remediation was attempted (report shows attempt count)
5. If still below after max attempts: verify escalation report exists
6. Spot-check generated tests: at least 1 assertion per test, tests target uncovered code
