# Imagen de producción de la app: Next en modo standalone, el contenido y el script de release empaquetado.
FROM node:22-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# Las variables NEXT_PUBLIC_* se escriben en el código del navegador al compilar: se pasan como build args.
# En Railway, cada variable del servicio llega como build arg si está declarada aquí.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CHAT_SOCKET_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
# Solo para probar la imagen con la ruta en borrador (e2e). En producción queda vacío.
ARG CONTENT_INCLUDE_DRAFTS
ENV NEXT_TELEMETRY_DISABLED=1
# Auth.js crea el cliente de la base al cargar su configuración, pero el build no consulta la base: se le da una
# dirección donde no hay nada. Si una página intentara consultarla al compilar, el build fallaría al conectar.
RUN DATABASE_URL=postgres://build:build@127.0.0.1:1/sin-base REDIS_URL=redis://127.0.0.1:1 pnpm --filter web build \
  && pnpm --filter web release:build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    CONTENT_DIR=/app/content \
    MIGRATIONS_DIR=/app/drizzle \
    NODE_OPTIONS=--max-old-space-size=384
# Node cierra las conexiones inactivas a los 5 s; un proxy (Railway) o un cliente que las reutiliza puede enviar justo
# cuando se cierran y recibe ECONNRESET. Con más tiempo, cierra primero el que está adelante.
ENV KEEP_ALIVE_TIMEOUT=65000
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=build --chown=node:node /app/content ./content
COPY --from=build --chown=node:node /app/packages/db/drizzle ./drizzle
COPY --from=build --chown=node:node /app/apps/web/dist/release.mjs ./release.mjs
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
