# Constitución del proyecto — Banortech (Reto Banorte × Tec 2026)

> **Nombres:** **Banortech** es la aplicación; **Mosaico** es el agente de IA
> que vive dentro de ella. El login dice Banortech, la ventana de conversación
> dice Mosaico. No son sinónimos ni el rebranding de uno al otro.

Este documento es el contrato que **todas las ramas y todas las personas**
(o agentes de IA) trabajando en este repo deben respetar. No es documentación
de "cómo correr el proyecto" (eso vive en `README.md`) — es el conjunto de
reglas no negociables para que el trabajo en paralelo no diverja.

Si una decisión de diseño choca con algo escrito aquí, gana este documento.
Si de verdad hace falta romper una regla, se actualiza este archivo primero,
en un commit aparte, explicando por qué.

## 1. Por qué existe este proyecto (el reto real)

Viene del brief oficial (`docs/Reto_UI_Generativa_Banorte_Tec 1.pdf`). Lo que
se califica, en orden de peso:

| Criterio | Peso |
|---|---|
| Cumplimiento y utilidad para el usuario | 25% |
| Calidad y adaptabilidad de la UI generada | 20% |
| Calidad de la solución de IA | 15% |
| Arquitectura e ingeniería | 15% |
| UX y diseño | 10% |
| Innovación | 10% |
| Presentación | 5% |

**Lectura práctica de esto:** una demo bonita sin flujo real vale poco (45%
combinado va a "resuelve algo útil" + "UI que se adapta"), y la ingeniería
(15%) se evalúa por el uso correcto de LLM + MCP + A2UI, no por cuánto
código se escribió. El consejo del brief es literal: **"elijan un problema
pequeño y resuélvanlo completo"** — un flujo financiero real, de punta a
punta, vale más que cinco pantallas a medias.

## 2. Las tres piezas no negociables

Tomado directo del brief — cualquier solución tiene que tener estas tres
capas, sin excepción:

1. **LLM** — el modelo es el orquestador central. Decide qué mostrar y
   cuándo, nunca es un chatbot pegado a un lado.
2. **MCP** — la única fuente de datos financieros. El modelo **nunca**
   inventa cifras; todo dato numérico que se muestra viene de una tool de
   MCP (`mcp-server/`), aunque esa tool regrese datos sintéticos/mock.
3. **A2UI (o protocolo equivalente)** — el agente transmite **JSON
   declarativo**, nunca código ejecutable ni JSX ya renderizado. El cliente
   decide cómo pintarlo con su propio catálogo de componentes.

El ciclo se cierra: `Usuario → Agente/LLM → MCP → A2UI → Componentes`, y la
interacción del usuario con esa UI regresa al agente como contexto para el
siguiente turno.

## 3. Arquitectura del repo (dónde vive cada cosa)

```
server/     → el LLM + la API HTTP (POST /api/agent). Sin UI propia.
mcp-server/ → capa de datos (Postgres/mock), hablando protocolo MCP.
client/     → Expo/React Native. El ÚNICO cliente de UI (Android, iOS, web).
```

Un componente nuevo o una tool nueva **siempre** van en estos lugares:

- Schema del bloque (Zod) → `server/lib/ai/a2ui-schemas.ts`
- Tool que llama al MCP y regresa `{tipo, props}` → `server/lib/ai/a2ui-tools.ts`
- Componente nativo → `client/components/`

### 3.1 Persistencia de datos — qué va en cuál motor

Dos motores, cada uno con un dueño claro. No se mezclan ni se agrega un
tercero sin actualizar esto:

- **PostgreSQL (`mcp-server/`)** — fuente de verdad de todo lo que es
  "dato del usuario que importa que no se pierda y que el agente puede
  necesitar leer": datos bancarios (metas, transacciones, saldo) y la
  configuración de layout/dashboard que el usuario haya elegido. Vive en el
  servidor, se accede solo vía tools de MCP — nunca se lee/escribe directo
  desde `client/` ni desde `server/` sin pasar por `mcp-server/`.
