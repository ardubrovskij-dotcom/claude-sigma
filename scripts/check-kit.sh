#!/bin/bash
# Проверяет, что kit/ собран из текущих исходников (иначе: scripts/build-kit.sh).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cmp -s "$ROOT/kit/.claude/figma/bridge.js" "$ROOT/bridge/mcpb/server/index.js" || { echo "kit устарел: bridge.js"; exit 1; }
diff -rq "$ROOT/kit/.claude/skills/project-to-figma" "$ROOT/skills/project-to-figma" >/dev/null || { echo "kit устарел: навык"; exit 1; }
echo "KIT UP TO DATE"
