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

## Установка и обновление (macOS)

1. Скачать: https://github.com/ardubrovskij-dotcom/claude-sigma/archive/refs/heads/claude/modest-brahmagupta-flhzty.zip и распаковать.
2. Дважды щёлкнуть **`setup.command`** (macOS не даёт — правый щелчок → «Открыть»). Он перенесёт папку в `~/claude-sigma`, подключит мост к Claude Code во всех репозиториях и откроет установку расширения.
3. В Claude Desktop нажать **Install**.
4. Только при первой установке — в Figma: **Plugins → Development → Import plugin from manifest…** → ⌘⇧G → ⌘V (путь уже в буфере) → Enter.
5. В плагине: галочка **«авто»** → **Подключить**.

Обновление — те же шаги 1–3: новый ZIP и `setup.command`; в Figma ничего не нужно.

Навык `project-to-figma` — Claude Desktop → **Settings → Capabilities → Skills → Upload skill** → `~/claude-sigma/skills/dist/project-to-figma.zip` (один раз).

Подробно: [figma-plugin/README.md](figma-plugin/README.md), [bridge/README.md](bridge/README.md), [skills/README.md](skills/README.md).