- **SQLite local (`client/`, ej. `expo-sqlite`)** — el historial del chat
  con la IA. Vive **únicamente en el dispositivo**, nunca se sincroniza al
  servidor ni se sube a Postgres. Si el usuario cambia de teléfono o
  reinstala, pierde su historial — es una decisión aceptada, no un bug.

Regla derivada: mientras el historial de chat solo viva en SQLite local,
`server/app/api/agent/route.ts` sigue siendo *stateless* por diseño (no
recuerda turnos anteriores del lado del servidor). Si en algún momento se
quiere que el modelo tenga memoria de conversaciones pasadas, el cliente
tiene que mandar ese historial explícitamente en el body de cada request —
no se agrega un store de conversaciones en el servidor como atajo.

### 3.2 Rehidratación del dashboard — receta, nunca snapshot

Cuando el usuario "ancla" un bloque al dashboard (Paso 5, pendiente en
`client/`), la tentación es guardar el resultado ya resuelto (ej.
`{titulo: "Fondo de emergencia", porcentaje: 62}`). **No se hace así**: al
volver a abrir la app días después, ese 62% puede ya ser falso — un dato
financiero desactualizado, aunque nadie lo haya inventado.

En vez de eso, `dashboard_widgets` (Postgres, tabla en `mcp-server/`) guarda
la **receta** para regenerar el bloque, no el número:

```
{
  componente: 'RastreadorMetas',        -- nombre en el catálogo del cliente
  tool: 'mostrarProgresoMeta',          -- tool de server/lib/ai/a2ui-tools.ts a re-ejecutar
  parametros: { metaId: 'meta-1' },     -- lo que el modelo hubiera elegido
  mensajeAgente: '¡Vas por buen camino!', -- este sí se congela, es solo texto
}
```

Al rehidratar (ej. al iniciar sesión), el backend llama **directamente**
`tools[receta.tool].execute(receta.parametros)` — el mismo `execute` que ya
existe en `a2ui-tools.ts`, pero invocado por código, **sin pasar por el
modelo**. Eso trae el dato fresco del MCP en ese momento y regresa el mismo
`{tipo, props}` de siempre. El cliente lo pinta con el mismo catálogo/
`SurfaceRenderer` — no necesita saber que este bloque vino de una
rehidratación y no de una respuesta en vivo del agente.

**Por qué vive en Postgres y no en SQLite local:** a diferencia del
historial de chat (sección 3.1), el layout del dashboard sí debe sobrevivir
a un cambio de teléfono/reinstalación, y se rehidrata ejecutando código del
lado del servidor — necesita vivir donde el servidor lo pueda leer
directamente.

**Regla:** `dashboard_widgets.parametros` y `mensaje_agente` nunca
contienen un valor numérico resuelto (monto, porcentaje, saldo) — solo lo
necesario para volver a pedirlo. Si una tool nueva no se puede rehidratar
solo con sus `parameters` de Zod (ej. depende de más contexto), ese es un
problema de diseño de la tool, no algo que se resuelve guardando el número.

## 4. El contrato A2UI-lite (esto es lo que NO se rompe)

### 4.1 Formato de red

El backend responde NDJSON (una línea = un evento JSON). Tipos de evento
válidos, no se agregan otros sin actualizar este documento:

```
{"type":"text","content":"..."}
{"type":"surface","tipo":"<NombreComponente>","props":{...}}
{"type":"done"}
{"type":"error","message":"..."}
```

### 4.2 Contrato de una tool (`server/lib/ai/a2ui-tools.ts`)

Toda tool sigue esta forma exacta:

```ts
nombreDeTool: tool({
  description: '...',          // el modelo elige la tool SOLO por esto
  parameters: schemaDelBloque, // Zod — SOLO campos que el modelo debe elegir
  execute: async (args) => {
    const datos = await getAlgoDeMCP(userId, ...args); // MCP real, nunca mock inventado por el modelo
    return {
      tipo: 'NombreComponente' as const, // debe ser IGUAL al nombre registrado en el catálogo del cliente
      props: { /* datos reales + lo que el modelo redactó (ej. mensajeAgente) */ },
    };
  },
}),
```

