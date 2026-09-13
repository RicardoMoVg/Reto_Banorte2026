# AGENTS.md — client/

Sigue las reglas de `../constitution.md` (sección 2, la pieza "A2UI", y
sobre todo la sección 4.3 y la 5 si estás en `feature/dynamic-components` o
`feature/mini-sdk-a2ui`). Esto de aquí son detalles internos propios de
`client/`.

## ⚠️ Expo cambió — lee esto antes de escribir código

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/
before writing any code. Las APIs de Expo (`expo/fetch`, config de
`app.json`, etc.) cambian entre versiones mayores — no asumas nada de
memoria/entrenamiento, confirma contra la versión instalada (`57.0.0`, ver
`package.json`).

## Qué es y qué NO es este paquete

Es el único cliente de UI (Android, iOS, web vía `react-native-web`). No
hace fetch a Postgres ni al MCP directamente — siempre habla HTTP con
`server/`. Eso sí, no todo pasa por `POST /api/agent` (NDJSON, contrato en
`constitution.md` 4.1): pantallas de banca tradicional (login, una
transferencia por formulario normal, etc. — ver `constitution.md` 3.3)
pueden llamar a otros endpoints REST normales de `server/`, sin pasar por
el agente. Ningún componente en `components/` importa nada de `server/` ni
de `lib/mcp` — eso aplica igual sin importar a qué endpoint le hable la
pantalla.

## Dónde va cada cosa

**Ya no existe `App.tsx`.** La navegación es `expo-router` (file-based), así
que el entry point es `"main": "expo-router/entry"` en `package.json` y la
estructura de `app/` ES el mapa de rutas:

```
app/
├── _layout.tsx           # layout raíz: providers + <Stack> con las rutas protegidas. No UI.
├── login.tsx             # Inicio de sesión → "/login"   (sin sesión, es lo único alcanzable)
├── editar-perfil.tsx     # Editar perfil   → "/editar-perfil"
└── (tabs)/
    ├── _layout.tsx       # el tab bar (las tres ventanas)
    ├── index.tsx         # Inicio  → "/"
    ├── chat.tsx          # Mosaico → "/chat" (lo que antes era App.tsx)
    └── perfil.tsx        # Perfil  → "/perfil"
```

Las dos rutas fuera de `(tabs)/` lo están por razones distintas: `login`
porque el tab bar no debe existir sin sesión, y `editar-perfil` porque se
abre ENCIMA de las pestañas (se llega solo por el botón de Perfil y se sale
con la flecha de regreso). Una ventana que sí sea un destino permanente va
dentro de `(tabs)/`.

- `lib/ui/theme.ts` — tokens de diseño (color, espacio, radio, tipografía).
  Única fuente de verdad del look; no hardcodees hex nuevos.
- `components/ui/` — primitivas genéricas de la app (`Pantalla`,
  `PantallaMarca`, `CampoMarca`, `Tarjeta`, `Boton`, `Chip`, `EstadoVacio`).
  **No son bloques A2UI** y no van en el catálogo. `CampoMarca` es el campo
  de texto de las ventanas de degradado: trae etiqueta, error por campo y el
  anillo de foco; no escribas un `<TextInput>` suelto ahí.
- `components/` (raíz) — los bloques A2UI **informativos**. Contrato exacto
  en `constitution.md` 4.3: solo `View`/`Text`/`StyleSheet`, cero red, cero
  lógica de negocio, siempre reciben `mensajeAgente: string`.
- `components/chat/` — los bloques A2UI **de acción**: proponen algo que el
  usuario acepta o rechaza, y su respuesta vuelve al agente. Contrato en
  `components/chat/tipos.ts`; van al mismo catálogo que los informativos.
  Siguen sin hacer red: el handler les llega por contexto
  (`lib/a2ui/AccionesProvider.tsx`) porque una función no se puede
  serializar dentro del JSON del protocolo.
