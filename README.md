# Mosaico — Reto Banorte 2026

Asistente financiero con **Generative UI**: la IA no dibuja pantallas, elige qué
"bloque de LEGO" (componente cerrado de Next.js) mostrar y con qué datos,
consultando siempre al servidor MCP.

## Estructura de carpetas

```
mosaico/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts        # Orquestación IA: streamText + tools (ver nota abajo)
│   ├── layout.tsx
│   ├── page.tsx                 # Chat + "ensamblador" (tool -> bloque LEGO)
│   └── globals.css
│
├── components/
│   ├── ui-blocks/                # 🧱 Catálogo de LEGO — SOLO UI, cero lógica de IA
│   │   ├── RastreadorMetas.tsx
│   │   └── index.ts               # registro/barrel de todos los bloques
│   └── ui/                        # primitives de shadcn/ui (button, card, etc.)
│
├── lib/
│   ├── ai/
│   │   ├── system-prompt.ts        # personalidad/instrucciones del agente
│   │   └── tools.ts                 # catálogo de tools (1:1 con bloques de LEGO)
│   └── mcp/
│       └── mcp-client.ts          # única puerta de entrada al servidor MCP
│                                    # (con fallback a datos mock si no hay DATABASE_URL)
│
├── mcp-server/                    # Servidor MCP (paquete Node separado) -> Postgres
│   ├── src/
│   │   ├── server.ts               # McpServer + tools: get_metas, get_transacciones, get_saldo
│   │   ├── db.ts                    # Pool de pg
│   │   ├── schema.sql
│   │   └── seed.ts                  # Crea tablas + inserta datos demo
│   ├── package.json                 # Dependencias propias (@modelcontextprotocol/sdk, pg)
│   └── .env.example
│
└── tailwind.config.ts / tsconfig.json / next.config.mjs
```

**Regla de oro:** `components/ui-blocks/` no importa nada de `ai` ni de `lib/mcp`.
Solo recibe props y se ve bonito. Toda la orquestación vive en `app/api/chat/route.ts`
y en el `switch` de `app/page.tsx`.

## Nota técnica importante: `streamUI` vs. lo implementado

Pediste `streamUI` en `app/api/chat/route.ts`. Una aclaración de arquitectura
antes de que se topen con esto a media madrugada de hackathon:

- `streamUI` (de `@ai-sdk/rsc`) está diseñado para **Server Actions + React
  Server Components**, no para un **Route Handler** (`route.ts`) consumido con
  `fetch`/`useChat`. Un `route.ts` devuelve una `Response` HTTP normal; no puede
  serializar el payload RSC que `streamUI` produce.
- Por eso, lo que dejé en `app/api/chat/route.ts` usa **`streamText` + `tools`**
  (el patrón "Generative UI" oficial y estable del AI SDK): el modelo decide
  llamar a la tool `mostrarRastreadorMeta`, la tool consulta el MCP, y el
  resultado viaja en el stream. En el cliente (`app/page.tsx`), un `switch`
  sobre `toolName` elige el bloque de LEGO correspondiente y le pasa las props.
- Esto cumple exactamente tu filosofía (IA = arquitecto que elige bloques,
  nunca genera HTML) y es más estable para un hackathon que la vía RSC pura.
- Si más adelante quieren `streamUI`/RSC de verdad (útil si quieren que el
  server renderice el componente y el cliente ni siquiera tenga el bundle),
  se arma en `app/actions.tsx` (`'use server'`) + `createAI` — puedo dárselos
  cuando lo necesiten.

## Servidor MCP

`mcp-server/` es un paquete Node **independiente** del de Next.js (su propio
`package.json`, sus propias dependencias). No expone HTTP: habla el protocolo
MCP por stdio y Next.js lo levanta como proceso hijo la primera vez que se
necesita un dato.

**Capas:**
1. `mcp-server/src/server.ts` — el servidor MCP. Define tools puras de datos
   (`get_metas`, `get_transacciones`, `get_saldo`), cada una con su `zod`
   schema de entrada. No sabe nada de React ni de bloques de LEGO.
2. `lib/mcp/mcp-client.ts` — el cliente, usando `experimental_createMCPClient`
   de `ai`. Expone funciones tipadas (`getMetasUsuario`, `getTransaccionesRecientes`,
   `getSaldoUsuario`) que hacen `callTool(...)` y parsean la respuesta.