Reglas:
- El modelo **nunca** recibe en su schema campos que representan datos duros
  (montos, porcentajes, listas de transacciones). Esos solo pueden salir de
  una llamada a `lib/mcp/mcp-client.ts`.
- El modelo sí controla: qué registro elegir (ej. `metaId`), parámetros de
  presentación (ej. `titulo`, `limite`), y `mensajeAgente` (contexto humano,
  una línea).
- `tipo` es un string literal, el mismo que usará el catálogo del cliente
  para elegir el componente. Cambiar un nombre de componente implica cambiar
  ambos lados a la vez.

### 4.3 Contrato de un componente (`client/components/`)

```tsx
export interface NombreComponenteProps {
  // props de datos específicas del bloque
  mensajeAgente: string; // SIEMPRE presente, en todo bloque
}

export function NombreComponente(props: NombreComponenteProps) {
  // Solo UI: View/Text/StyleSheet (o lo que decida el mini-SDK de diseño).
  // CERO lógica de red, CERO llamadas a MCP, CERO import de nada de server/.
}
```

Reglas:
- Un componente de bloque no hace `fetch`, no importa nada de `server/` ni
  de `lib/mcp`. Recibe props ya resueltas y se ve bonito — punto.
- El nombre del componente (export) y el string `tipo` que usa el backend
  para referenciarlo son el mismo texto exacto (`TarjetaSaldo` ↔
  `TarjetaSaldo`, no `tarjeta-saldo` ni `TarjetaDeSaldo`).
- Todo componente recibe `mensajeAgente: string` — es el espacio del agente
  para dar contexto humano, nunca se omite.

### 4.4 Patrón para tools de componentes genéricos (ej. `mostrarComponente`)

Un componente **genérico** (no atado a un dominio — ej. una gráfica que
sirve para metas, gastos, o lo que sea) no necesita una tool por dominio.
Puede existir una sola tool que:

1. Deja que el modelo elija **qué dato traer** y **qué componente usar**
   (enums), más texto libre para títulos/etiquetas/`mensajeAgente`.
2. Deja que el modelo decida **el acomodo** — orden, cuáles elementos
   mostrar, cuál va en cuál posición — pero **por referencia (`idDato`),
   nunca por valor**.
3. El código (`execute`) hace el `lookup` del valor real por ese `idDato` y
   lo inyecta en `props` — el valor numérico **nunca pasa por la
   generación de texto del modelo**, ni siquiera para "transportarlo".

```ts
mostrarComponente: tool({
  parameters: z.object({
    componente: z.enum(['GraficaBarras', 'GraficaPay', 'Lista' /* ... */]),
    titulo: z.string(),          // texto libre, lo redacta el modelo
    campos: z.array(z.object({
      idDato: z.string(),        // referencia (ej. "tarjeta-x"), NUNCA el monto
      etiqueta: z.string(),      // texto libre, lo redacta el modelo
    })),
    mensajeAgente: z.string(),
  }),
  execute: async ({ componente, titulo, campos, mensajeAgente }) => {
    const datosReales = await getAlgoDeMCP(userId); // ej. { "tarjeta-x": 4500, "tarjeta-y": 1200 }

    const items = campos.map((c) => ({
      label: c.etiqueta,
      value: datosReales[c.idDato], // inyectado por código, no por el modelo
    }));

    return { tipo: componente, props: { titulo, items, mensajeAgente } };
  },
}),
```

**Por qué por referencia y no por valor:** si el modelo tuviera que escribir
el número en su respuesta (aunque sea "solo para pasarlo"), está
retranscribiendo una cifra financiera generándola como texto — el mismo
riesgo de error/alucinación que la regla de la sección 4.2 ya prohíbe. Con
`idDato`, el modelo nunca "toca" el número; solo dice a qué referencia
corresponde cada posición.

**Prerrequisito de diseño:** los componentes genéricos que compartan este
patrón deben compartir una forma de props consistente (ej. todos los de
"tipo gráfica" reciben `{ titulo, items: [{label, value}], mensajeAgente }`)
para que una sola tool los pueda alimentar a todos sin una rama de código
distinta por cada uno. Esto se coordina con quien diseñe esos componentes
en `client/components/` (ver sección 5).

