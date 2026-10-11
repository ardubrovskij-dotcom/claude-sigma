#!/bin/bash
# Claude for Figma by Dubrovskiy — подключение к любому репозиторию одной командой.
# Запуск из папки репозитория (на компьютере или в облачной сессии Claude Code):
#
#   curl -fsSL https://raw.githubusercontent.com/ardubrovskij-dotcom/claude-sigma/claude/modest-brahmagupta-flhzty/install.sh | bash -s -- 'wss://<ретранслятор>/ws/<токен>'
#
# Адрес комнаты (со стартовой страницы вашего ретранслятора) нужен для облачных сессий;
# без него работает только локально. Повторный запуск обновляет комплект.
#
# Кладёт в репозиторий: .mcp.json (сервер claude-figma), .claude/figma/ (мост), .claude/skills/project-to-figma/,
# и разрешает сервер в .claude/settings.json. Существующие настройки репозитория сохраняются.

set -euo pipefail
REPO="${CLAUDE_FIGMA_REPO:-https://github.com/ardubrovskij-dotcom/claude-sigma.git}"
REF="${CLAUDE_FIGMA_REF:-claude/modest-brahmagupta-flhzty}"
RELAY="${1:-}"
say() { echo "[claude-figma] $*"; }
die() { echo "[claude-figma] ОШИБКА: $*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || die "нужен Node.js 18+ (https://nodejs.org)"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

if [ -n "$RELAY" ] && ! printf '%s' "$RELAY" | grep -Eq '^wss?://[^/]+/ws/[A-Za-z0-9_-]{24,128}$'; then
  die "адрес комнаты должен выглядеть так: wss://<ретранслятор>/ws/<токен> (строка со стартовой страницы ретранслятора)"
fi

# 1. Комплект: из локальной копии (CLAUDE_FIGMA_KIT) или с GitHub
if [ -n "${CLAUDE_FIGMA_KIT:-}" ]; then
  KIT="$CLAUDE_FIGMA_KIT"
else
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  git clone -q --depth 1 --branch "$REF" "$REPO" "$TMP/src" || die "не удалось скачать $REPO ($REF)"
  KIT="$TMP/src/kit"
fi
[ -f "$KIT/.claude/figma/bridge.js" ] || die "в комплекте нет .claude/figma/bridge.js"

# 2. Файлы (relay-url из прошлой установки сохраняем, если новый не передан)
KEEP=""
[ -f .claude/figma/relay-url ] && KEEP="$(cat .claude/figma/relay-url)"
mkdir -p .claude/skills
rm -rf .claude/figma .claude/skills/project-to-figma
cp -R "$KIT/.claude/figma" .claude/figma
cp -R "$KIT/.claude/skills/project-to-figma" .claude/skills/project-to-figma
chmod +x .claude/figma/start.sh
if [ -n "$RELAY" ]; then
  printf '%s\n' "$RELAY" > .claude/figma/relay-url
elif [ -n "$KEEP" ]; then
  printf '%s\n' "$KEEP" > .claude/figma/relay-url
fi

# 3. .mcp.json и .claude/settings.json — дополняем, не затирая чужое
node - <<'JS'
const fs = require("fs");
function edit(file, fn) {
  let data = {};
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, "utf8")); }
    catch (e) { console.error(`[claude-figma] ОШИБКА: ${file} — не JSON, исправьте вручную`); process.exit(1); }
  }
  fn(data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}
edit(".mcp.json", (d) => {
  d.mcpServers = d.mcpServers || {};
  d.mcpServers["claude-figma"] = { command: "bash", args: [".claude/figma/start.sh"] };
});
edit(".claude/settings.json", (d) => {
  const list = new Set(d.enabledMcpjsonServers || []);
  list.add("claude-figma");
  d.enabledMcpjsonServers = [...list];
});
JS

say "установлено в $ROOT:"
say "  .mcp.json → сервер claude-figma"
say "  .claude/figma/ → мост; .claude/skills/project-to-figma/ → навык; .claude/settings.json → сервер разрешён"
if [ -f .claude/figma/relay-url ]; then
  say "  облако: .claude/figma/relay-url задан — это секрет, не публикуйте его в открытом репозитории"
else
  say "  облако: адрес ретранслятора не задан — работает только на компьютере (или задайте SIGMA_RELAY_URL в окружении)"
fi
say "Дальше: закоммитить и запушить, затем открыть НОВУЮ сессию и написать «Проверь подключение к Figma»:"
say "  git add .mcp.json .claude && git commit -m 'Add Claude for Figma' && git push"
