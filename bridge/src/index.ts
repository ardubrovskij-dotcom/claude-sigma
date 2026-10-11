// Claude Sigma Bridge — MCP-сервер для Claude Desktop/Claude Code.
// Claude вызывает инструменты по stdio (MCP), мост пересылает команды плагину Figma
// по WebSocket (ws://127.0.0.1:3055) и возвращает ответ. stdout занят протоколом MCP,
// поэтому весь лог — только в stderr.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import guide from "../../.claude/skills/figma-sigma-draw/SKILL.md";

// Claude Desktop подставляет настройки расширения в env; незаполненное поле может прийти
// буквальным шаблоном "${user_config.*}" — считаем его пустым.
const setting = (v: string | undefined) => (v && !v.includes("${") ? v.trim() : "");
const PORT = Number(setting(process.env.SIGMA_PORT)) || 3055;
const TOKEN = setting(process.env.SIGMA_TOKEN);
const COMMAND_TIMEOUT_MS = 30_000;
const BATCH_TIMEOUT_MS = 180_000;
const VERSION = "0.1.0";
const ALLOWED_ORIGINS = new Set(["null", "https://www.figma.com"]);

const log = (...args: unknown[]) => console.error("[claude-sigma]", ...args);

// ---------- Связь с плагином ----------

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout };

class PluginLink {
  private socket: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private seq = 0;
  private listening = false;
  private lastError = "";

  start(): void {
    const wss = new WebSocketServer({
      host: "127.0.0.1",
      port: PORT,
      // UI плагина Figma работает в iframe с origin "null". Любой сайт в браузере имеет
      // настоящий origin — такие подключения отклоняем, чтобы страницы не управляли макетом.
      verifyClient: ({ origin }: { origin?: string }) => {
        const ok = !origin || ALLOWED_ORIGINS.has(origin);
        if (!ok) log(`отклонено подключение с origin ${origin}`);
        return ok;
      },
    });
    wss.on("listening", () => {
      this.listening = true;
      this.lastError = "";
      log(`ожидаю плагин на ws://127.0.0.1:${PORT}`);
    });
    wss.on("error", (err: NodeJS.ErrnoException) => {
      this.listening = false;
      this.lastError =
        err.code === "EADDRINUSE"
          ? `порт ${PORT} занят (возможно, запущена вторая копия моста)`
          : err.message;
      log("ошибка сервера:", this.lastError, "— повтор через 5 с");
      wss.close();
      setTimeout(() => this.start(), 5000);
    });
    wss.on("connection", (ws) => this.accept(ws));
  }

