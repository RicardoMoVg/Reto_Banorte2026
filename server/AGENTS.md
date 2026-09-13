# AGENTS.md — server/

Sigue las reglas de `../constitution.md` (secciones 2, 4.1, 4.2 y 4.4
aplican directo a este paquete). Esto de aquí son detalles internos propios
de `server/`.

## Qué es y qué NO es este paquete

Es un backend Next.js **sin UI propia**. Su ruta principal es
`POST /api/agent` (`app/api/agent/route.ts`, el camino del asistente de
IA/A2UI), pero **no es la única que puede existir**: acciones bancarias
tradicionales (login, una transferencia por formulario normal, etc. — ver
`constitution.md` 3.3) pueden vivir en otros route handlers REST normales
de Next.js, sin LLM ni protocolo NDJSON de por medio. Lo que nunca cambia:
no agregues páginas (`app/page.tsx`), layouts, CSS, ni ninguna dependencia
de UI (Tailwind, framer-motion, lucide-react, etc.) — eso es trabajo de
`client/`, no de aquí, sin importar cuántos route handlers tenga este
paquete.

## Dónde va cada cosa

- `lib/ai/system-prompt.ts` — personalidad/instrucciones del agente.
- `lib/ai/a2ui-schemas.ts` — un `z.object({...})` por bloque.
- `lib/ai/a2ui-tools.ts` — el catálogo de tools (contrato exacto en
  `constitution.md` 4.2). `buildA2uiTools(userId)` regresa el objeto que
  usa `streamText`.
- `lib/mcp/mcp-client.ts` — única puerta al MCP. No la dupliques ni la
  rodees; si necesitas un dato nuevo, agrega una función aquí que llame a
  `mcp-server/` (o cae a mock si no hay `DATABASE_URL`).
- `app/api/agent/route.ts` — el único route handler. Orquesta
  `streamText` + fallback de proveedores + conversión a NDJSON.

## Gotchas ya encontrados (no los repitas)

- **Generación de `@ai-sdk/*` debe coincidir.** `ai@4` usa
  `@ai-sdk/provider@1.x`. Antes de instalar un provider nuevo, verifica con
  `npm view @ai-sdk/<paquete>@<version> dependencies` que también use
  `@ai-sdk/provider` en la serie 1.x — si no, vas a tener el mismo bug que
  ya rompió el proyecto una vez (`@ai-sdk/rsc` v5 mezclado con `ai@4`).
  `@ai-sdk/openai` se fijó a `1.3.24` exacto por esto.
- **No uses alias de modelo (`gemini-flash-latest`).** Resuelve a modelos
  distintos con el tiempo, algunos con cuota gratuita minúscula (vimos 20
  requests/día). Usa un id explícito (`gemini-3.6-flash` al momento de
  escribir esto) y actualízalo a mano si Google lo deprecia.
- **El fallback Gemini→OpenAI solo reintenta si el proveedor falla ANTES de
  emitir contenido.** Un fallo a medio stream no se reintenta (evita
  duplicar contenido ya enviado al cliente). Si agregas un proveedor nuevo
  a la lista `PROVEEDORES` en `route.ts`, respeta ese mismo criterio.
- **No uses `command: 'npx'` en `StdioMCPTransport`** (ver README). En
  Windows `npx` es un `.cmd` y `child_process.spawn` no puede ejecutarlo
  sin `shell: true` (que `StdioConfig` no expone) — truena con
  `spawn npx ENOENT`. `getTools()` en `mcp-client.ts` invoca
  `process.execPath` sobre `tsx/dist/cli.mjs` directo; no lo regreses a
  `npx`.
- **CORS abierto (`Access-Control-Allow-Origin: '*'`)** en `route.ts` es
  intencional para dev (el cliente RN corre en otro origen). Endurecerlo
  antes de exponer este API fuera de la red local del equipo.

## Al agregar un bloque nuevo (dominio-específico)

1. Schema en `a2ui-schemas.ts`.
2. Tool en `a2ui-tools.ts`, llamando a una función de `mcp-client.ts`
   (agrega la función ahí si el dato no existe todavía).
3. Nada más — `route.ts` no cambia, ya es genérico sobre `buildA2uiTools`.

## Al conectar un componente genérico (ej. `feature/dynamic-components`)

No crees una tool nueva por cada componente genérico. Usa el patrón de
`constitution.md` 4.4 (`mostrarComponente` con `campos: [{idDato, etiqueta}]`):
el modelo elige componente + estructura por **referencia**, `execute` hace
el `lookup` del valor real por `idDato` y lo inyecta — **nunca dejes que el
modelo escriba el número en su propia respuesta**, ni para "solo pasarlo".
Si un componente nuevo necesita una forma de props distinta a
`{ titulo, items: [{label, value}], mensajeAgente }`, coordínalo primero
con quien lo esté diseñando en `client/` para no terminar con una rama de
`execute` por cada combinación dato×componente.
