# Banortech — Reto Banorte 2026

> **Nombres:** **Banortech** es la aplicación; **Mosaico** es el agente de IA
> que vive dentro de ella. El login dice Banortech, la ventana de conversación
> dice Mosaico. No son sinónimos ni el rebranding de uno al otro.

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

### Atajo: un solo comando

```bash
node scripts/dev.js            # web
node scripts/dev.js --android  # requiere emulador/celular ya conectado
node scripts/dev.js --phone    # celular real en la misma WiFi
```

La primera vez, si falta `server/.env` o `client/.env`, los crea desde su
`.env.example` y se detiene — edítalos con tus valores reales (ver abajo) y
vuelve a correrlo. Después de eso, instala dependencias si hacen falta,
levanta `server/`, detecta en qué puerto quedó, y sincroniza
`EXPO_PUBLIC_API_URL` de `client/` automáticamente antes de levantarlo — así
no se pierde tiempo con el gotcha de abajo.

### Backend (`server/`) — paso a paso, si no usas el script

```bash
cd server
npm install
cp .env.example .env
```

Edita `server/.env` con tus llaves:

```
GOOGLE_GENERATIVE_AI_API_KEY=tu-key
OPENAI_API_KEY=tu-key
```

Saca tu key de Gemini en <https://aistudio.google.com/apikey> y la de
OpenAI en <https://platform.openai.com/api-keys> (se usa como respaldo si
Gemini falla — ver más abajo).

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

### Cliente (`client/`) — paso a paso, si no usas el script

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

> ✅ **Verificado en Windows:** el spawn del proceso hijo en
> `server/lib/mcp/mcp-client.ts` (el que conecta `server/` a este paquete
> por MCP/stdio) usaba `spawn('npx', ...)` sin `shell: true`, lo cual
> truena en Windows con `spawn npx ENOENT` (`npx` ahí es un `.cmd`, y
> `child_process.spawn` no puede ejecutarlo sin shell). Ya arreglado:
> ahora se invoca `process.execPath` (node.exe) directo sobre el archivo
> real de `tsx` (`tsx/dist/cli.mjs`), sin pasar por ningún `.cmd`/shell.
> Handshake MCP completo probado en vivo desde `server/` contra Supabase.

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
├── app/                          # rutas (expo-router, file-based)
│   ├── _layout.tsx               # layout raíz: providers (incluido el del agente)
│   └── (tabs)/                   # las tres ventanas: Inicio, Mosaico (chat), Perfil
├── components/                   # bloques A2UI nativos (View/StyleSheet, sin Tailwind/framer-motion)
│   └── ui/                       # primitivas de la app (Pantalla, Tarjeta, Boton...) — NO son bloques
├── lib/
│   ├── a2ui/                     # mini-SDK: stream NDJSON, catálogo, renderer
│   └── ui/theme.ts               # tokens de diseño (color, espacio, radio, tipografía)
├── scripts/emulator.js           # `npm run emulator -- <avd>` — levanta el emulador sin Android Studio
└── package.json / app.json / tsconfig.json
```

## Cómo fluye una pregunta

1. `client/` manda `POST /api/agent` con el mensaje del usuario (el stream
   lo maneja `lib/a2ui/useAgentStream.ts`).
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

## Deploy (Railway) — para usar la app desde el celular

`mcp-server/` no es un servicio aparte: `server/lib/mcp/mcp-client.ts` lo
levanta como proceso hijo por stdio (`tsx` corriendo `mcp-server/src/server.ts`),
asumiendo que vive como carpeta **hermana** de `server/` — igual que en local
con `npm run dev`. Por eso solo hay que hostear `server/`, pero la imagen
tiene que incluir `mcp-server/` completo al lado.

El repo ya trae `Dockerfile` + `.dockerignore` + `railway.json` en la raíz
para esto (multi-stage: instala ambos paquetes, corre `next build` en
`server/`, y en runtime hace `next start -p $PORT`).

**Pasos en Railway:**

1. New Project → Deploy from GitHub repo → selecciona este repo.
2. Root directory: la raíz del repo (`/`), NO `server/` — el build necesita
   ver `server/` y `mcp-server/` juntos. Railway detecta el `Dockerfile`
   solo (o usa `railway.json`, que ya lo fija explícito).
3. Variables de entorno del servicio (Settings → Variables), las mismas que
   `server/.env`:
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `OPENAI_API_KEY`
   - `DATABASE_URL` (la misma cadena de Supabase que usas en local)
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - **NO** pongas `AUTH_USUARIO_SIN_TOKEN` en producción — es el atajo de
     desarrollo que salta la verificación del token (ver
     `server/lib/auth/supabase.ts`); con él puesto, cualquiera que llegue al
     API lee y escribe como ese usuario fijo.
4. Deploy. Railway asigna una URL pública (`https://<algo>.up.railway.app`)
   y su propio `$PORT` — el `Dockerfile` ya lo respeta, no hay que tocar nada.
