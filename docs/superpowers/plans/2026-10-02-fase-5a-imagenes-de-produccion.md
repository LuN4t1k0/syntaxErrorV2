# Fase 5a: Imágenes de producción. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar la v2 lista para publicarse en Railway, con imágenes Docker de producción para web y worker, un paso de release antes de cada deploy y la configuración de Railway como código. El e2e pasa a probar esas mismas imágenes.

**Architecture:**
- **Web (`docker/web.Dockerfile`):**
  - Multi-stage: instala el workspace, compila Next en modo standalone y empaqueta el release.
  - La imagen final lleva solo:
    - el standalone (trazado desde la raíz del monorepo);
    - `.next/static` y `public`;
    - el contenido (`content/`, que la app lee en tiempo de ejecución);
    - las migraciones;
    - `release.mjs`.
  - Las `NEXT_PUBLIC_*` se fijan al compilar: llegan como `ARG`, igual que en Railway.
- **Release (`apps/web/src/db/release.ts`):**
  - Migra la base, sincroniza el contenido y, si hay `SEED_ADMIN_PASSWORD`, deja listo el admin.
  - Se empaqueta con esbuild en un solo archivo, sin `node_modules`.
  - En Railway corre como `preDeployCommand` del servicio web: si falla, el deploy no sigue.
- **Worker (`docker/worker.Dockerfile`):**
  - Se empaqueta con esbuild (`dist/index.mjs`), sin `tsx` en tiempo de ejecución, como pide el spec.
  - Dos dependencias quedan fuera del paquete y van en disco, con `pnpm deploy --prod`: `bullmq`, que lee sus scripts Lua desde disco, y `@sentry/node`, que carga módulos en tiempo de ejecución.
- **Las imágenes se prueban en local:**
  - `docker/compose.prod.yml` levanta release, web y worker con esas imágenes, contra el Postgres, el Redis y el Mailpit locales.
  - `npm run test:e2e` pasa a usarlo y reemplaza a `compose.prod-check.yml`, que compilaba con la imagen de desarrollo.
- **Railway como código:** `railway.web.json` (Dockerfile, healthcheck en `/api/health` y `node release.mjs` antes del deploy) y `railway.worker.json`.

**Tech Stack:** Docker multi-stage (node:22-bookworm-slim), Next.js 15 standalone, esbuild 0.28.2, pnpm 11 (`pnpm deploy`), Docker Compose (`!reset`, `!override`) y Railway config as code.

**Spec:** `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md`, secciones 13 (Deploy) y 14 (criterios de éxito: RAM del web bajo 512 MB y costo bajo $12 al mes).

**Decisión del 2026-10-02:** la v2 va en un **proyecto nuevo de Railway**, con su propio Postgres y su propio Redis, y no en el proyecto `syntaxError` de la v1 como decía el spec. Esta fase no toca Railway: solo deja las imágenes y su configuración. El despliegue y la migración de la v1 son las fases 5b y 5c.

## Global Constraints

**Copia literal:** cada archivo completo de este plan se copia exactamente como está, con sus comentarios. Antes de cada commit, compáralos con `diff`.

**Entorno**
- Todo se ejecuta con `docker compose run --rm tools ...`.
- El paquete de la app se llama `web`.
- `docker build` se corre desde la raíz del repositorio.

**Secretos**
- Ninguna imagen lleva `.env`: `.dockerignore` lo excluye.
- Los secretos llegan como variables en tiempo de ejecución.
- La única excepción es `SENTRY_AUTH_TOKEN`, que se usa al compilar para subir los sourcemaps. Docker lo advierte (`SecretsUsedInArgOrEnv`) y no queda en la imagen final.

