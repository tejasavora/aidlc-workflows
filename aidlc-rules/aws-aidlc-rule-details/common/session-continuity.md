# Session Continuity Templates

## Welcome Back Prompt Template

**Note**: This is an intentional exception to the file-based question rule in question-format-guide.md. The welcome-back prompt is a one-time routing question presented in chat, not a design decision requiring file-based answers. The user's response determines which stage to resume, and the AI proceeds immediately.

When a user returns to continue work on an existing AI-DLC project, present this prompt:

```markdown
**Welcome back! I can see you have an existing AI-DLC project in progress.**

Based on your aidlc-state.md, here's your current status:
- **Project**: [project-name]
- **Current Phase**: [INCEPTION/CONSTRUCTION/OPERATIONS]
- **Current Stage**: [Stage Name]
- **Last Completed**: [Last completed step]
- **Next Step**: [Next step to work on]

**What would you like to work on today?**

A) Continue where you left off ([Next step description])
B) Review a previous stage ([Show available stages])

[Answer]: 
```

## MANDATORY: Session Continuity Instructions
1. **Always read aidlc-state.md first** when detecting existing project
2. **Parse current status** from the workflow file to populate the prompt
3. **Load Artifacts Selectively** - Load only what is needed for the current stage. Do not load everything — context window is finite and overloading it degrades output quality.
   - **Always load**: aidlc-state.md, the current unit's definition from unit-of-work.md
   - **Inception stages**: Load prior inception artifacts relevant to the current stage (e.g., requirements for stories, stories for design)
   - **Construction stages**: Load the current unit's design artifacts + its assigned stories. Load inception-level artifacts (requirements, components) only when you need to reference cross-cutting decisions.
   - **Code stages**: Load the current unit's design artifacts + code generation plan. Read existing code files only when modifying them.
   - **Do NOT load**: All artifacts from all prior stages exhaustively. If you need a specific artifact, load it on demand.
4. **Context Pressure Management**:
   - If context usage is high (many units completed, deep into construction), prioritize loading the current unit's artifacts over historical inception artifacts
   - Summarize key decisions from prior stages rather than re-reading full documents
   - For later units, reference the patterns established in earlier units rather than re-reading all foundation artifacts
5. **Adapt options** based on architectural choice and current phase
6. **Show specific next steps** rather than generic descriptions
7. **Log the continuity prompt** in audit.md with timestamp
8. **Context Summary**: After loading artifacts, provide brief summary of what was loaded for user awareness
9. **Asking questions**: ALWAYS ask clarification or user feedback questions by placing them in .md files. DO NOT place the multiple-choice questions in-line in the chat session.

## Error Handling
If artifacts are missing or corrupted during session resumption, see [error-handling.md](error-handling.md) for guidance on recovery procedures. 