# Toolchain Schema

`toolchain.yaml` is the single source of truth for all tool configuration in an AI-DLC intent. Every pack skill reads from this file to determine which tool to invoke. No skill hardcodes tool commands — all commands come from toolchain.yaml or the language-specific tool adapter.

## When toolchain.yaml is populated

| Classification | Populated by | Timing |
|---------------|-------------|--------|
| Brownfield | `toolchain-discovery` meta-skill (auto-detects config files) | During `intent-bootstrap` |
| Mixed | `toolchain-discovery` meta-skill (detects existing tools, asks about gaps) | During `intent-bootstrap` |
| Greenfield | `requirements-analysis` skill (asks user to choose tools) | During inception phase |

For greenfield, `intent-bootstrap` creates a stub `toolchain.yaml` with only `language:` set. The remaining sections are populated during `requirements-analysis`.

## Full Schema

```yaml
# toolchain.yaml
# Path: aidlc-docs/<intent>/toolchain.yaml

language: string                    # primary language: python, typescript, java, go, rust, csharp, etc.
languages: [string]                 # all languages if multi-language project (including language above)

quality:
  static_analysis:
    tool: string                    # tool name: ruff, eslint, golangci-lint, checkstyle, pylint, etc.
    run_command: string             # command to execute (use {source_dir} as placeholder for source path)
    fix_command: string             # auto-fix command (null if not supported)
    config_file: string             # path to tool config file relative to repo root (null if not used)
    output_format: string           # json, text, sarif, checkstyle
    severity_mapping: {}            # map tool's severity labels to: error, warning, info

  security:
    sast:
      - tool: string                # SAST tool name: bandit, semgrep, spotbugs, gosec, etc.
        run_command: string         # command to execute
        severity_mapping: {}        # map tool's severity labels to: critical, high, medium, low
    sca:
      tool: string                  # SCA tool: pip-audit, npm-audit, owasp-dependency-check, trivy, etc.
      run_command: string           # command to execute
      fix_command: string           # command to auto-fix (upgrade deps), or null
    secrets:
      tool: string                  # secrets scanner: detect-secrets, trufflehog, gitleaks, etc.
      run_command: string           # command to execute
      baseline: string              # path to baseline/allowlist file (null if not used)

  testing:
    framework: string               # test framework: pytest, jest, junit, go-test, rspec, etc.
    unit_dir: string                # path to unit test directory relative to repo root
    integration_dir: string         # path to integration test directory (null if not separate)
    e2e_dir: string                 # path to e2e test directory (null if not present)
    unit_command: string            # command to run unit tests
    integration_command: string     # command to run integration tests (null if not separate)
    coverage_tool: string           # coverage tool: pytest-cov, istanbul, jacoco, go-cover, etc.
    coverage_command: string        # command to run tests with coverage collection
    coverage_output: string         # path to coverage report output file
    coverage_threshold_line: number # minimum line coverage % (default: 80)
    coverage_threshold_branch: number # minimum branch coverage % (default: 70)

  review:
    standards: [string]             # list of coding standards to enforce during code-review skill
                                    # examples: type-hints-required, docstrings-public-only, no-wildcard-imports

  max_remediation_attempts: number  # max auto-fix loop iterations before escalating to human (default: 3)

ci_cd:
  platform: string                  # CI/CD platform: github-actions, gitlab-ci, codepipeline, jenkins, argocd, etc.
  environments: [string]            # ordered environment names, e.g.: [dev, staging, prod]
  deploy_strategy: string           # deployment strategy: blue-green, canary, rolling, all-at-once
  artifact_registry: string         # container/package registry: ecr, ghcr, dockerhub, artifactory, etc.

monitoring:
  metrics: string                   # metrics platform: cloudwatch, datadog, prometheus, grafana, new-relic, etc.
  logging: string                   # logging platform: cloudwatch-logs, elk, splunk, loki, etc.
  tracing: string                   # tracing platform: x-ray, jaeger, zipkin, honeycomb, etc.
  alerting: string                  # alerting platform: pagerduty, opsgenie, cloudwatch-alarms, victorops, etc.

infrastructure:
  iac: string                       # IaC tool: cdk, terraform, pulumi, cloudformation, helm, bicep, etc.
  cloud_provider: string            # cloud provider: aws, azure, gcp, multi-cloud
  container_runtime: string         # container runtime: docker, podman, containerd (null if not containerized)
  container_registry: string        # where images are pushed: ecr, ghcr, dockerhub, gcr, acr, etc.

project_management:
  tasks: string                     # task tracker: jira, linear, asana, github-issues, trello, etc.
  docs: string                      # docs platform: confluence, notion, gitbook, github-wiki, etc.
  chat: string                      # team chat: slack, teams, discord, etc.

data:
  primary_db: string                # primary database: aurora-postgres, rds-postgres, dynamodb, mongodb, etc.
  cache: string                     # cache layer: elasticache-redis, elasticache-memcached, redis, etc.
  search: string                    # search engine: opensearch, elasticsearch, typesense, etc.
  migrations: string                # migration tool: alembic, flyway, prisma, knex, liquibase, etc.
  message_queue: string             # queue/stream: sqs, kafka, rabbitmq, kinesis, pubsub, etc.

compliance:
  frameworks: [string]              # compliance frameworks: soc2, hipaa, pci-dss, iso27001, gdpr, etc.
  license_policy:
    allowed: [string]               # approved open source licenses: mit, apache-2.0, bsd-2-clause, bsd-3-clause, isc
    prohibited: [string]            # prohibited licenses: gpl-2.0, gpl-3.0, agpl-3.0, lgpl (add as needed)

well_architected:                   # populated by well-architected pack (if active)
  enabled: boolean
  availability_target: string       # SLA target: "99.9%", "99.95%", "99.99%", etc.
  rto_minutes: number               # recovery time objective in minutes
  rpo_minutes: number               # recovery point objective in minutes
  monthly_budget_usd: number        # target monthly cloud spend in USD
  cloud_provider: string            # cloud provider context for pricing (aws, azure, gcp)
  sustainability:
    enabled: boolean                # whether sustainability-check skill is active

resilience:                         # populated by resilience pack (if active)
  load_test_tool: string            # load test tool: k6, locust, gatling, artillery, jmeter, wrk, etc.
  chaos_tool: string                # chaos tool: aws-fis, litmus, gremlin, or null
  target_environment: string        # environment to run tests against: staging, prod (requires approval)
  nfr_targets:
    p99_latency_ms: number          # p99 latency threshold in milliseconds
    throughput_rps: number          # target requests per second at peak
    error_rate_budget: number       # acceptable error rate fraction (e.g., 0.001 = 0.1%)
  load_test_duration:
    baseline: string                # e.g., "5m"
    ramp: string                    # e.g., "10m"
    peak: string                    # e.g., "15m"
    spike: string                   # e.g., "5m"
    soak: string                    # e.g., "30m"
  run_chaos: boolean
  run_dr_validation: boolean
```

## Guidance Notes

### Null values

Use `null` (not empty string) for fields that are not applicable. Tool adapter defaults apply when a field is null.

### Placeholders in commands

Use `{source_dir}`, `{unit_dir}`, `{integration_dir}`, `{e2e_dir}` as placeholders in command strings. The skill runner substitutes actual paths at execution time from other toolchain fields.

### Language-specific defaults

If `quality.static_analysis`, `quality.security`, or `quality.testing` fields are null, skills fall back to the language-specific tool adapter in `packs/quality-gates/tool-adapters/<language>.yaml`. Toolchain.yaml overrides take precedence over adapter defaults.

### Multi-language projects

For multi-language projects, `language` is the primary language (the one with the most code or the entry point). `languages` lists all languages. Quality gate skills run once per language listed and aggregate results.

### Stub vs. complete

A stub toolchain.yaml (greenfield intent-bootstrap output) has only `language:` set. All other fields are null. During `requirements-analysis`, the skill asks the user to choose tools for each null category. After requirements-analysis, the file should be complete (or have an explicit null with justification for truly optional categories).