**Imágenes**
- Corren con el usuario `node`, sin `tsx` ni dependencias de desarrollo en la etapa final.
- Límite de memoria de Node: 384 MB en web y 256 MB en worker.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Un deploy con una migración nueva:** `release.mjs` la aplica antes de que arranque la versión nueva. Si falla, Railway no la publica. Es idempotente: correrlo dos veces deja todo igual. Probado en `release.test.ts` y, empaquetado, en la Task 1, Step 5.
2. **Una página que consulta la base al compilar:** el build usa una `DATABASE_URL` que no lleva a ninguna base, así que fallaría al conectar en vez de compilar con datos de otra base. Comprobado al construir la imagen en la Task 2.
3. **Un secreto que se cuela en la imagen:** `.env` y `.env.*` están en `.dockerignore`. La Task 2, Step 6 revisa que la imagen no los tenga.
4. **La memoria del web después de mucho uso:** tras el e2e completo, web quedó en unos 264 MiB y worker en unos 89 MiB. La Task 3, Step 4 lo vuelve a medir.
5. **La CSP y la caché en la imagen real:** las páginas de los casos responden `x-nextjs-cache: HIT` y llevan CSP. Lo cubre el e2e (consolas, Pyodide) y la Task 3, Step 4.

## Estructura de archivos

```
packages/db/src/migrate.ts                 la carpeta de migraciones se puede indicar
apps/web/src/db/release.ts (+ test)        release: migrar, sincronizar contenido y admin
apps/web/src/db/release-cli.ts
apps/web/package.json                      release y release:build; esbuild
apps/worker/package.json                   build y start; esbuild
pnpm-workspace.yaml, pnpm-lock.yaml        msgpackr-extract sin scripts de instalación; esbuild
apps/web/next.config.ts                    outputFileTracingRoot
docker/web.Dockerfile, docker/worker.Dockerfile, .dockerignore
docker/compose.prod.yml                    las imágenes de producción en local
docker/compose.prod-check.yml              se elimina
scripts/e2e.sh                             el e2e corre contra las imágenes
railway.web.json, railway.worker.json
README.md
```

---

### Task 1: El release empaquetado

**Files:**
- Modify: `packages/db/src/migrate.ts`
- Create: `apps/web/src/db/release.ts`, `apps/web/src/db/release-cli.ts`
- Test: `apps/web/src/db/release.test.ts`
- Modify: `apps/web/package.json`, `apps/worker/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`

**Interfaces:**
- Produces:
  - `runMigrations(connectionString, migrationsFolder?)`;
  - `release(entorno: Record<string, string | undefined>, registrar?)`, que lee `DATABASE_URL`, `MIGRATIONS_DIR`, `CONTENT_DIR`, `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`;
  - los scripts `pnpm --filter web release` y `release:build` (genera `apps/web/dist/release.mjs`), y `pnpm --filter worker build` y `start` (`apps/worker/dist/index.mjs`).

- [ ] **Step 1: Escribir las pruebas**

`apps/web/src/db/release.test.ts`:
```ts
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { release } from "./release";

const { db, close } = createTestDb();
const CONTENIDO = fileURLToPath(new URL("../../../../content", import.meta.url));
const MIGRACIONES = fileURLToPath(new URL("../../../../packages/db/drizzle", import.meta.url));
const base = { DATABASE_URL: process.env.DATABASE_URL_TEST, MIGRATIONS_DIR: MIGRACIONES, CONTENT_DIR: CONTENIDO };

describe("release", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => close());

  it("migra, sincroniza el contenido y no crea el admin si no hay clave; repetirlo deja todo igual", async () => {
    const lineas: string[] = [];
    await release(base, (linea) => lineas.push(linea));
    await release(base, (linea) => lineas.push(linea));
    expect(lineas).toEqual(["[release] migraciones aplicadas", "[release] contenido: 2 rutas, 7 casos", "[release] migraciones aplicadas", "[release] contenido: 2 rutas, 7 casos"]);
    expect(await db.select().from(rutas)).toHaveLength(2);
    expect(await db.select().from(casos)).toHaveLength(7);
    expect(await db.select().from(users)).toEqual([]);
  });

  it("con SEED_ADMIN_PASSWORD deja listo el admin", async () => {
    await release({ ...base, SEED_ADMIN_EMAIL: "admin@syntaxerror.cl", SEED_ADMIN_PASSWORD: "clave-larga-de-prueba" }, () => {});
    expect(await db.select({ email: users.email, role: users.role }).from(users)).toEqual([{ email: "admin@syntaxerror.cl", role: "admin" }]);
  });

  it("sin DATABASE_URL falla antes de tocar nada", async () => {
    await expect(release({}, () => {})).rejects.toThrow("DATABASE_URL is not set");
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/db/release.test.ts`
Expected: FAIL, "Failed to resolve import ./release".

