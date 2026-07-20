# Research Before Generate — AWS Platform

Before generating any infrastructure code (CDK, Terraform, CloudFormation, SAM), the AWS Platform agent MUST verify construct properties, resource attributes, and service configurations against current documentation. AWS releases new services monthly and updates existing ones weekly. Baked-in training data is insufficient.

## Mandatory Research Triggers

1. **Any CDK construct:** Verify L2/L3 construct exists, check props interface, confirm default behaviors
2. **CloudFormation resource types:** Verify resource type string, required properties, allowed values
3. **IAM policy actions:** Verify exact action names (they're case-sensitive and service-specific)
4. **Service quotas and limits:** Verify current defaults (they change without notice)
5. **Regional availability:** Verify the service is available in the target region
6. **Pricing dimensions:** Verify what's billable (requests, duration, data transfer, storage)

## Research Protocol

| Need | Tool | Query |
|------|------|-------|
| CDK construct properties | `search_cdk_documentation` | Construct class name + version |
| CDK usage patterns | `search_cdk_samples_and_constructs` | Use case description |
| CFN resource schema | `search_cloudformation_documentation` | Resource type (AWS::Service::Resource) |
| Service documentation | `read_documentation` with known URL | Direct page access |
| Service features | `search_documentation` | Service + feature name |
| Best practices | `cdk_best_practices` | Architecture pattern |

## Common Hallucination Patterns in IaC

These are the most frequently hallucinated patterns — always verify:

- **CDK construct names that don't exist:** e.g., `aws_cdk.aws_bedrock.Agent` (may not be L2 yet)
- **Props that were renamed:** e.g., `runtime` vs `runtime_family` across CDK versions
- **Defaults that changed:** e.g., S3 bucket encryption default changed to SSE-S3 in 2023
- **Resources in wrong service namespace:** e.g., `AWS::Bedrock::Agent` vs `AWS::BedrockAgent::Agent`
- **Deprecated patterns:** e.g., `lambda.Runtime.NODEJS_14_X` (EOL)
- **Region-specific resources:** e.g., not all instance types available in all regions

## Post-Generation Verification

After generating IaC, validate:
1. `cdk synth` / `terraform validate` / `cfn-lint` — does it parse?
2. Do all referenced constructs/resources exist in the installed version?
3. Are all required properties provided?
4. Are IAM actions spelled correctly?
5. Are resource limits within service quotas?
