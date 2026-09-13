# Mosaico — Reto Banorte 2026

Asistente financiero con **A2UI (Agent-to-UI)**: el agente no manda texto ni
JSON para que el cliente interprete — transmite componentes de React ya
renderizados. Arquitectura de 3 capas, no negociable:

1. **LLM** — el modelo como orquestador central (decide qué mostrar).
2. **MCP** — la única fuente de datos financieros reales (Postgres).
3. **A2UI** — el agente transmite JSX real al cliente vía RSC (`streamUI`).

## Setup — empieza aquí

### Primera vez, y cada vez que hagas `git pull`

```bash
git pull origin team/ricardo
npm ci                          # app Next (raíz)
cd agente && npm ci && cd ..    # agente suelto
npm run dev                     # http://localhost:3000
```

> **Vas a ver ~18,500 archivos borrados al hacer el pull.** Es esperado, no
> es un bug: sacamos `agente/node_modules` del repo (estaban commiteados por
> error y eran el 99.8% de los archivos). El `npm ci` dentro de `agente/` te
> los devuelve idénticos gracias al `package-lock.json`.

### Por qué `npm ci` y no `npm install`

`npm ci` instala **exactamente** las versiones del `package-lock.json`.
`npm install` puede subir de versión dentro del rango del `^` y traerte otra
cosa distinta a la del resto del equipo.

Esto ya rompió el proyecto una vez: `@ai-sdk/rsc: ^1.0.0` resolvió a la
generación **v5** mientras `ai` y los providers eran **v4**, y nada compilaba
(ver la nota de versión más abajo). Con `npm ci` todos quedamos con el mismo
árbol de dependencias.

### Variables de entorno

No vienen en el repo — están en `.gitignore`, que es donde deben estar.
Créalas a mano:

**`.env.local`** en la raíz. Sin esto la UI carga pero el chat truena:

```
GOOGLE_GENERATIVE_AI_API_KEY=tu-key
```

**`agente/env`**, solo si vas a tocar el agente suelto de `agente/`:

```
GEMINI_API_KEY=tu-key
```

Saca tu key en <https://aistudio.google.com/apikey>.

> ⚠️ **Usa tu propia key; no compartan una entre todos.** El free tier da
> **20 requests por día por proyecto**. Si el equipo entero usa la misma se
> agota en minutos y la app empieza a fallar con 429 (se ve como
> `.update(): UI stream is already closed` en la consola del server — es un
> síntoma del 429, no un bug del código).

### Opcional: servidor MCP