- [ ] **Step 3: Implementar**

`packages/db/src/migrate.ts` completo:
```ts
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// En producción las migraciones viajan junto al script empaquetado: ahí import.meta.url ya no apunta a este paquete.
const CARPETA_POR_DEFECTO = fileURLToPath(new URL("../drizzle", import.meta.url));

export async function runMigrations(connectionString: string, migrationsFolder = CARPETA_POR_DEFECTO): Promise<void> {
  const client = postgres(connectionString, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    await client.end();
  }
}
```

`apps/web/src/db/release.ts`:
```ts
import path from "node:path";
import { createDb } from "@syntaxerror/db/client";
import { runMigrations } from "@syntaxerror/db/migrate";
import { cargarContenido } from "@syntaxerror/content/cargar";
import { sincronizarContenido } from "@syntaxerror/content/sincronizar";
import { seedAdmin } from "./seed";

// Lee DATABASE_URL, MIGRATIONS_DIR, CONTENT_DIR, SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD.
export type EntornoRelease = Record<string, string | undefined>;

// Lo que corre antes de cada deploy, en orden: migra la base, sincroniza el contenido y, si hay clave, deja listo el admin.
// Cada paso es idempotente: correrlo dos veces deja todo igual.
export async function release(entorno: EntornoRelease, registrar: (linea: string) => void = console.log): Promise<void> {
  const url = entorno.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  await runMigrations(url, entorno.MIGRATIONS_DIR);
  registrar("[release] migraciones aplicadas");

  const { db, close } = createDb(url);
  try {
    const contenido = await cargarContenido(entorno.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content"));
    const resultado = await sincronizarContenido(db, contenido);
    registrar(`[release] contenido: ${resultado.rutas} rutas, ${resultado.casos} casos`);
    if (entorno.SEED_ADMIN_PASSWORD) {
      const email = entorno.SEED_ADMIN_EMAIL ?? "admin@local.test";
      await seedAdmin(db, { email, password: entorno.SEED_ADMIN_PASSWORD });
      registrar(`[release] admin listo: ${email}`);
    }
  } finally {
    await close();
  }
}
```

`apps/web/src/db/release-cli.ts`:
```ts
import { release } from "./release";

release(process.env).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
```

En `apps/web/package.json`:

1. Después de `db:seed`, agrega a `scripts`:
```json
    "release": "tsx src/db/release-cli.ts",
    "release:build": "esbuild src/db/release-cli.ts --bundle --platform=node --format=esm --target=node22 --outfile=dist/release.mjs --log-level=warning --banner:js=\"import{createRequire}from'node:module';const require=createRequire(import.meta.url);\""
```
2. Agrega `"esbuild": "0.28.2"` a `devDependencies`, en orden alfabético.

En `apps/worker/package.json`:

1. Después de `dev`, agrega a `scripts`:
```json
    "build": "esbuild src/index.ts --bundle --platform=node --format=esm --target=node22 --outfile=dist/index.mjs --external:bullmq --external:@sentry/node --log-level=warning --banner:js=\"import{createRequire}from'node:module';const require=createRequire(import.meta.url);\"",
    "start": "node dist/index.mjs",
```
2. Agrega `"esbuild": "0.28.2"` a `devDependencies`, en orden alfabético.

