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
hace fetch a Postgres ni al MCP directamente — solo habla HTTP con
`server/` (`POST /api/agent`, protocolo NDJSON, contrato en
`constitution.md` 4.1). Ningún componente en `components/` importa nada de
`server/` ni de `lib/mcp`.

## Dónde va cada cosa

- `App.tsx` — la pantalla del chat + el fetch/parseo del stream NDJSON +
  (por ahora) el `switch`/`if` que decide qué componente renderizar según
  `evento.tipo`. Este `switch` es temporal — lo reemplaza el catálogo
  genérico de `feature/mini-sdk-a2ui` (ver `constitution.md` sección 5).
- `components/` — los bloques de UI. Contrato exacto en `constitution.md`
  4.3: solo `View`/`Text`/`StyleSheet` (o lo que defina el mini-SDK de
  diseño), cero red, cero lógica de negocio, siempre reciben
  `mensajeAgente: string`.
- `scripts/emulator.js` + `scripts/lib/tools.js` — levantan un emulador
  Android (`npm run emulator -- <nombre-avd>`) sin necesidad de abrir
  Android Studio. Detectan el SDK vía `ANDROID_HOME`/`local.properties`/
  `%LOCALAPPDATA%\Android\Sdk`.

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

## Al agregar un componente nuevo

1. Componente en `components/NombreComponente.tsx`, contrato de la sección
   4.3 de `constitution.md`.
2. Tool correspondiente en `server/lib/ai/a2ui-tools.ts` (sin eso, el
   agente nunca puede invocar el componente — coordínalo con quien esté en
   `server/`).
3. Mientras no exista el catálogo genérico (`feature/mini-sdk-a2ui`):
   agregar el `case`/rama en `App.tsx` siguiendo el patrón de los 4 bloques
   existentes (`RastreadorMetas`, `TarjetaSaldo`, `ListaTransacciones`,
   `ComparativoGastos`).
