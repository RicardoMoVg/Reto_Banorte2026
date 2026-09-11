# Mosaico — Reto Banorte 2026

Asistente financiero con **A2UI (Agent-to-UI)**: el agente no manda texto ni
JSON para que el cliente interprete — transmite componentes de React ya
renderizados. Arquitectura de 3 capas, no negociable:

1. **LLM** — el modelo como orquestador central (decide qué mostrar).
2. **MCP** — la única fuente de datos financieros reales (Postgres).
3. **A2UI** — el agente transmite JSX real al cliente vía RSC (`streamUI`).

## Estructura de carpetas

```
mosaico/
├── app/
│   ├── acciones/
│   │   ├── agente.tsx            # 🧠 Server Action: streamUI + tools (el orquestador)
│   │   └── ai.ts                  # createAI: puente Server Action <-> estado del cliente
│   ├── layout.tsx                 # monta <AI> envolviendo toda la app
│   ├── page.tsx                    # UI del chat: useActions/useUIState (guarda ReactNode)
│   └── globals.css
│
├── components/
│   └── generative/                # 🧱 Bloques A2UI — SOLO UI, cero lógica de IA/MCP
│       └── RastreadorMetas.tsx
│
├── lib/
│   ├── ai/
│   │   ├── system-prompt.ts        # personalidad/instrucciones del agente
│   │   └── rsc-types.ts             # tipos de AIState/UIState (evita imports circulares)
│   └── mcp/
│       └── mcp-client.ts            # única puerta de entrada al servidor MCP
│                                     # (con fallback a datos mock si no hay DATABASE_URL)
│
├── mcp-server/                     # Servidor MCP (paquete Node separado) -> Postgres
│   ├── src/
│   │   ├── server.ts                # McpServer + tools: get_metas, get_transacciones, get_saldo
│   │   ├── db.ts                     # Pool de pg
│   │   ├── schema.sql
│   │   └── seed.ts                   # Crea tablas + inserta datos demo
│   ├── package.json                  # Dependencias propias (@modelcontextprotocol/sdk, pg)
│   └── .env.example
│
└── tailwind.config.ts / tsconfig.json / next.config.mjs
```

**Regla de oro:** `components/generative/` no importa nada de `ai`, `@ai-sdk/rsc`
ni `lib/mcp`. Solo recibe props y se ve bonito. Toda la orquestación vive en
`app/acciones/agente.tsx`.

## ⚠️ Qué cambió (y qué se eliminó) en este refactor

Antes teníamos `app/api/chat/route.ts` (`streamText` + `tools`, consumido con
`useChat`). Ahora que la arquitectura exige A2UI/RSC de verdad, **eliminé**:
- `app/api/chat/route.ts`
- `lib/ai/tools.ts`
- `components/ui-blocks/` (movido y renombrado a `components/generative/`)

Y los reemplacé por `app/acciones/agente.tsx` + `app/acciones/ai.ts`. Esto es
intencional, no un descuido: `streamUI` (de `@ai-sdk/rsc`) solo funciona
dentro de una **Server Action**, porque su valor de retorno es un stream de
React Server Components — un Route Handler no puede serializar eso, solo
`Response` HTTP normal (por eso la vez pasada usamos `streamText`). Con esta
arquitectura ya no hay `fetch`/`useChat` en el cliente: `page.tsx` llama
directo a la Server Action.

> Nota de versión: algunos tutoriales importan `streamUI`/`createAI` desde
> `ai/rsc` (AI SDK v3). Con `ai@^4` que tenemos instalado, esos helpers viven
> en el paquete separado `@ai-sdk/rsc` — es lo que usan `agente.tsx`/`ai.ts`.
> Verifica que la versión de `@ai-sdk/rsc` en `package.json` sea compatible
> con la de `ai` al instalar.

## Cómo fluye una pregunta

1. El usuario escribe en `page.tsx` → se pinta su mensaje optimistamente en
   `UIState` y se llama a `enviarMensaje(input)` (Server Action).
2. `agente.tsx` mete el mensaje al `AIState` (historial plano) y llama a
   `streamUI({ model, system, messages, tools })`.
3. El modelo decide: texto plano (`text: ...`) o invocar
   `mostrarProgresoMeta` (`tools.mostrarProgresoMeta.generate`).
4. Si invoca la tool, `generate` hace `yield` de un skeleton, y luego
   `return` del componente `<RastreadorMetas />` ya con props — eso es lo
   que viaja al cliente como JSX real, no JSON.
5. `page.tsx` recibe `{ id, role, display }` y lo agrega a `UIState` — el
   `display` (el `ReactNode`) se renderiza tal cual con `{m.display}`.

## MCP: aún no conectado a esta tool (a propósito)

Tal como está, `mostrarProgresoMeta` recibe `titulo`/`porcentaje` que el
**modelo genera**, no datos reales — dejé un comentario `TODO(MCP)` exacto
en `app/acciones/agente.tsx` marcando dónde reemplazarlo por
`getMetasUsuario(userId)` de `lib/mcp/mcp-client.ts` (que ya existe, ya
tiene fallback mock, y no necesita Postgres para funcionar hoy — ver
sección de MCP más abajo). Mientras no se conecte, el agente puede
"inventar" el porcentaje — aceptable para probar el flujo A2UI, **no** para
el demo final. Es el siguiente paso lógico.

## Servidor MCP

`mcp-server/` es un paquete Node **independiente** del de Next.js. No expone
HTTP: habla el protocolo MCP por stdio y se levanta como proceso hijo.

1. `mcp-server/src/server.ts` — tools puras de datos (`get_metas`,
   `get_transacciones`, `get_saldo`). No sabe nada de React.
2. `lib/mcp/mcp-client.ts` — cliente vía `experimental_createMCPClient` de
   `ai`. Expone `getMetasUsuario`, `getTransaccionesRecientes`,
   `getSaldoUsuario`, con fallback a mock si no hay `DATABASE_URL`.
3. (Pendiente, ver arriba) `app/acciones/agente.tsx` llamando a esas
   funciones desde dentro de `generate`.

### Levantarlo (cuando haya Postgres)

```bash
createdb mosaico
cd mcp-server
npm install
cp .env.example .env   # editar con el DATABASE_URL real
npm run seed
```

## Cómo correr el front

```bash
npm install
```

`.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
npm run dev
```

> Sin `DATABASE_URL`, todo funciona igual (mock en memoria) — no es
> necesario para probar el flujo A2UI descrito arriba.

## Siguiente bloque A2UI

1. Crear `components/generative/NuevoBloque.tsx` (props tipadas + Framer Motion).
2. En `app/acciones/agente.tsx`: agregar una entrada en `tools` con su
   `zod` schema y su `generate` (que `return`-ea el nuevo componente).
3. Nada que tocar en `page.tsx` ni en `ai.ts` — el `display` ya es genérico.