- `lib/sesion/` — estado de sesión y datos del titular (`SesionProvider`,
  `useSesion`, `perfilDemo.ts`). **No es autenticación**: el backend no tiene
  auth y usa un `userId` fijo. Cualquier credencial entra, la contraseña no
  se guarda en ningún lado, y ni la sesión ni el perfil editado se
  persisten. Lee el comentario de `SesionProvider.tsx` antes de tocarlo.
  El perfil que leen las ventanas es `perfil` del provider, NO la constante
  `PERFIL_DEMO` — esa es solo la semilla, y usarla directo hace que la
  pantalla ignore lo que el usuario editó.
- `lib/a2ui/` — el mini-SDK: `useAgentStream` (fetch + parseo NDJSON),
  `AgentProvider` (monta un único stream en la raíz para que la conversación
  sobreviva al cambio de pestaña), `catalog.ts` y `SurfaceRenderer`.
- `scripts/emulator.js` + `scripts/lib/tools.js` — levantan un emulador
  Android (`npm run emulator -- <nombre-avd>`) sin necesidad de abrir
  Android Studio. Detectan el SDK vía `ANDROID_HOME`/`local.properties`/
  `%LOCALAPPDATA%\Android\Sdk`.

### Reglas de las ventanas

- Una ventana nueva = un archivo en `app/(tabs)/` + su `<Tabs.Screen>` en
  `app/(tabs)/_layout.tsx`. Si no debe salir en el tab bar, va en `app/`
  fuera del grupo `(tabs)`.
- Toda ventana se envuelve en uno de los dos marcos, nunca en un `<View>`
  pelón: ambos resuelven safe area, encabezado y ancho máximo (sin ese
  límite, en web la app se estira a lo ancho del monitor).
  - `<Pantalla>` — ventanas de contenido claro sobre `colores.fondo`
    (Mosaico).
  - `<PantallaMarca>` — ventanas de marca sobre el degradado menta→azul
    (Login, Inicio, Perfil). Todo el **texto suelto** va en blanco y las
    superficies translúcidas salen de `vidrio.*`; los estilos de
    `tipografia` (grises sobre claro) no se leen aquí.

  Los bloques A2UI funcionan en ambos marcos sin cambios: cada uno trae su
  propio fondo opaco, así que sobre el degradado se ven como tarjetas
  blancas flotando — es justo el efecto del diseño de Inicio.
- El estado del agente se lee con `useAgent()`, nunca llamando
  `useAgentStream()` de nuevo — habría dos conversaciones distintas.
- **Ninguna ventana pinta una cifra financiera que no venga de un bloque
  A2UI.** Si la sección todavía no tiene de dónde sacar el dato, va un
  `<EstadoVacio>`, no un número de ejemplo (`constitution.md` 4.2 y 6).
- Una ventana que deba quedar detrás del login se agrega dentro del
  `<Stack.Protected guard={!!sesion}>` de `app/_layout.tsx`. Ese es el
  mecanismo de expo-router para esto: una pantalla con el guard en `false`
  no existe para el navegador. **No uses el patrón viejo de `useEffect` +
  `router.replace`** — alcanza a pintar un frame de la pantalla protegida
  antes de redirigir.

### Paleta de marca

`lib/ui/theme.ts` tiene dos colores de marca y no son intercambiables:

- `colores.marca` (`#060761`, azul profundo) — primario sobre superficies
  **claras**: texto de acciones, iconos activos, rellenos sobre blanco.
- `colores.acento` (`#41FFA7`, menta) — relleno de la acción principal sobre
  fondos **oscuros** y acento de progreso. Nunca lleva texto blanco encima
  (contraste 1.5:1); el único color legible encima es `textoSobreAcento`.
- `vidrio.*` — superficies translúcidas, solo válidas dentro de
  `<PantallaMarca>` (el degradado). Fuera de ahí no se leen. Usa
  `vidrio.campo` (el azulado) y no `vidrio.fondo` (el claro) cuando encima
  vaya texto: oscurece el tramo medio del degradado, que es donde el blanco
  pierde contraste.

