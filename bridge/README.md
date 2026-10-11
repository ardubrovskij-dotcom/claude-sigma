# Claude Sigma Bridge

MCP-сервер, через который Claude (Claude Desktop или Claude Code) управляет плагином Claude Sigma в Figma.

```
Claude ──MCP (stdio)──► мост ──WebSocket 127.0.0.1:3055──► окно плагина (ui.html) ──► code.ts ──► макет
```

## Установка в Claude Desktop

Готовое расширение — `bridge/claude-sigma.mcpb`. Node.js ставить не нужно: расширение запускает Claude Desktop.

1. Claude Desktop → **Settings → Extensions** → **Advanced settings → Install Extension…** (или перетащить файл в окно настроек).
2. Выбрать `claude-sigma.mcpb` → **Install**. Расширение не подписано — подтвердить установку.
3. Убедиться, что расширение **Claude Sigma — Figma** включено.
4. В Figma Desktop запустить плагин (**Plugins → Development → Claude Sigma**) и нажать **Подключить**. Точка станет зелёной.
5. В новом чате Claude Desktop: «Проверь подключение к Figma» → Claude вызовет `figma_status`.

## Инструменты

| Инструмент | Назначение |
|---|---|
| `figma_status` | Подключён ли плагин; файл, страницы |
| `figma_command` | Одна команда плагина (`create_frame`, `update_node`, `get_node`, …) |
| `figma_batch` | Пакет команд со ссылками `"$N"` — слайд за один вызов |
| `figma_screenshot` | PNG узла (по умолчанию — выделения) для проверки результата |

Правила рисования (скилл `.claude/skills/figma-sigma-draw`) встроены в инструкции сервера, поэтому Claude Desktop получает их автоматически.

## Безопасность

- Сервер слушает только `127.0.0.1` — из сети он недоступен.
- Подключения с настоящим origin (любой сайт в браузере) отклоняются; принимается только окно плагина Figma (origin `null`).
- Необязательный токен: задать в настройках расширения и тот же — в окне плагина.

## Claude Code

```bash
cd bridge && npm install && npm run build
claude mcp add claude-sigma -- node "$(pwd)/mcpb/server/index.js"
```

## Разработка

| Команда | Что делает |
|---|---|
| `npm run build` | Сборка `mcpb/server/index.js` |
| `npm run typecheck` | Проверка типов |
| `npm test` | Тест моста и полная цепочка в Chromium (MCP → мост → ui.html → code.js) |
| `npm run pack` | Сборка `claude-sigma.mcpb` |

Переменные окружения: `SIGMA_PORT` (по умолчанию 3055), `SIGMA_TOKEN`. Лог — в stderr (в Claude Desktop: **Settings → Developer → Open Logs Folder**, файл `mcp-server-Claude Sigma — Figma.log`).

## Неполадки

| Симптом | Причина / решение |
|---|---|
| `figma_status` → «Плагин не подключён» | Плагин не запущен или не нажато «Подключить» |
| «порт 3055 занят» | Запущена вторая копия моста — перезапустить Claude Desktop |
| Плагин: «Соединение закрыто (4003)» | Токены в плагине и в настройках расширения различаются |
| Плагин не подключается, мост работает | Порт в плагине и в расширении должен совпадать; другой порт добавить в `figma-plugin/manifest.json` → `devAllowedDomains` |
