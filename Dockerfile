# Despliega `server/` (Next.js) para Railway. `mcp-server/` NO es un
# servicio aparte -- `server/lib/mcp/mcp-client.ts` lo levanta como proceso
# hijo por stdio (`tsx` corriendo `mcp-server/src/server.ts`), asumiendo que
# vive como carpeta HERMANA de `server/` (misma relación que en local con
# `npm run dev`). Por eso esta imagen copia ambos paquetes completos, no
# solo `server/`.
#
# `client/`, `docs/`, `agente/` y `scripts/` no entran a la imagen -- ver
# .dockerignore. El build context es la raíz del repo (Railway debe
# apuntar su "root directory" ahí, no a `server/`).

FROM node:20-slim AS deps
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
COPY mcp-server/package.json mcp-server/package-lock.json ./mcp-server/
# npm ci normal (sin --omit=dev): mcp-server corre con `tsx` en producción
# (no tiene paso de build propio, ver mcp-server/package.json "start"), y
# tsx vive en devDependencies.
RUN npm --prefix server ci
RUN npm --prefix mcp-server ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/mcp-server/node_modules ./mcp-server/node_modules
COPY server ./server
COPY mcp-server ./mcp-server
# Las API keys/DATABASE_URL NO hacen falta en build time -- ninguna ruta
# hace prerender ni llama a Postgres/LLM durante `next build` (todas son
# `export const runtime = 'nodejs'`, dinámicas). Railway las inyecta luego,
# en runtime.
RUN npm --prefix server run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/server ./server
COPY --from=builder /app/mcp-server ./mcp-server
WORKDIR /app/server

# Railway asigna $PORT en runtime -- next start debe escucharlo, no el
# 3000 fijo de local.
CMD ["sh", "-c", "npx next start -p ${PORT:-3000}"]
