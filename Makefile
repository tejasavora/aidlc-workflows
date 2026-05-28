.PHONY: all clean build-kiro build-claude

DIST := dist

all: build-kiro build-claude

clean:
	rm -rf $(DIST)

build-kiro:
	@bash src/kiro/build.sh

build-claude:
	@bash src/claude/build.sh