## 5. Reglas para trabajo en ramas paralelas

Ya integrado en `main`: el mini-SDK A2UI (`client/lib/a2ui/` — catálogo,
`SurfaceRenderer`, `useAgentStream`). **`client/App.tsx` ya no existe**: el
`switch` manual que vivía ahí lo reemplazó el catálogo, y la navegación la
maneja `expo-router` desde `client/app/`.

Frentes activos:

- `feature/dynamic-components` — construye componentes de UI nuevos,
  genéricos/reusables (ej. una gráfica de pastel que sirve para cualquier
  categoría de datos, no solo crédito o pagos).
- `feature/ui-layout` — las ventanas de la app (`client/app/`, expo-router)
  y el sistema de diseño del cliente (`client/lib/ui/theme.ts` +
  primitivas en `client/components/ui/`).

Para que las ramas se puedan juntar sin fricción:

1. **Todo componente nuevo sigue el contrato de la sección 4.3**, sin
   importar en qué rama se creó. Por eso registrarlo en el catálogo es una
   línea (`{ NombreComponente }` en el mapa) y no una reescritura.
2. **Toda tool nueva sigue el contrato de la sección 4.2** (dominio-específica)
   **o el de la 4.4** (genérica, tipo `mostrarComponente`). Un componente
   sin su tool correspondiente en `server/lib/ai/a2ui-tools.ts` no sirve de
   nada — el agente nunca lo puede invocar.
3. Registrar un componente nuevo es **una línea** en
   `client/lib/a2ui/catalog.ts` (el string debe ser idéntico al `tipo` que
   regresa la tool). No se toca `SurfaceRenderer`, ni `useAgentStream`, ni
   ninguna ventana de `client/app/` — si para agregar un bloque hace falta
   editar una ventana, algo se rompió del contrato.
4. Nombres de componentes y de `tipo` se coordinan **antes** de escribir
   código, no después — evita que dos personas nombren lo mismo distinto y
   choquen al mergear.
5. **Ventana ≠ bloque.** Lo que vive en `client/app/` (rutas) y en
   `client/components/ui/` (primitivas: `Pantalla`, `Tarjeta`, `Boton`...)
   NO es UI generativa: no va en el catálogo y no recibe `mensajeAgente`.
   Solo `client/components/*.tsx` (raíz) son bloques A2UI. Una ventana
   tampoco pinta cifras financieras por su cuenta — o las muestra vía un
   bloque que el agente generó, o muestra un estado vacío (sección 4.2).

## 6. Lo que NUNCA se hace

- Nunca se manda JSX, HTML ni código ejecutable del servidor al cliente
  (eso es lo que se retiró al eliminar el chat web viejo con RSC/streamUI).
- Nunca el modelo inventa un dato financiero (monto, porcentaje, fecha) que
  debería salir de `mcp-server/`.
- Nunca un componente de `client/components/` importa algo de `server/`.
- Nunca se agrega una dependencia de UI en `server/` (Tailwind, framer-motion,
  etc. — esa capa ya no tiene interfaz visual propia).

## 7. Historial de decisiones (por qué estamos aquí)

- El chat web original usaba `streamUI`/Server Actions de RSC — se retiró
  por completo porque manda JSX ya renderizado, un formato propietario que
  React Native no puede interpretar, y arquitectónicamente es lo opuesto a
  A2UI real (código servido vs. dato puro).
- No existe SDK oficial de A2UI para React Native (solo Web, Angular y
  Flutter al día de escribir esto) — por eso este repo construye su propio
  mini-SDK, cubierto explícitamente por el brief como "protocolo
  equivalente".
- El protocolo NDJSON de este repo manda cada bloque ya resuelto de una vez
  (no incremental componente-por-componente como el A2UI completo) — es un
  subconjunto fiel, no la versión con streaming granular. Documentarlo así
  en la entrega si se pregunta.
