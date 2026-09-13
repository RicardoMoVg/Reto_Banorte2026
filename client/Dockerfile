# Build web estático de client/ (Expo + react-native-web) y lo sirve como
# SPA. `EXPO_PUBLIC_API_URL` se hornea DENTRO del bundle en build time (asi
# funciona Expo con variables EXPO_PUBLIC_*) -- no se puede cambiar despues
# sin rehacer el build. Railway pasa como build arg cualquier variable del
# servicio que coincida con un ARG declarado aqui.

FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

RUN npx expo export --platform web --output-dir dist

FROM node:20-slim AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist

# expo-router en modo "single" (SPA): cualquier ruta que no sea un archivo
# real cae a index.html y el router del cliente resuelve -- por eso el `-s`
# (single) de `serve`, sin el, recargar /chat o /perfil daria 404.
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