  private accept(ws: WebSocket): void {
    let authorized = !TOKEN;
    const authTimer = setTimeout(() => {
      if (!authorized) ws.close(4001, "no hello");
    }, 5000);

    ws.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (msg.type === "hello") {
        if (TOKEN && msg.token !== TOKEN) {
          ws.send(JSON.stringify({ type: "error", message: "Неверный токен моста" }));
          ws.close(4003, "bad token");
          return;
        }
        authorized = true;
        clearTimeout(authTimer);
        if (this.socket && this.socket !== ws) this.socket.close(4000, "replaced");
        this.socket = ws;
        ws.send(JSON.stringify({ type: "welcome", message: `Claude Sigma Bridge ${VERSION} готов` }));
        log("плагин подключён");
        return;
      }
      if (!authorized || msg.type !== "result") return;
      const p = this.pending.get(String(msg.id));
      if (!p) return;
      this.pending.delete(String(msg.id));
      clearTimeout(p.timer);
      if (msg.error) p.reject(new Error(msg.error));
      else p.resolve(msg.result);
    });

    // Keep-alive: плагин отвечает pong; заодно проверяем, что сокет жив.
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, 20_000);

    ws.on("close", () => {
      clearInterval(ping);
      clearTimeout(authTimer);
      if (this.socket === ws) {
        this.socket = null;
        log("плагин отключён");
        for (const [id, p] of this.pending) {
          clearTimeout(p.timer);
          p.reject(new Error("Плагин отключился во время выполнения команды"));
          this.pending.delete(id);
        }
      }
    });
  }

  get connected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  status(): string {
    if (!this.listening) return `Мост не запущен: ${this.lastError || "запуск…"}`;
    if (!this.connected) {
      return (
        "Плагин не подключён. В Figma Desktop: Plugins → Development → Claude Sigma → «Подключить» " +
        `(адрес ws://localhost:${PORT}).`
      );
    }
    return "ok";
  }

  send(command: string, params: Record<string, unknown> = {}, timeoutMs = COMMAND_TIMEOUT_MS): Promise<any> {
    const state = this.status();
    if (state !== "ok") return Promise.reject(new Error(state));
    const id = `c${++this.seq}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Плагин не ответил за ${Math.round(timeoutMs / 1000)} с на команду ${command}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.socket!.send(JSON.stringify({ id, command, params }));
    });
  }
}

// ---------- MCP ----------

const link = new PluginLink();

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 1) }] });
const fail = (e: unknown) => ({
  isError: true,
  content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }],
});

const instructions = [
  "Инструменты этого сервера рисуют в открытом файле Figma через плагин Claude Sigma.",
  "Перед работой вызови figma_status. Строй слайд или блок одним figma_batch, после сборки проверь результат через figma_screenshot.",
  "Ниже — правила команд и вёрстки, соблюдай их.",
  "",
  guide.replace(/^---[\s\S]*?---\s*/, ""),
].join("\n");

const server = new McpServer({ name: "claude-sigma", version: VERSION }, { instructions });

const COMMANDS_HELP =
  "Команды: ping, list_commands, get_document_info, get_page {pageId?, depth?}, set_current_page {pageId}, " +
  "create_page {name}, get_selection {depth?}, get_node {id, depth?}, find_nodes {type?, name?, text?, rootId?, limit?}, " +
  "create_frame, create_rectangle, create_ellipse, create_polygon, create_star, create_line {x1,y1,x2,y2}, " +
  "create_vector {paths|path}, create_svg {svg}, create_text {text, fontFamily, fontStyle, fontSize, width?}, " +
  "create_component, create_instance {componentId}, update_node {id, ...свойства}, move_to_parent {id, parentId?, index?, x?, y?}, " +
  "clone_node {id, parentId?}, delete_node {id|ids}, group {ids}, ungroup {id}, boolean {ids, operation}, flatten {ids}, " +
  "select {ids, zoom?}, export_node {id, format, scale?}, list_fonts {family?}, notify {message}. " +
  "Общие свойства create_*/update_node: parentId, index, name, x, y, width, height, rotation, opacity, visible, " +
  'fill ("#RRGGBB[AA]" | null | {type:"linear", stops, angle}), stroke, strokeWeight, cornerRadius (число или [tl,tr,br,bl]), ' +
  'effects ([{type:"shadow", color, x, y, blur, spread}]), clipsContent, layoutMode (HORIZONTAL|VERTICAL), itemSpacing, ' +
  "padding, primaryAxisAlignItems, counterAxisAlignItems, primaryAxisSizingMode/counterAxisSizingMode (FIXED|AUTO), " +
  "layoutSizingHorizontal/Vertical (FIXED|HUG|FILL), lineHeight (24 | \"120%\" | \"auto\"), letterSpacing, textAlign.";

server.registerTool(
  "figma_status",
  {
    title: "Статус Figma",
    description: "Проверить, подключён ли плагин Figma, и узнать открытый файл, страницу и список страниц.",
    inputSchema: {},
  },
  async () => {
    try {
      const state = link.status();
      if (state !== "ok") return json({ connected: false, hint: state });
      return json({ connected: true, ...(await link.send("get_document_info")) });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "figma_command",
  {
    title: "Команда Figma",
    description: `Выполнить одну команду плагина в открытом файле Figma и вернуть результат (обычно id и размеры узла). ${COMMANDS_HELP}`,
    inputSchema: {
      command: z.string().describe("Имя команды, например create_frame"),
      params: z.record(z.string(), z.any()).optional().describe("Параметры команды"),
    },
  },
  async ({ command, params }) => {
    try {
      return json(await link.send(command, params ?? {}));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "figma_batch",
  {
    title: "Пакет команд Figma",
    description:
      'Выполнить несколько команд по порядку за один вызов — основной способ строить слайды и блоки. Строка "$N" в параметрах ' +
      'заменяется на id результата N-й команды (например, parentId: "$0" кладёт слой в первый созданный фрейм). ' +
      "При ошибке выполнение останавливается и возвращается { results, error: { index, command, message } }; " +
      `уже выполненные команды не откатываются. ${COMMANDS_HELP}`,
    inputSchema: {
      commands: z
        .array(z.object({ command: z.string(), params: z.record(z.string(), z.any()).optional() }))
        .min(1)
        .describe("Список команд"),
      continueOnError: z.boolean().optional().describe("Продолжать после ошибки (по умолчанию false)"),
    },
  },
  async ({ commands, continueOnError }) => {
    try {
      const result = await link.send("batch", { commands, continueOnError }, BATCH_TIMEOUT_MS);
      return result && result.error ? { ...json(result), isError: true } : json(result);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "figma_screenshot",
  {
    title: "Снимок Figma",
    description:
      "Получить PNG-снимок узла, чтобы проверить результат глазами. Без id — первый выделенный слой. " +
      "Для слайда 1920×1080 достаточно scale 0.5.",
    inputSchema: {
      id: z.string().optional().describe("id узла; по умолчанию — выделение"),
      scale: z.number().min(0.1).max(2).optional().describe("Масштаб, по умолчанию 0.5"),
    },
  },
  async ({ id, scale }) => {
    try {
      let nodeId = id;
      if (!nodeId) {
        const selection = await link.send("get_selection");
        if (!selection.length) throw new Error("Ничего не выделено — передайте id узла");
        nodeId = selection[0].id;
      }
      const shot = await link.send("export_node", { id: nodeId, format: "PNG", scale: scale ?? 0.5 });
      return {
        content: [
          { type: "image" as const, data: shot.base64, mimeType: "image/png" },
          { type: "text" as const, text: `id ${nodeId}, ${shot.bytes} байт` },
        ],
      };
    } catch (e) {
      return fail(e);
    }
  },
);

async function main(): Promise<void> {
  link.start();
  await server.connect(new StdioServerTransport());
  // Claude закрыл stdio (вышел или упал) — завершаемся, чтобы не держать порт.
  process.stdin.on("end", () => process.exit(0));
  process.stdin.on("close", () => process.exit(0));
  log(`MCP-сервер запущен (версия ${VERSION})`);
}

main().catch((e) => {
  log("не удалось запустить:", e);
  process.exit(1);
});
