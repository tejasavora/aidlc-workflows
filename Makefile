.PHONY: all clean build-kiro build-claude test-build

DIST := dist

all: build-kiro build-claude

clean:
	rm -rf $(DIST)

build-kiro:
	@bash src/kiro/build.sh

build-claude:
	@bash src/claude/build.sh

test-build: clean all
	@echo "Verifying build outputs..."
	@test -d dist/kiro/.kiro/skills && echo "  ✓ Kiro: skills present"
	@test -d dist/kiro/.kiro/packs && echo "  ✓ Kiro: packs present"
	@test -f dist/claude/CLAUDE.md && echo "  ✓ Claude: CLAUDE.md present"
	@test -d dist/claude/.aidlc/skills && echo "  ✓ Claude: skills present"
	@test -d dist/claude/.aidlc/packs && echo "  ✓ Claude: packs present"
	@test -f dist/claude/.claude/commands/aidlc.md && echo "  ✓ Claude: /aidlc command present"
	@test -f dist/claude/.claude/agents/aidlc-builder.md && echo "  ✓ Claude: builder agent present"
	@KIRO_COUNT=$$(find dist/kiro -type f | wc -l | tr -d ' '); \
	CLAUDE_COUNT=$$(find dist/claude -type f | wc -l | tr -d ' '); \
	echo "  Kiro: $$KIRO_COUNT files | Claude: $$CLAUDE_COUNT files"; \
	test $$CLAUDE_COUNT -ge 100 || (echo "  FAIL: Claude build has fewer than 100 files" && exit 1); \
	echo "  ✓ All checks passed"
