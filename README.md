# Claude for Figma by Dubrovskiy

Claude рисует в Figma по текстовому запросу: слайды, фреймворки, схемы, иконки. Работает через официальный Plugin API на любом тарифе Figma.

```
Claude Desktop / локальный Claude Code ── мост ──────────────────────┐
                                                                     ├──► плагин в Figma → макет
облачный Claude Code ── мост ── ретранслятор Cloudflare (relay/) ────┘
```

| Папка | Что это |
|---|---|
| `figma-plugin/` | Плагин Figma: выполняет команды в открытом файле |
| `bridge/` | MCP-мост: инструменты для Claude; готовое расширение `bridge/claude-sigma.mcpb` |
| `relay/` | Ретранслятор для облачных сессий (Cloudflare Workers) |
| `install.sh`, `kit/` | Подключение к любому репозиторию одной командой: `.mcp.json` + мост + навык |
| `cloud/setup.sh` | Альтернатива: Setup script облачного окружения |
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

## Подключить к любому репозиторию (облако и компьютер)

Один раз на человека — свой ретранслятор и плагин; потом одна команда на каждый репозиторий.

1. **Плагин в Figma** — установка на Mac выше.
2. **Ретранслятор** — кнопка → войти в Cloudflare (бесплатно) → Deploy:

   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ardubrovskij-dotcom/claude-sigma)

   Имя Worker — `claude-figma-relay`. Вручную: `cd ~/claude-sigma/relay && npm install && npx wrangler login && npx wrangler deploy`.
3. **Стартовая страница** ретранслятора (`https://claude-figma-relay.<имя>.workers.dev`) создаст личный токен и покажет две строки:
   - адрес комнаты → в плагин, блок «Облако» → «авто» → «Подключить»;
   - команду установки для репозитория.
4. **Репозиторий.** В сессии Claude Code этого репозитория (облачной или на компьютере) написать: «Выполни, закоммить и запушь:» и вставить команду:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/ardubrovskij-dotcom/claude-sigma/claude/modest-brahmagupta-flhzty/install.sh | bash -s -- 'wss://claude-figma-relay.<имя>.workers.dev/ws/<токен>'
   ```

   В репозиторий добавятся `.mcp.json` (сервер `claude-figma`), `.claude/figma/` (мост) и `.claude/skills/project-to-figma/` (навык) — Claude Code подхватывает их сам, и в облаке, и на компьютере.
5. **Новая сессия** в этом репозитории: «Проверь подключение к Figma» → `connected: true` (`bridge: relay` в облаке, `primary`/`secondary` на компьютере).

Адрес комнаты — секрет: он сохраняется в `.claude/figma/relay-url`. Для **публичного** репозитория установите без адреса (`… | bash`) и задайте `SIGMA_RELAY_URL` в переменных облачного окружения.

Каждый, кому вы дадите ссылку на этот репозиторий, разворачивает **свой** ретранслятор со своим токеном — чужие сессии в вашу Figma не попадут.

Альтернатива для всего облачного окружения сразу — [cloud/setup.sh](cloud/setup.sh) в Setup script окружения и `SIGMA_RELAY_URL` в его переменных.

Подробно: [relay/README.md](relay/README.md), [figma-plugin/README.md](figma-plugin/README.md), [bridge/README.md](bridge/README.md), [skills/README.md](skills/README.md).
