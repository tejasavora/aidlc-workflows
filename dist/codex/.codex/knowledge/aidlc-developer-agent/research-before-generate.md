# Research Before Generate

Before generating code for any technology, framework, or service, the developer agent MUST verify its knowledge is current. LLMs hallucinate API signatures, invent non-existent methods, and reference deprecated patterns. This is not optional caution — research shows ChatGPT hallucinates non-existent packages in 20-35% of coding answers.

## When to Research

Research via MCP BEFORE generating code when ANY of these conditions are true:

1. The service/library was released or had a major version within the last 18 months
2. You are not 100% certain of the exact method signature, parameter names, or return types
3. The project's `package.json`, `requirements.txt`, or equivalent pins a specific version you haven't seen
4. You are generating configuration (YAML, JSON, HCL) for a tool — config formats change between versions
5. You are generating IaC (CDK constructs, Terraform resources, CloudFormation) — APIs evolve
6. A quality gate or sensor previously flagged "unknown method" or "deprecated API" in this workflow

## How to Research

Query available MCP servers in this priority order:

| What You Need | MCP Server | Strategy |
|--------------|------------|----------|
| AWS service API | aws-docs | `search_documentation` → `read_sections` for the specific API |
| AWS CDK construct | aws-iac | `search_cdk_documentation` for construct properties |
| CDK code examples | aws-iac | `search_cdk_samples_and_constructs` |
| Framework/library API | context7 | `resolve-library-id` → `query-docs` with specific method name |
| CloudFormation resource | aws-iac | `search_cloudformation_documentation` |

## What to Verify

For each technology being generated:
- **Method signatures:** exact parameter names, types, required vs optional
- **Import paths:** correct package name and sub-module path
- **Configuration keys:** valid field names for the version in use
- **Default values:** what the framework provides vs what must be explicit
- **Breaking changes:** if upgrading from a prior version, what changed

## Anti-Pattern: Generate Then Fix

Do NOT generate code speculatively and rely on the self-healing loop to fix errors. The self-healing loop is for edge cases and integration issues, not for "I guessed wrong about the API." Research is cheaper than a fix cycle.

## Caching

If you've already researched a technology earlier in this workflow (verified in a prior stage), you do not need to re-research it unless:
- You're using a different method/construct from that same library
- A quality gate flagged an issue with code that used that library
