#!/bin/bash
# Запуск моста Claude for Figma by Dubrovskiy для этого репозитория (вызывается из .mcp.json).
# Облачная сессия (CLAUDE_CODE_REMOTE=true) → ретранслятор из relay-url (или SIGMA_RELAY_URL);
# сессия на компьютере → локальный порт 3055, к нему подключён плагин (блок «Компьютер»).
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && [ -z "${SIGMA_RELAY_URL:-}" ] && [ -f "$DIR/relay-url" ]; then
  SIGMA_RELAY_URL="$(tr -d ' \r\n' < "$DIR/relay-url")"
  export SIGMA_RELAY_URL
fi
if ! command -v node >/dev/null 2>&1; then
  echo "[claude-figma] нужен Node.js 18+ (https://nodejs.org)" >&2
  exit 1
fi
exec node "$DIR/bridge.js"
