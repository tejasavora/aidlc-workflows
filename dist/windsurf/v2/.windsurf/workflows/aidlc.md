---
name: aidlc
description: Start or resume AI-DLC V2 workflow (78 stages)
---

## Steps

1. Read AGENTS.md for the full V2 methodology (protocols + conventions)
2. If `aidlc-docs/` exists, check state.json for current position (resume)
3. Determine scope: enterprise (78 stages), feature (70), mvp (45), bugfix (10)
4. If `prework/` exists, read vision.md and technical-requirements.md
5. Bootstrap intent: clarification questions → intent directory
6. Discover toolchain: what tools for testing, linting, CI/CD
7. Compose adaptive workflow from skill catalogue
8. Execute stages: clarification → planning → execution → validation per skill
9. Run quality gates after code generation (self-healing loops)
10. One unit per session for code-generation stages
11. Park when session needs to end (save state for resume)