En `pnpm-workspace.yaml`, en `allowBuilds`, después de `esbuild: true`, agrega:
```yaml
  # Aceleración nativa opcional de msgpackr (dependencia de bullmq): sin ella usa JavaScript puro.
  msgpackr-extract: false
```
Sin esto, `pnpm install --frozen-lockfile` falla dentro de Docker (`ERR_PNPM_IGNORED_BUILDS`).

Actualiza el lockfile:

Run: `docker compose run --rm --no-deps tools pnpm install --no-frozen-lockfile`
Expected: `pnpm-lock.yaml` agrega esbuild 0.28.2 a web y worker (6 líneas).

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec vitest run src/db/release.test.ts && pnpm --filter web exec tsc --noEmit && pnpm --filter @syntaxerror/db exec tsc --noEmit"`
Expected: PASS (3 pruebas) y sin errores de tipos.

- [ ] **Step 5: Empaquetar y correr el release sin node_modules**

Run: `docker compose run --rm tools sh -c 'pnpm --filter web release:build && pnpm --filter worker build && mkdir -p /tmp/r && cp apps/web/dist/release.mjs /tmp/r/ && cd /tmp/r && DATABASE_URL=$DATABASE_URL_TEST MIGRATIONS_DIR=/app/packages/db/drizzle CONTENT_DIR=/app/content node release.mjs'`
Expected:
```
[release] migraciones aplicadas
[release] contenido: 2 rutas, 7 casos
```
Además, `apps/web/dist/release.mjs` (unos 2 MB) y `apps/worker/dist/index.mjs` (unos 3,4 MB). `dist/` ya está en `.gitignore`.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/migrate.ts apps/web/src/db apps/web/package.json apps/worker/package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(release): migrar, sincronizar contenido y admin en un solo script empaquetado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Las imágenes de producción

**Files:**
- Create: `docker/web.Dockerfile`, `docker/worker.Dockerfile`
- Modify: `.dockerignore`, `apps/web/next.config.ts`

**Interfaces:**
- Consumes: los scripts de la Task 1.
- Produces:
  - **La imagen web:**
    - `CMD node apps/web/server.js`, en el puerto `PORT` (3000 por defecto);
    - `node release.mjs` para el release;
    - `CONTENT_DIR=/app/content` y `MIGRATIONS_DIR=/app/drizzle`.
  - **La imagen worker:** `CMD node dist/index.mjs`, con el socket en `CHAT_SOCKET_PORT` (4001).
  - **Build args de la imagen web:** `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CHAT_SOCKET_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` y `CONTENT_INCLUDE_DRAFTS`.

- [ ] **Step 1: Trazar el standalone desde la raíz del monorepo**

En `apps/web/next.config.ts`, después de `output: "standalone",`, agrega:
```ts
  // En el monorepo, el standalone tiene que incluir los paquetes del workspace: se traza desde la raíz.
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
```

- [ ] **Step 2: Lo que no entra a la imagen**

`.dockerignore` completo:
```text
node_modules
**/node_modules
.next
**/.next
.git
e2e/node_modules
test-results
playwright-report
**/dist
graphify-out
.env
.env.*
!.env.example
```

- [ ] **Step 3: La imagen web**

