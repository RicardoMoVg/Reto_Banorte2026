# Mosaico — Reto Banorte 2026

Asistente financiero con **A2UI (Agent-to-UI)**: el agente no manda texto para
que un humano lo lea ni JSX para que React lo renderice del lado del
servidor — manda **JSON declarativo** (bloque + props ya resueltos con datos
reales) y el cliente decide cómo pintarlo con su propio catálogo de
componentes. Tres proyectos independientes, cada uno con su propio
`package.json`:

```
server/   → backend: el LLM (orquestador) + la API HTTP que habla A2UI-lite
mcp-server/ → capa de datos: servidor MCP (stdio) sobre Postgres/mock
client/   → el único cliente de UI: Expo/React Native (Android, iOS, y web)
```

`server/` **no tiene interfaz visual propia** — nadie abre una URL para
chatear. Su único trabajo es exponer `POST /api/agent`, que `client/`
consume por HTTP sin importar desde qué plataforma se abra.

```
client/ (Expo/RN)  --HTTP-->  server/ (agente/LLM)  --MCP(stdio)-->  mcp-server/ (datos)  --SQL-->  Postgres/mock
```

## Setup — empieza aquí

### Backend (`server/`)

```bash
cd server
npm install
```

Crea `server/.env`:

```
GOOGLE_GENERATIVE_AI_API_KEY=tu-key
```

Saca tu key en <https://aistudio.google.com/apikey>.

> ⚠️ **Usa tu propia key; no la compartan entre todos.** El free tier de
> Gemini da muy pocas requests/día por modelo (vimos el límite real: 20
> para `gemini-3.8-flash`, el que resuelve hoy el alias `gemini-flash-latest`
> — por eso `server/app/api/agent/route.ts` usa el id explícito
> `gemini-3.6-flash` en vez del alias). Si el equipo entero pega a la misma
> key se agota en minutos y vas a ver `429` / `RESOURCE_EXHAUSTED`.

```bash
npm run dev   # http://localhost:3000 — solo expone /api/agent, la raíz da 404 (es esperado)
```

Sin `DATABASE_URL` definido, `lib/mcp/mcp-client.ts` usa datos mock en
memoria automáticamente — pueden probar el flujo completo hoy mismo sin
Postgres ni `mcp-server/` corriendo.

### Cliente (`client/`)

```bash
cd client
npm install
cp .env.example .env   # ajustar EXPO_PUBLIC_API_URL según donde corras (ver el archivo)
npm run web            # smoke test rápido en navegador
# o, para probar en Android de verdad:
npm run emulator -- Pixel_8   # levanta el emulador (npm run emulator, sin args, lista los AVDs disponibles)
npm run android                # en otra terminal, una vez que el emulador esté prendido
```

> ⚠️ **`client/.env` no se recarga solo.** `expo start` lee el `.env` una
> sola vez al arrancar — si lo editas (ej. cambiar `EXPO_PUBLIC_API_URL` al
> pasar de web a Android o viceversa), tienes que matar el proceso de Expo y
> volver a correr `npm run android`/`npm run web`, y forzar que la app
> recargue el bundle (o vas a estar pegándole a la URL vieja en silencio,
> sin ningún error visible — así perdimos buen rato la primera vez).

### Servidor MCP (`mcp-server/`) — opcional

No hace falta para desarrollar: sin `DATABASE_URL` en `server/.env`, todo
corre con mocks. Solo instálenlo si van a trabajar la capa de datos real:

```bash
cd mcp-server
npm install
cp .env.example .env   # editar con el DATABASE_URL real (ver notas abajo)
npm run seed
```

`schema.sql` + `seed.ts` (17 tablas cubriendo las 6 categorías del brief,
más un trigger que mantiene `cuentas.saldo` sincronizado con
`transacciones`) ya están **verificados en vivo contra Supabase** — no son
solo teoría.

> ⚠️ **Si usan Supabase**, copien el connection string del **"Session
> pooler"**, no el de "Direct connection" — el directo
> (`db.<project-ref>.supabase.co`) resuelve solo por IPv6 hoy en día y
> puede fallar con `getaddrinfo ENOENT` según la red. El del pooler
> (`aws-0-<region>.pooler.supabase.com:6543`) sí resuelve por IPv4 normal.
>
> En **Supabase → Project Settings → API**, apaguen **"Enable Data API"** y
> **"Automatically expose new tables"** (no las usamos — `mcp-server` habla
> Postgres directo, nunca el REST de Supabase) y dejen prendido **"Enable
> automatic RLS"** como red de seguridad.

