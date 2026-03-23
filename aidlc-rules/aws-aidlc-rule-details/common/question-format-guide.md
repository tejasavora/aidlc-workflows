# Question Format Guide

## Core Rule: Never Ask Questions in Chat

Place ALL questions in dedicated question files. Never ask questions directly in chat.

## File and Question Format

- File naming: `{phase-name}-questions.md`
- Every question uses multiple choice with an `[Answer]:` tag
- "Other" is MANDATORY as the LAST option for every question
- Include only meaningful options (minimum 2 + Other, maximum 5 + Other)
- Make options mutually exclusive and cover common scenarios

```markdown
# Requirements Clarification Questions

Please answer the following questions to help clarify the requirements.

## Question 1
What is the primary user authentication method?

A) Username and password
B) Social media login (Google, Facebook)
C) Single Sign-On (SSO)
D) Multi-factor authentication
E) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 2
Is this a new project or existing codebase?

A) New project (greenfield)
B) Existing codebase (brownfield)
C) Other (please describe after [Answer]: tag below)

[Answer]:
```

Users respond by filling in a letter after `[Answer]:` (e.g., `[Answer]: C`).

## Workflow

1. Create `aidlc-docs/{phase-name}-questions.md` with all questions
2. Tell user the file is ready and to fill in `[Answer]:` tags
3. Wait for user to confirm completion
4. Read file, extract answers, validate all questions are answered

## Error Handling

- **Missing answer**: Ask user to provide answer for unanswered Question [X]
- **Invalid answer**: Ask user to use a valid letter choice for Question [X]
- **Non-letter response**: Direct user to pick a letter or choose "Other"

## Contradiction and Ambiguity Detection

After reading responses, check for contradictions (e.g., "bug fix" scope but "entire codebase affected", "low risk" but "breaking changes").

If contradictions or ambiguities found:
1. Create `{phase-name}-clarification-questions.md`
2. State which original questions conflict and why
3. Ask targeted multiple-choice questions to resolve each issue
4. Wait for clarification answers before proceeding
5. Re-validate for consistency after clarifications