`docker/web.Dockerfile`:
```dockerfile
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
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=build --chown=node:node /app/content ./content
COPY --from=build --chown=node:node /app/packages/db/drizzle ./drizzle
COPY --from=build --chown=node:node /app/apps/web/dist/release.mjs ./release.mjs
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

Run: `docker build -f docker/web.Dockerfile -t syntaxerror-web:prueba --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 --build-arg NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:4001 .`
Expected:
- termina sin errores, con una sola advertencia: `SecretsUsedInArgOrEnv` por `SENTRY_AUTH_TOKEN`;
- la imagen ocupa unos 110 MB de contenido.

- [ ] **Step 4: La imagen worker**

`docker/worker.Dockerfile`:
```dockerfile
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
```

Run: `docker build -f docker/worker.Dockerfile -t syntaxerror-worker:prueba .`
Expected: termina sin errores, con unos 97 MB de contenido.

- [ ] **Step 5: Revisar el contenido de las imágenes**

Run: `docker run --rm syntaxerror-worker:prueba sh -c "ls node_modules"`
Expected: `@sentry`, `@syntaxerror`, `bullmq`, `drizzle-orm`, `ioredis`, `nodemailer` y `socket.io`.

Run: `docker run --rm syntaxerror-web:prueba sh -c "ls; ls apps/web; whoami"`
Expected:
- en `/app`: `apps`, `content`, `drizzle`, `node_modules`, `package.json`, `packages` y `release.mjs`;
- en `apps/web`: `.next`, `node_modules`, `package.json`, `public` y `server.js`;
- el usuario es `node`.

- [ ] **Step 6: Sin secretos en la imagen**

Run: `for i in syntaxerror-web:prueba syntaxerror-worker:prueba; do docker run --rm $i sh -c 'find / -xdev \( -name ".env" -o -name ".env.local" \) 2>/dev/null | grep -v node_modules'; done; echo fin`
Expected: solo `fin`.

- [ ] **Step 7: Commit**

```bash
git add docker/web.Dockerfile docker/worker.Dockerfile .dockerignore apps/web/next.config.ts
git commit -m "feat(docker): imagenes de produccion de web (standalone) y worker (esbuild)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Probar las imágenes y configurar Railway

**Files:**
- Create: `docker/compose.prod.yml`, `railway.web.json`, `railway.worker.json`
- Delete: `docker/compose.prod-check.yml`
- Modify: `scripts/e2e.sh`, `README.md`

**Interfaces:**
- Consumes: las imágenes de la Task 2.
- Produces:
  - `docker/compose.prod.yml`, con los servicios `release`, `web` y `worker` sobre las imágenes `syntaxerror-web:local` y `syntaxerror-worker:local`;
  - `npm run test:e2e` contra esas imágenes;
  - `railway.web.json` y `railway.worker.json`, que se usan en la Fase 5c.

- [ ] **Step 1: Las imágenes en local**

`docker/compose.prod.yml`:
```yaml
# Levanta las imágenes de producción (docker/web.Dockerfile y docker/worker.Dockerfile) contra el Postgres, el Redis y
# el Mailpit locales: es lo mismo que se publica en Railway. Lo usa scripts/e2e.sh.
# Las imágenes no montan el código: !reset quita los volúmenes y el código de desarrollo heredados de docker-compose.yml.
services:
  release:
    image: syntaxerror-web:local
    build:
      context: .
      dockerfile: docker/web.Dockerfile
      args:
        NEXT_PUBLIC_SITE_URL: http://localhost:3000
        NEXT_PUBLIC_CHAT_SOCKET_URL: http://localhost:4001
        # La ruta Data Analyst sigue en borrador: las pruebas necesitan sus páginas.
        CONTENT_INCLUDE_DRAFTS: "true"
    working_dir: /app
    volumes: !reset []
    command: node release.mjs
    restart: "no"
    environment:
      DATABASE_URL: postgres://platform:platform@postgres:5432/platform_dev
      SEED_ADMIN_EMAIL: ${SEED_ADMIN_EMAIL:-admin@local.test}
      SEED_ADMIN_PASSWORD: ${SEED_ADMIN_PASSWORD:-admin123456}
    depends_on:
      postgres: { condition: service_healthy }

  web:
    image: syntaxerror-web:local
    build: !reset null
    working_dir: /app
    volumes: !reset []
    command: node apps/web/server.js
    environment:
      CI: !reset null
      NODE_OPTIONS: --max-old-space-size=384
      WATCHPACK_POLLING: !reset null
      CONTENT_INCLUDE_DRAFTS: "true"
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
      interval: 3s
      timeout: 5s
      retries: 60
    depends_on: !override
      release: { condition: service_completed_successfully }
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }

  worker:
    image: syntaxerror-worker:local
    build:
      context: .
      dockerfile: docker/worker.Dockerfile
    working_dir: /app
    volumes: !reset []
    command: node dist/index.mjs
    depends_on: !override
      release: { condition: service_completed_successfully }
      redis: { condition: service_healthy }
      mailpit: { condition: service_started }
```