Los cuatro bloques A2UI de `components/` ya no tienen ningún hex: toman todo
de estos tokens. En barras y gráficas el relleno va en `marca` (azul) sobre
una pista en `marcaSuave` (tinte menta) — el menta sólido como relleno daría
1.4:1 contra la pista, por debajo del 3:1 que pide WCAG para elementos
gráficos con significado.

Pendiente conocido: esos bloques siguen repitiendo a mano el estilo de
tarjeta (borde, radio, padding) en vez de usar la primitiva `<Tarjeta>`. Esa
migración se dejó fuera para no chocar con las ramas que los están tocando
en paralelo (`constitution.md` 5).

## Gotcha ya encontrado (no lo repitas)

**`client/.env` no se recarga solo.** `expo start` lo lee una sola vez al
arrancar. Si cambias `EXPO_PUBLIC_API_URL` (típicamente al pasar de probar
en web a probar en el emulador Android, o viceversa — `localhost` vs.
`10.0.2.2` vs. la IP de LAN), tienes que:
1. Matar el proceso de `expo start` que esté corriendo.
2. Volver a correr `npm run web` / `npm run android`.
3. Forzar recarga de la app (`adb shell am force-stop host.exp.exponent`
   + reabrir el link `exp://...`, o el equivalente en iOS).

Si no haces esto, la app le sigue pegando a la URL vieja **en silencio, sin
ningún error visible** — así se perdió bastante tiempo de debug la primera
vez.

## Las dos familias de bloques

|  | Informativo (`components/`) | De acción (`components/chat/`) |
|---|---|---|
| Qué hace | Muestra un dato | Propone algo que se acepta o rechaza |
| Dónde vive | Chat **y** tablero de Inicio | Solo en el chat |
| Interacción | Ninguna | `PieDeAccion` → vuelve al agente |
| Props extra | — | `idAccion`, `etiqueta` (ver `chat/tipos.ts`) |

Inicio excluye los de acción con `esBloqueDeAccion()`: una propuesta es un
momento de una conversación, no un dato que tenga sentido fijar en el
tablero. **Si agregas un bloque de acción, súmalo a `BLOQUES_DE_ACCION`** o
se va a colar al tablero.

⚠️ Aceptar **no guarda nada**: `mcp-server/` solo tiene tools de lectura.
Los componentes lo dicen en pantalla y el system prompt se lo prohíbe al
modelo. El día que exista una tool de escritura, el único lugar que cambia
es `responder()` en `lib/a2ui/AccionesProvider.tsx`.

## Al agregar un componente nuevo

1. Componente en `components/NombreComponente.tsx` (informativo) o
   `components/chat/` (de acción), contrato de la sección 4.3 de
   `constitution.md`.
2. Tool correspondiente en `server/lib/ai/a2ui-tools.ts` (sin eso, el
   agente nunca puede invocar el componente — coordínalo con quien esté en
   `server/`).
3. Registrarlo en `lib/a2ui/catalog.ts` — una línea, el string debe ser
   idéntico al `tipo` que regresa la tool. No se toca `SurfaceRenderer`,
   ni `useAgentStream`, ni ninguna ventana.

## Componentes genéricos (ej. `feature/dynamic-components`)

Si el componente es genérico (sirve para cualquier categoría de datos, no
un dominio fijo — ej. una gráfica reusable), lo va a alimentar una tool tipo
`mostrarComponente` (`constitution.md` 4.4), no una tool dedicada. Para que
una sola tool pueda alimentar a varios componentes genéricos sin una rama de
código por cada uno, **todos los que sean del mismo "tipo" de visual**
(gráficas, listas, etc.) deben aceptar la misma forma de props, por ejemplo:

```ts
interface ComponenteGenericoProps {
  titulo: string;
  items: { label: string; value: number }[];
  mensajeAgente: string;
}
```

Si vas a crear varios componentes genéricos, define y documenta esa forma
compartida **antes** de escribir el primero, y avisa en `server/` qué forma
quedó — así la tool `mostrarComponente` sabe cómo darle forma a los datos
sin importar cuál de tus componentes elija el modelo.
