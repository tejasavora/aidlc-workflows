#!/usr/bin/env bash
# src/claude/build.sh — Build the Claude Code distribution from src/.
#
# Output: dist/claude/  (Claude Code project structure)
#
# Sources:
#   src/kiro/aidlc-common/       → dist/claude/.aidlc/aidlc-common/
#   src/skills/                  → dist/claude/.aidlc/skills/
#   src/packs/                   → dist/claude/.aidlc/packs/
#   src/claude/CLAUDE.md.template → dist/claude/CLAUDE.md
#   src/claude/commands/         → dist/claude/.claude/commands/
#   src/claude/agents/           → dist/claude/.claude/agents/
#   src/claude/hooks/            → dist/claude/.claude/settings.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SRC="$ROOT/src"
OUT="$ROOT/dist/claude"

echo "Building dist/claude/ ..."

# Wipe and recreate the output directory.
rm -rf "$OUT"
mkdir -p "$OUT/.aidlc" "$OUT/.claude/commands" "$OUT/.claude/agents"

# 1. Copy shared framework content.
cp -R "$SRC/kiro/aidlc-common" "$OUT/.aidlc/aidlc-common"
cp -R "$SRC/skills"            "$OUT/.aidlc/skills"

# 2. Copy extension packs (if they exist).
if [ -d "$SRC/packs" ]; then
  cp -R "$SRC/packs" "$OUT/.aidlc/packs"
fi

# 3. Place CLAUDE.md entry point at project root.
cp "$SCRIPT_DIR/CLAUDE.md.template" "$OUT/CLAUDE.md"

# 4. Place Claude Code slash commands.
if [ -d "$SCRIPT_DIR/commands" ] && ls "$SCRIPT_DIR/commands/"*.md >/dev/null 2>&1; then
  cp "$SCRIPT_DIR/commands/"*.md "$OUT/.claude/commands/"
fi

# 5. Place Claude Code agent definitions.
if [ -d "$SCRIPT_DIR/agents" ] && ls "$SCRIPT_DIR/agents/"*.md >/dev/null 2>&1; then
  cp "$SCRIPT_DIR/agents/"*.md "$OUT/.claude/agents/"
fi

# 6. Generate .claude/settings.json from hooks template.
if [ -f "$SCRIPT_DIR/hooks/settings-hooks.json" ]; then
  cp "$SCRIPT_DIR/hooks/settings-hooks.json" "$OUT/.claude/settings.json"
fi

# 7. Validate the output.
echo "Validating ..."

# 7a. Every JSON file must parse.
while IFS= read -r json; do
  if ! node -e "JSON.parse(require('fs').readFileSync('$json','utf8'))" >/dev/null 2>&1; then
    echo "  FAIL: invalid JSON: $json" >&2
    exit 1
  fi
done < <(find "$OUT" -name '*.json' -type f)

# 7b. Every SKILL.md must have frontmatter with name.
missing=0
while IFS= read -r skill; do
  fields="name"
  case "$skill" in
    */aidlc-orchestrator/SKILL.md) ;;
    *) fields="name" ;;
  esac
  for field in $fields; do
    if ! grep -qE "^\\s*${field}:" "$skill"; then
      echo "  FAIL: $skill missing frontmatter field '$field'" >&2
      missing=$((missing+1))
    fi
  done
done < <(find "$OUT/.aidlc" -name 'SKILL.md' -type f)
[ "$missing" -eq 0 ] || exit 1

# 7c. Process-checker script must syntax-check.
if [ -f "$OUT/.aidlc/aidlc-common/scripts/aidlc-process-checker.js" ]; then
  node --check "$OUT/.aidlc/aidlc-common/scripts/aidlc-process-checker.js"
fi

# 7d. All YAML files must be valid (if yq is available).
if command -v yq >/dev/null 2>&1; then
  while IFS= read -r yaml; do
    if ! yq '.' "$yaml" >/dev/null 2>&1; then
      echo "  FAIL: invalid YAML: $yaml" >&2
      exit 1
    fi
  done < <(find "$OUT" -name '*.yaml' -o -name '*.yml' -type f)
fi

echo "  → dist/claude/  (copy to your project root)"
