# Imagen de producción del worker: el código empaquetado con esbuild y solo las dependencias que quedan fuera del
# paquete (bullmq lee sus scripts Lua desde disco y Sentry carga módulos en tiempo de ejecución).
FROM node:22-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter worker build && pnpm --filter worker deploy --prod --legacy /out && cp -r apps/worker/dist /out/dist

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    CHAT_SOCKET_PORT=4001 \
    NODE_OPTIONS=--max-old-space-size=256
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4001
CMD ["node", "dist/index.mjs"]