`mcp-server/` no hace falta para correr la app: sin `DATABASE_URL`,
`lib/mcp/mcp-client.ts` usa datos mock en memoria. Solo instálalo si vas a
trabajar en la capa de datos — ver [Servidor MCP](#servidor-mcp) más abajo.
(Ahí va `npm install` y no `npm ci`, porque ese paquete todavía no tiene
lock file.)

## Estructura de carpetas

```
mosaico/
├── app/
│   ├── acciones/
│   │   ├── ai-to-ui-engine.tsx   # 🧠 capa 1 (LLM): Server Action con streamUI
│   │   └── ai.ts                  # createAI: puente Server Action <-> estado del cliente
│   ├── layout.tsx                 # monta <AI> envolviendo toda la app
│   ├── page.tsx                    # UI del chat: useActions/useUIState (guarda ReactNode)
│   └── globals.css
│
├── components/
│   ├── ai-to-ui/                  # 🧱 capa 3 (A2UI): bloques — SOLO UI, cero lógica IA/MCP
│   │   ├── RastreadorMetas.tsx
│   │   ├── TarjetaSaldo.tsx
│   │   ├── ListaTransacciones.tsx
│   │   ├── ComparativoGastos.tsx
│   │   ├── tipos.ts                 # PropsBloque: props que todo bloque comparte
│   │   └── index.ts                  # catálogo (barrel)
│   └── dashboard/                  # Dashboard Componible: anclar/desanclar bloques
│       ├── DashboardComponible.tsx   # motor de rehidratación (switch tipo -> bloque)
│       ├── BotonPin.tsx
│       ├── pin-context.tsx            # puente cliente <-> bloques nacidos en el server
│       └── tipos.ts
│
├── lib/
│   ├── ai/
│   │   ├── bloques.tsx              # 🔗 mapeo decisión del modelo -> bloque (las tools)
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

**Regla de oro:** `components/ai-to-ui/` no importa nada de `ai`, `ai/rsc`
ni `lib/mcp`. Solo recibe props y se ve bonito. Toda la orquestación vive en
`app/acciones/ai-to-ui-engine.tsx`.

## ⚠️ Qué cambió (y qué se eliminó) en este refactor

Antes teníamos `app/api/chat/route.ts` (`streamText` + `tools`, consumido con
`useChat`). Ahora que la arquitectura exige A2UI/RSC de verdad, **eliminé**:
- `app/api/chat/route.ts`
- `lib/ai/tools.ts`
- `components/ui-blocks/` (movido a `components/generative/`, hoy `components/ai-to-ui/`)

Y los reemplacé por `app/acciones/ai-to-ui-engine.tsx` + `app/acciones/ai.ts`. Esto es
intencional, no un descuido: `streamUI` (de `ai/rsc`) solo funciona
dentro de una **Server Action**, porque su valor de retorno es un stream de
React Server Components — un Route Handler no puede serializar eso, solo
`Response` HTTP normal (por eso la vez pasada usamos `streamText`). Con esta
arquitectura ya no hay `fetch`/`useChat` en el cliente: `page.tsx` llama
directo a la Server Action.

> **Nota de versión (importante).** Con `ai@^4`, `streamUI`/`createAI` se
> importan de **`ai/rsc`** (submódulo del propio paquete `ai`). El paquete
> separado `@ai-sdk/rsc` pertenece a la generación **v5** y NO es compatible:
> se trae su propio `@ai-sdk/provider@2` (`LanguageModelV2`) y choca con el
> `@ai-sdk/provider@1` (`LanguageModelV1`) que usan `ai@4` y los providers
> v1 — además de renombrar `parameters` a `inputSchema` en las tools.
> Regla: todos los paquetes `@ai-sdk/*` deben ser de la misma generación.

## Cómo fluye una pregunta

1. El usuario escribe en `page.tsx` → se pinta su mensaje optimistamente en
   `UIState` y se llama a `generateUIFromAI(input)` (Server Action).
2. `ai-to-ui-engine.tsx` mete el mensaje al `AIState` (historial plano) y llama a
   `streamUI({ model, system, messages, tools })`.
3. El modelo decide: texto plano (`text: ...`) o invocar uno de los bloques
   (`mostrarProgresoMeta`, `mostrarSaldo`, `mostrarTransacciones`,
   `mostrarComparativoGastos`), definidos en `lib/ai/bloques.tsx`.
4. Si invoca la tool, `generate` hace `yield` de un skeleton, y luego
   `return` del componente `<RastreadorMetas />` ya con props — eso es lo
   que viaja al cliente como JSX real, no JSON.
5. `page.tsx` recibe `{ id, role, display }` y lo agrega a `UIState` — el
   `display` (el `ReactNode`) se renderiza tal cual con `{m.display}`.

## MCP: aún no conectado a los bloques (a propósito)

Tal como está, los bloques reciben los datos que el **modelo genera**, no
datos reales — hay un comentario `TODO(MCP)` en cada tool de
`lib/ai/bloques.tsx` marcando dónde reemplazarlo por
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
3. (Pendiente, ver arriba) `app/acciones/ai-to-ui-engine.tsx` llamando a esas
   funciones desde dentro de `generate`.

### Levantarlo (cuando haya Postgres)

```bash
createdb mosaico
cd mcp-server
npm install
cp .env.example .env   # editar con el DATABASE_URL real
npm run seed
```

## Siguiente bloque A2UI

1. Crear `components/ai-to-ui/NuevoBloque.tsx` (props tipadas + Framer Motion).
2. En `app/acciones/ai-to-ui-engine.tsx`: agregar una entrada en `tools` con su
   `zod` schema y su `generate` (que `return`-ea el nuevo componente).
3. Nada que tocar en `page.tsx` ni en `ai.ts` — el `display` ya es genérico.