5. En `client/.env`, cambia `EXPO_PUBLIC_API_URL` a esa URL. **`expo start`
   solo lee `.env` una vez al arrancar** (ver Gotcha en `client/AGENTS.md`):
   mata el proceso de Expo y vuelve a correr `npm run web`/`npm run android`
   después de cambiarlo.
6. Desde el celular: `npx expo start` (o un build/APK) ya le habla al backend
   real en Railway en vez de `localhost` — funciona en cualquier red, no
   solo en la misma WiFi que la computadora.

No hace falta ninguna variable en build time: ninguna ruta de `server/`
prerrenderiza ni llama a Postgres/el LLM durante `next build` (todas son
`export const runtime = 'nodejs'`, dinámicas) — Railway las inyecta en
runtime y basta.

### `client/` en el navegador (web)

`client/Dockerfile` exporta la versión web (`expo export --platform web`,
react-native-web) como estático y lo sirve con `serve -s` (fallback SPA:
cualquier ruta que no sea un archivo real cae a `index.html`, y
`expo-router` resuelve del lado del cliente).

Es un servicio Railway APARTE del backend, con su propio `Dockerfile` en
`client/` (root directory de ese servicio: `client`, no la raíz del repo).

**Ojo, a diferencia de `server/`: aquí `EXPO_PUBLIC_API_URL` SÍ hace falta
en build time** — Expo la hornea dentro del bundle JS al momento de
exportar, no se lee después en runtime. Configúrala en Railway ANTES del
primer deploy, apuntando a la URL pública del backend (`https://<tu-backend>.up.railway.app`).
Si el backend cambia de URL, hay que volver a desplegar el cliente (no
basta con cambiar la variable).

CORS: `server/lib/http/cors.ts` ya permite `Access-Control-Allow-Origin: *`,
así que cualquier origen (incluido un dominio propio para el cliente) puede
llamar al backend sin configuración extra. Si agregas un método HTTP nuevo
a algún endpoint (además de GET/POST/PUT), agrégalo también en
`Access-Control-Allow-Methods` -- si no, el navegador bloquea la petición en
el preflight antes de que llegue a la ruta, y **curl no lo detecta** porque
CORS solo lo aplica el navegador (así se nos fue el PUT de editar perfil la
primera vez).

**Dominio propio:** en el servicio del cliente, Settings → Networking →
Custom Domain, agrega el dominio. Railway te da un CNAME (y un TXT de
verificación) para poner en tu proveedor de DNS. Si tu proveedor no permite
CNAME en la raíz del dominio (`@`) -- ninguno lo permite en realidad, es una
regla de DNS, no un límite de Railway -- usa un subdominio (`www.tudominio.com`)
y, si quieres que la raíz también funcione, configura ahí un "Domain
Forwarding"/redirect hacia el subdominio en vez de un CNAME.

## Siguiente bloque A2UI

1. Backend: Zod schema en `lib/ai/a2ui-schemas.ts` + tool en
   `lib/ai/a2ui-tools.ts` (llamando a una función de `lib/mcp/mcp-client.ts`,
   agregando una nueva si hace falta un dato distinto).
2. Cliente: componente nativo nuevo en `client/components/` + registrarlo en
   `client/lib/a2ui/catalog.ts` (una línea; el string debe ser idéntico al
   `tipo` que regresa la tool).

## Historial: qué se retiró

El repo tuvo antes un chat web hecho con `streamUI`/Server Actions de React
Server Components (`app/page.tsx`, `app/acciones/`, `components/generative/`,
`components/dashboard/`). Se eliminó por completo: RSC no es un cliente A2UI
real (manda JSX ya renderizado, no JSON — no lo puede interpretar React
Native), y el equipo decidió que `client/` (con soporte web vía
`react-native-web`) cubre toda superficie de UI necesaria, sin mantener dos
implementaciones en paralelo.
