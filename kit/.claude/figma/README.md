# Claude for Figma by Dubrovskiy

Подключено к этому репозиторию: Claude рисует в Figma через плагин Claude for Figma by Dubrovskiy.

| Файл | Назначение |
|---|---|
| `../../.mcp.json` → `claude-figma` | MCP-сервер с инструментами `figma_status`, `figma_batch`, `figma_command`, `figma_screenshot` |
| `start.sh` | Запуск: в облачной сессии — через ретранслятор, на компьютере — через `localhost:3055` |
| `bridge.js` | Собранный мост (Node.js 18+) |
| `relay-url` | Адрес комнаты ретранслятора `wss://…/ws/<токен>`. **Секрет**: кто его знает, рисует в вашей Figma. В публичном репозитории не храните — задайте переменную окружения `SIGMA_RELAY_URL` |
| `../skills/project-to-figma/` | Навык: контекст проекта → бриф → макет |

В Figma должен быть открыт плагин Claude for Figma by Dubrovskiy с подключёнными блоками «Компьютер» и/или «Облако».
Проверка в сессии: «Проверь подключение к Figma». Обновление: снова выполнить команду установки.
Источник: https://github.com/ardubrovskij-dotcom/claude-sigma