`scripts/e2e.sh` completo:
```sh
#!/bin/sh
# Corre los e2e contra las imágenes de producción (docker/compose.prod.yml), que son las que se publican.
# Contra `next dev` la suite completa falla al azar: con muchas misiones, compilar al vuelo y 3 navegadores
# en paralelo satura el servidor (ECONNRESET, páginas que no responden). Para una prueba suelta en desarrollo
# está `npm run test:e2e:dev`.
#
# Al terminar deja `web` y `worker` otra vez en modo desarrollo, para seguir trabajando con recarga en vivo.
# Los argumentos se pasan a Playwright: npm run test:e2e -- tests/despachos.spec.ts
set -u
BASE="${COMPOSE_FILE:-docker-compose.yml}"
PRODUCCION="$BASE:docker/compose.prod.yml"

COMPOSE_FILE="$PRODUCCION" docker compose up -d --build --force-recreate --wait web worker || exit 1
if [ "$#" -gt 0 ]; then
  COMPOSE_FILE="$PRODUCCION" docker compose --profile e2e run --rm e2e npx playwright test "$@"
else
  COMPOSE_FILE="$PRODUCCION" docker compose --profile e2e run --rm e2e
fi
estado=$?
COMPOSE_FILE="$BASE" docker compose up -d --force-recreate web worker >/dev/null 2>&1
exit $estado
```

Run: `git rm docker/compose.prod-check.yml`

- [ ] **Step 2: Railway como código**

