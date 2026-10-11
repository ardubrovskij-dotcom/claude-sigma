# Claude for Figma by Dubrovskiy

Claude рисует в Figma по текстовому запросу: слайды, фреймворки, схемы, иконки. Работает через официальный Plugin API на любом тарифе Figma.

```
Вы → Claude Desktop → мост (bridge/) → плагин в Figma (figma-plugin/) → макет
```

| Папка | Что это |
|---|---|
| `figma-plugin/` | Плагин Figma: выполняет команды в открытом файле |
| `bridge/` | MCP-мост: инструменты для Claude; готовое расширение `bridge/claude-sigma.mcpb` |
| `.claude/skills/figma-sigma-draw/` | Правила команд и вёрстки слайдов (встроены и в мост) |
| `skills/project-to-figma/` | Навык: контекст проекта → стиль → бриф → макет в Figma ([skills/README.md](skills/README.md)) |

## Установка (macOS / Windows)

1. **Плагин** — Figma Desktop → меню → **Plugins → Development → Import plugin from manifest…** → `figma-plugin/manifest.json`. Подробнее: [figma-plugin/README.md](figma-plugin/README.md).
2. **Мост** — двойной щелчок по `bridge/claude-sigma.mcpb` или Claude Desktop → **Settings → Extensions** → установить файл. Подробнее: [bridge/README.md](bridge/README.md).
3. **Связать** — в Figma запустить плагин Claude for Figma by Dubrovskiy → **Подключить** (точка станет зелёной).
4. **Навык** — Claude Desktop → **Settings → Capabilities → Skills → Upload skill** → `skills/dist/project-to-figma.zip`.
5. **Рисовать** — в проекте Claude Desktop: «Сделай 5 слайдов питча по нашему проекту» → Claude покажет бриф → «ок» → макет в Figma.
