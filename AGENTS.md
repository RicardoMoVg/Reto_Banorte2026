# AGENTS.md — Mosaico

Este repo es un monorepo simple de 3 paquetes Node independientes, cada uno
con su propio `package.json` y su propio `AGENTS.md` con reglas internas:

```
server/     → AGENTS.md propio (LLM + API HTTP)
mcp-server/ → AGENTS.md propio (capa de datos)
client/     → AGENTS.md propio (Expo/React Native)
```

**Antes de tocar código en cualquiera de los tres, lee `constitution.md`**
en la raíz — es el contrato no negociable (arquitectura LLM/MCP/A2UI,
formato del protocolo, contrato de tools y componentes, reglas para ramas
en paralelo). El `AGENTS.md` de cada paquete asume que ya lo leíste y solo
agrega detalles internos de ese paquete específico.

## Reglas generales de todo el repo

- Nunca hay un `package.json` en la raíz — cada comando (`npm install`,
  `npm run dev`, `tsc`, etc.) se corre DENTRO de `server/`, `mcp-server/` o
  `client/`, nunca desde la raíz.
- `agente/` es un prototipo huérfano preexistente, no conectado a nada
  actual — no lo modifiques ni lo borres sin que el equipo lo confirme.
- El dato financiero que se muestra en cualquier UI SIEMPRE sale de
  `mcp-server/` (real o mock) — nunca lo genera el modelo. Ver
  `constitution.md` sección 4.2.
- Nunca se manda JSX/código ejecutable entre servidor y cliente — solo JSON
  declarativo. Ver `constitution.md` sección 2 y 6.