`railway.web.json`:
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "docker/web.Dockerfile"
  },
  "deploy": {
    "preDeployCommand": ["node release.mjs"],
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

`railway.worker.json`:
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "docker/worker.Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

- [ ] **Step 3: README**

En `README.md`:

1. La fila de `npm run test:e2e` en "Comandos" queda:
```markdown
| `npm run test:e2e` | Tests end-to-end con Playwright contra las imágenes de producción (`docker/compose.prod.yml`: las mismas que se publican, con la CSP real y las páginas estáticas): es la verificación que vale para publicar. Al terminar deja `web` y `worker` en modo desarrollo. Para correr solo algunas pruebas: `npm run test:e2e -- tests/despachos.spec.ts` |
```
2. Agrega al final:
```markdown
## Producción

- **Imágenes:** `docker/web.Dockerfile` y `docker/worker.Dockerfile`. Las dos se construyen desde la raíz del repositorio.
  - **Web:**
    - Next en modo standalone, más el contenido (`CONTENT_DIR=/app/content`) y las migraciones (`MIGRATIONS_DIR=/app/drizzle`).
    - `release.mjs` corre antes de cada deploy (`apps/web/src/db/release.ts`): migra la base y sincroniza el contenido. Si hay `SEED_ADMIN_PASSWORD`, también deja listo el admin. Es idempotente.
    - Las variables `NEXT_PUBLIC_*` se fijan al compilar: en Railway llegan como build args.
  - **Worker:** empaquetado con esbuild (`dist/index.mjs`), sin `tsx`. Solo `bullmq` y `@sentry/node` quedan como dependencias en disco.
- **Probarlas en local:** `npm run test:e2e` las construye y corre las pruebas contra ellas, con el Postgres, el Redis y el Mailpit locales.
- **Railway:** cada servicio usa su archivo de configuración: `railway.web.json` (healthcheck en `/api/health` y `node release.mjs` antes del deploy) y `railway.worker.json`.
- **Variables de web:**
  - `DATABASE_URL`, `REDIS_URL` y `AUTH_SECRET`;
  - `AUTH_URL` y `PLATFORM_ALLOWED_ORIGINS`, con el dominio público, y `AUTH_TRUST_HOST=true`;
  - `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`;
  - `CHAT_SOCKET_SECRET`, la misma del worker, y `GITHUB_TOKEN`;
  - al compilar: `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_CHAT_SOCKET_URL`, con el dominio del worker;
  - opcionales: `NEXT_PUBLIC_SENTRY_DSN` (con `SENTRY_ORG`, `SENTRY_PROJECT` y `SENTRY_AUTH_TOKEN` para los sourcemaps), y `SEED_ADMIN_EMAIL` con `SEED_ADMIN_PASSWORD`, solo en el primer deploy.
- **Variables del worker:**
  - `DATABASE_URL`, `REDIS_URL` y `CHAT_SOCKET_SECRET`;
  - `APP_URL`, con el dominio público;
  - `GEMINI_API_KEY`, `RESEND_API_KEY` y `EMAIL_FROM`;
  - `CHAT_SOCKET_PORT` (4001), que es el puerto del dominio público del worker para el socket del tutor;
  - opcional: `SENTRY_DSN`.
```

- [ ] **Step 4: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes (602 pruebas; web 333).

Run: `npm run test:e2e`
Expected:
- construye las dos imágenes, corre el release (`syntaxerror-release-1 Exited`) y da `39 passed`;
- dos corridas seguidas deben dar lo mismo;
- la primera tarda unos 2 minutos más, por la compilación.

Mide la memoria y la caché con las imágenes arriba:

Run: `docker compose -f docker-compose.yml -f docker/compose.prod.yml up -d --wait web worker && docker compose -f docker-compose.yml -f docker/compose.prod.yml --profile e2e run --rm e2e && docker stats --no-stream --format "{{.Name}} {{.MemUsage}}" | grep -E "web|worker" && curl -s -D - -o /dev/null localhost:3000/casos/proyecto-final | grep -iE "x-nextjs-cache|content-security-policy" ; docker compose up -d --force-recreate web worker`
Expected:
- `39 passed`;
- web bajo 400 MiB y worker bajo 150 MiB;
- `x-nextjs-cache: HIT` y una línea `content-security-policy`;
- al final, web y worker vuelven a modo desarrollo.

- [ ] **Step 5: Commit**

```bash
git add docker/compose.prod.yml railway.web.json railway.worker.json scripts/e2e.sh README.md
git commit -m "test(e2e): las pruebas corren contra las imagenes de produccion; railway como codigo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Fase 5b: migración desde la v1** (`scripts/migrar-v1.ts`, spec sección 10), probada contra una copia del esquema de la v1:
- **Usuarios y cuentas:** se mantienen el mismo `id`, el mismo hash de contraseña, las mismas cuentas de Google y el mismo rol.
- **Certificados:** pasan a `certificados_legacy`, para que `/verificar/<código>` siga funcionando con las URLs que ya circulan.
- **Puntos, bitácora y registros ARCO:** se copian.
- **Informe final:** cuántos registros se copiaron y cuántos se omitieron, con la razón.

**Fase 5c: publicar en Railway.** Se hace con el MCP y con tu confirmación en cada paso:
1. crear el proyecto, con Postgres (pgvector), Redis, web y worker conectados al repositorio de GitHub;
2. cargar las variables, generando un `AUTH_SECRET` y un `CHAT_SOCKET_SECRET` nuevos;
3. dar los dominios;
4. correr la migración desde la base de la v1;
5. verificar los criterios de éxito del spec.