3. `app/api/chat/route.ts` — solo llama a las funciones del paso 2 desde
   dentro de sus tools de UI (`mostrarRastreadorMeta`, etc.). **El modelo
   nunca ve las tools crudas del MCP**, solo las tools de UI — así controlan
   qué puede disparar la IA y qué forma tienen los datos que llegan a los
   componentes.

### Levantarlo

1. Postgres local (o el que les den en el hackathon) y crear la base:
   ```bash
   createdb mosaico
   ```
2. Configurar el MCP server:
   ```bash
   cd mcp-server
   npm install
   cp .env.example .env
   # editar .env con el DATABASE_URL real
   npm run seed        # crea tablas + inserta datos demo
   ```
3. Probarlo solo, sin Next.js, para confirmar que conecta a la base:
   ```bash
   npm run dev
   ```
   (se queda esperando mensajes MCP por stdio — es normal que no "imprima" nada,
   ahí es donde Next.js se conectará).

### Siguiente dato financiero

1. Agregar la tabla/columnas necesarias en `mcp-server/src/schema.sql`.
2. Agregar la tool en `mcp-server/src/server.ts` (`server.tool(...)`).
3. Agregar la función tipada correspondiente en `lib/mcp/mcp-client.ts`.
4. Usarla desde una tool de UI en `app/api/chat/route.ts`.

### Nota de despliegue

Para el demo local, stdio (Next.js levanta el MCP como child process) es lo
más simple y lo que ya está cableado. Si en algún momento despliegan el
front y el MCP por separado (ej. Next en Vercel + MCP en otro servicio),
cambiar el transporte a SSE/HTTP en `lib/mcp/mcp-client.ts` — es el mismo
`experimental_createMCPClient`, solo cambia el objeto `transport`.

## Cómo correr el front

```bash
npm install
```

Crear `.env.local` con:

```
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
npm run dev
```

> Sin `DATABASE_URL` definido, `lib/mcp/mcp-client.ts` usa datos mock en
> memoria automáticamente (con warning en consola) — pueden construir y
> probar el agente completo hoy mismo, sin Postgres ni el mcp-server
> corriendo. El día que agreguen `DATABASE_URL` a `.env.local`, el mismo
> código empieza a hablar con el MCP real sin tocar nada más.

## El agente (Vercel AI SDK)

La orquestación vive en 3 archivos:

- **`lib/ai/system-prompt.ts`** — la personalidad e instrucciones. Edítenlo
  aquí, no en `route.ts`, para poder iterar el prompt sin tocar el loop.
- **`lib/ai/tools.ts`** — el catálogo de tools. Cada tool = un bloque de LEGO.
  El modelo solo ve estas tools (nunca las crudas del MCP), y el nombre de
  cada una es el mismo que usa `app/page.tsx` en su `switch` para elegir
  el componente.
- **`app/api/chat/route.ts`** — arma `streamText({ model, system, tools, maxSteps })`.
  `maxSteps: 5` es lo que lo hace un *agente* y no solo function-calling de un
  tiro: después de ejecutar una tool, el SDK reinyecta el resultado a la
  conversación y el modelo decide si necesita otra tool o si ya puede
  responder. `onStepFinish` imprime en consola qué tools se dispararon en
  cada paso — útil para debuggear en el demo.

Para agregar un dato/bloque nuevo al agente: 1) función tipada en
`mcp-client.ts` (con su mock), 2) tool en `lib/ai/tools.ts`, 3) `case` en el
`switch` de `app/page.tsx`. `route.ts` no cambia.

> ⚠️ Subí `ai` a `^4.0.0` (el cliente MCP `experimental_createMCPClient` no
> existe en la v3 que había antes). Si al instalar ven errores de tipos en
> `useChat`/`message.toolInvocations` en `app/page.tsx`, es porque en v4 ese
> hook se recomienda importarlo de `@ai-sdk/react` en vez de `ai/react`, y
> algunos SDKs recientes exponen `message.parts` en vez de `toolInvocations`.
> Lo dejamos pendiente de ajustar cuando toquemos `page.tsx` a fondo —
> revisen el changelog de la versión exacta que quede instalada.

## Siguiente bloque de LEGO

1. Crear `components/ui-blocks/NuevoBloque.tsx` (props tipadas + Framer Motion).
2. Exportarlo en `components/ui-blocks/index.ts`.
3. Agregar su `tool` en `app/api/chat/route.ts` (con `execute` llamando a
   `lib/mcp/mcp-client.ts`).
4. Agregar el `case` en el `switch` de `app/page.tsx`.
