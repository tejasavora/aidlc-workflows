---
name: aidlc-knowledge-acquisition
description: |
  Research unfamiliar technologies via MCP servers and documentation before generating
  code or configuration. Caches research for reuse throughout the workflow. Called by
  any skill that encounters technology outside its confident knowledge.
metadata:
  phase: common
  stage: knowledge-acquisition
  per-unit: "false"
  human-clarification: "true"
  plan-creation: "false"
  plan-verification: "false"
  artefact-verification: "false"
  type: meta-skill
---

# Knowledge Acquisition

A meta-skill invoked by other skills when they encounter technology they are not confident about. This skill prevents hallucination by verifying APIs, configurations, and patterns against current documentation before generating code.

## When to Invoke

Any skill should invoke knowledge-acquisition when:
- Working with a service released/updated in the last 12 months
- Generating configuration for a tool not in the project's existing codebase
- Encountering an API where parameter names/types are uncertain
- The toolchain.yaml references a tool the skill has not used before
- A quality gate fails with "unknown method" or "deprecated API" errors

## Execution

### Step 1: Identify Knowledge Gap

Determine what specifically is unknown:
- API method signature? (need: method name, params, return type)
- Configuration format? (need: config file structure, valid fields)
- Best practice? (need: recommended patterns, anti-patterns)
- Integration pattern? (need: how service A connects to service B)

### Step 2: Query Available MCP Servers

Check which MCP servers are available and query the most relevant:

| Knowledge Needed | MCP Server | Query Strategy |
|-----------------|------------|----------------|
| AWS service API | aws-docs | search_documentation → read_sections |
| AWS CDK construct | aws-iac | search_cdk_documentation |
| CDK code examples | aws-iac | search_cdk_samples_and_constructs |
| Framework/library API | context7 | resolve-library-id → query-docs |
| Agent SDK (Strands) | strands | search_docs → fetch_doc |
| General web documentation | brave-search | brave_web_search |

### Step 3: Extract and Validate

From the retrieved documentation:
1. Extract: exact API signatures, required parameters, return types
2. Extract: configuration examples with all required fields
3. Extract: error handling patterns and common pitfalls
4. Validate: does the documentation version match what we're deploying?

### Step 4: Cache Research

Write findings to `aidlc-docs/<intent>/research/<topic-slug>.md`:

```markdown
# Research: <Topic>

**Queried:** <date>
**Source:** <URL or MCP server + query>
**Confidence:** high|medium|low

## Summary
<1-3 sentence summary of what was learned>

## API/Configuration Details
<exact details needed by the calling skill>

## Common Pitfalls
<things to avoid, from documentation>

## Example
<working example from docs>
```

### Step 5: Return to Calling Skill

Provide the calling skill with:
- The cached research file path
- A summary of key findings
- Confidence level (high if from official docs, medium if from examples, low if inferred)

## When MCP Cannot Answer

If no MCP server has the information:

1. Ask human: "I need current documentation for [X]. Options:
   A) Provide a URL I can read via WebFetch
   B) Suggest an MCP server to add (I recommend: [specific])
   C) Paste the relevant snippet directly
   D) I'll use my best knowledge (may be outdated — I'll flag assumptions)"
2. If human provides URL → fetch and cache
3. If human provides snippet → cache as-is with "source: human-provided" tag
4. If human says "use best knowledge" → proceed but mark ALL generated code with:
   `# NOTE: Generated without verified docs. May need review.`

## Outputs

- `aidlc-docs/<intent>/research/<topic-slug>.md` (cached for entire workflow)
- Research is reusable: subsequent skills check research/ before querying MCP again
