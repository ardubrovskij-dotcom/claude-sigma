# Claude Sigma

Claude рисует в Figma по текстовому запросу: слайды, фреймворки, схемы, иконки. Работает через официальный Plugin API на любом тарифе Figma.

```
Вы → Claude Desktop → мост (bridge/) → плагин в Figma (figma-plugin/) → макет
```

| Папка | Что это |
|---|---|
| `figma-plugin/` | Плагин Figma: выполняет команды в открытом файле |
| `bridge/` | MCP-мост: инструменты для Claude; готовое расширение `bridge/claude-sigma.mcpb` |
| `.claude/skills/figma-sigma-draw/` | Правила команд и вёрстки слайдов (встроены и в мост) |

## Установка (macOS / Windows)

1. **Плагин** — Figma Desktop → меню → **Plugins → Development → Import plugin from manifest…** → `figma-plugin/manifest.json`. Подробнее: [figma-plugin/README.md](figma-plugin/README.md).
2. **Мост** — двойной щелчок по `bridge/claude-sigma.mcpb` или Claude Desktop → **Settings → Extensions** → установить файл. Подробнее: [bridge/README.md](bridge/README.md).
3. **Связать** — в Figma запустить плагин Claude Sigma → **Подключить** (точка станет зелёной).
4. **Рисовать** — в Claude Desktop: «Сделай в Figma титульный слайд про …».