> ⚠️ **Pendiente de verificar en Windows:** el spawn del proceso hijo en
> `server/lib/mcp/mcp-client.ts` (el que conecta `server/` a este paquete
> por MCP/stdio) usa `spawn('npx', ...)` sin `shell: true`. En Windows esto
> puede fallar con `spawn npx ENOENT`. Esto es distinto de lo de arriba —
> ya probamos `schema.sql`/`seed.ts` en vivo, pero **no** el handshake MCP
> completo desde `server/` — probarlo en cuanto configuren un
> `DATABASE_URL` real ahí también.

## Estructura de carpetas

```
server/
├── app/
│   └── api/agent/route.ts     # el orquestador: streamText + tools, regresa NDJSON (A2UI-lite)
├── lib/
│   ├── ai/
│   │   ├── system-prompt.ts    # personalidad/instrucciones del agente
│   │   ├── a2ui-schemas.ts     # Zod schemas de cada bloque (el "data schema" del catálogo)
│   │   └── a2ui-tools.ts       # catálogo de tools — cada una llama al MCP real, regresa JSON
│   └── mcp/mcp-client.ts       # única puerta de entrada al servidor MCP (con fallback mock)
├── package.json / next.config.mjs / tsconfig.json

mcp-server/                     # Servidor MCP (paquete Node separado) -> Postgres
├── src/
│   ├── server.ts                # McpServer + tools: get_metas, get_transacciones, get_saldo
│   ├── db.ts                     # Pool de pg
│   ├── schema.sql
│   └── seed.ts                   # Crea tablas + inserta datos demo
└── package.json                  # Dependencias propias (@modelcontextprotocol/sdk, pg)

client/                          # App Expo/React Native — Android, iOS, y web
├── App.tsx                       # pantalla única (por ahora): input + lista de mensajes
├── components/                   # bloques nativos (View/StyleSheet, sin Tailwind/framer-motion)
├── scripts/emulator.js           # `npm run emulator -- <avd>` — levanta el emulador sin Android Studio
└── package.json / app.json / tsconfig.json
```

## Cómo fluye una pregunta

1. `client/App.tsx` manda `POST /api/agent` con el mensaje del usuario.
2. `server/app/api/agent/route.ts` llama `streamText({ model, system, tools })`.
3. El modelo decide: responder en texto, o invocar una tool de
   `lib/ai/a2ui-tools.ts` (ej. `mostrarProgresoMeta`).
4. La tool llama al MCP real (`lib/mcp/mcp-client.ts` → `mcp-server/`) para
   traer el dato — el modelo nunca inventa cifras, solo elige qué mostrar y
   redacta el mensaje de contexto.
5. El resultado viaja al cliente como una línea NDJSON:
   `{"type":"surface","tipo":"RastreadorMetas","props":{...}}`.
6. `client/` recibe ese JSON y renderiza su propio componente nativo con
   esos props — ningún JSX ni código ejecutable cruza la red, solo datos.

> **Simplificación deliberada (documentar en la entrega):** cada bloque viaja
> ya resuelto de una vez (`createSurface` + datos juntos), no incremental
> componente-por-componente como el A2UI completo. Es un subconjunto fiel
> del protocolo, no la versión con streaming granular — suficiente para el
> alcance del reto.

## Siguiente bloque A2UI

1. Backend: Zod schema en `lib/ai/a2ui-schemas.ts` + tool en
   `lib/ai/a2ui-tools.ts` (llamando a una función de `lib/mcp/mcp-client.ts`,
   agregando una nueva si hace falta un dato distinto).
2. Cliente: componente nativo nuevo en `client/components/` + el `case`/`if`
   correspondiente donde `client/App.tsx` interpreta el evento `surface`.

## Historial: qué se retiró

El repo tuvo antes un chat web hecho con `streamUI`/Server Actions de React
Server Components (`app/page.tsx`, `app/acciones/`, `components/generative/`,
`components/dashboard/`). Se eliminó por completo: RSC no es un cliente A2UI
real (manda JSX ya renderizado, no JSON — no lo puede interpretar React
Native), y el equipo decidió que `client/` (con soporte web vía
`react-native-web`) cubre toda superficie de UI necesaria, sin mantener dos
implementaciones en paralelo.
