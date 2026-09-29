# Fase 1: Fundación. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el monorepo de syntaxError v2 corriendo 100% en Docker con `npm run dev` / `npm run stop`, con base de datos, identidad visual, sitio público, registro, login (credenciales y Google) y un worker listo para recibir colas.

**Architecture:**
- Monorepo pnpm con `apps/web` (Next.js 15), `apps/worker` (Node + socket.io), `packages/db` (Drizzle) y `packages/ui` (tokens y componentes base).
- Todo se ejecuta en contenedores. El host solo usa `npm` para invocar `docker compose`.
- `node_modules` vive en volúmenes Docker. El código se monta como bind mount con hot reload.

**Tech Stack:** Node 22, pnpm 11.9.0, Next.js 15, React 19, TypeScript 5, Tailwind 4, Auth.js v5 (`next-auth@5.0.0-beta.31`), Drizzle ORM 0.36 + drizzle-kit 0.28, postgres-js 3.4, Postgres 16 (pgvector), Redis 7, ioredis 5.10.1, rate-limiter-flexible 11, socket.io 4.8, Vitest 4, Playwright 1.55, Docker Compose v2.24+.

**Spec:** `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md` (secciones 5, 6, 9 [Cuentas y Seguridad] y 16 [Fase 1]).

## Global Constraints

- Directorio de la v1 (fuente del código que se porta): `V1=/Users/cristianvenegas/Documents/desarrollo/cursos`.
- En el host solo se necesitan Docker y npm. Ningún paso del plan ejecuta `pnpm` o `node` en el host: todo pasa por `docker compose run --rm tools ...`.
- `npm run dev` levanta `postgres`, `postgres-test`, `redis`, `mailpit`, `db-setup`, `web` y `worker`. `npm run stop` ejecuta `docker compose down`. `npm run reset` ejecuta `docker compose down -v`. `npm test` corre los tests en contenedores contra `postgres-test`.
- Puertos: web en `3000`, Mailpit en `8025` (SMTP en `1025`), Postgres en `5432` y `5433` (test), Redis en `6379` y socket del worker en `4001`.
- Nombres de paquetes: `@syntaxerror/db`, `@syntaxerror/ui`, `web`, `worker` y `e2e`.
- Todo el texto visible para el alumno va en español de Chile (tú, no voseo).
- Cada paquete nuevo con dependencias propias agrega su volumen `node_modules` a la lista `x-node.volumes` de `docker-compose.yml`.
- Las conexiones a Postgres y Redis se reutilizan con un singleton en `globalThis`: el hot reload de Next.js no debe abrir conexiones nuevas en cada recarga.
- Sentry, las colas de email y el resto de las funciones de plataforma quedan fuera de esta fase (fases 3 y 5).
- Commits: mensajes en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Email con mayúsculas o espacios:** registrar `  Ana@Correo.CL ` y luego intentar `ana@correo.cl` debe dar 409, y el login debe funcionar con cualquiera de las dos formas. Test en Task 6.
2. **Redis caído:** login y registro deben fallar rápido con error, no quedarse colgados. Hoy ioredis con `maxRetriesPerRequest: null` encola comandos para siempre. Test en Task 5.
3. **`npm run dev` repetido** (o después de `stop`): `db-setup` debe ser idempotente, sin admin duplicado ni error de migración. Test en Task 7.
4. **Clon limpio sin `.env`:** `npm run dev` debe funcionar solo con los valores por defecto de `docker-compose.yml`. Verificación en Task 9.
5. **Hot reload en macOS:** editar un `.tsx` en el host debe recargar la página sin reiniciar el contenedor (`WATCHPACK_POLLING`). Verificación en Task 9.

---

### Task 1: Monorepo y entorno Docker base

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.dockerignore`, `.env.example`, `tsconfig.base.json`, `docker/dev.Dockerfile`, `docker-compose.yml`
- Generated: `pnpm-lock.yaml`

**Interfaces:**
- Produces:
  - servicio `tools` para ejecutar cualquier comando: `docker compose run --rm tools <cmd>`;
  - ancla YAML `x-node`, que reutilizan `deps`, `tools`, `db-setup`, `web` y `worker`;
  - URLs internas: `postgres:5432/platform_dev`, `postgres-test:5432/platform_test` y `redis:6379`.

- [ ] **Step 1: Crear `package.json` raíz**

```json
{
  "name": "syntaxerror-v2",
  "private": true,
  "packageManager": "pnpm@11.9.0",
  "scripts": {
    "dev": "docker compose up -d --build --remove-orphans && docker compose logs -f web worker",
    "stop": "docker compose down",
    "reset": "docker compose down -v --remove-orphans",
    "logs": "docker compose logs -f",
    "sh": "docker compose run --rm tools bash",
    "test": "docker compose run --rm tools pnpm -r --if-present test",
    "test:e2e": "docker compose --profile e2e run --rm e2e",
    "db:generate": "docker compose run --rm tools pnpm --filter @syntaxerror/db generate"
  }
}
```

- [ ] **Step 2: Crear `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "e2e"
storeDir: /pnpm/store
onlyBuiltDependencies:
  - esbuild
  - sharp
allowBuilds:
  esbuild: true
  sharp: true
```

- [ ] **Step 3: Crear `.gitignore`, `.dockerignore`, `.env.example` y `tsconfig.base.json`**

`.gitignore`:
```
node_modules/
.next/
dist/
coverage/
playwright-report/
test-results/
*.tsbuildinfo
.DS_Store
.env
.env.*
!.env.example
*.log
```

`.dockerignore`:
```
node_modules
**/node_modules
.next
**/.next
.git
```

`.env.example` (opcional: `docker-compose.yml` ya trae valores por defecto para desarrollo):
```
# Copia a .env solo si necesitas sobrescribir algo en local.
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
SEED_ADMIN_EMAIL=admin@local.test
SEED_ADMIN_PASSWORD=admin123456
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

- [ ] **Step 4: Crear `docker/dev.Dockerfile`**

```dockerfile
FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl openssl \
  && rm -rf /var/lib/apt/lists/*
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g corepack@latest && corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app
```

- [ ] **Step 5: Crear `docker-compose.yml`**

```yaml
name: syntaxerror

x-node: &node
  build:
    context: .
    dockerfile: docker/dev.Dockerfile
  image: syntaxerror-dev:latest
  working_dir: /app
  env_file:
    - path: .env
      required: false
  environment: &node-env
    CI: "true"
    DATABASE_URL: postgres://platform:platform@postgres:5432/platform_dev
    DATABASE_URL_TEST: postgres://platform:platform@postgres-test:5432/platform_test
    REDIS_URL: redis://redis:6379
  volumes:
    - .:/app
    - node_modules:/app/node_modules
    - pnpm_store:/pnpm/store

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: platform
      POSTGRES_PASSWORD: platform
      POSTGRES_DB: platform_dev
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U platform -d platform_dev"]
      interval: 2s
      timeout: 3s
      retries: 30

  postgres-test:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: platform
      POSTGRES_PASSWORD: platform
      POSTGRES_DB: platform_test
    ports: ["5433:5432"]
    tmpfs: [/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U platform -d platform_test"]
      interval: 2s
      timeout: 3s
      retries: 30

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 3s
      retries: 30

  mailpit:
    image: axllent/mailpit
    ports: ["1025:1025", "8025:8025"]

  deps:
    <<: *node
    command: pnpm install --frozen-lockfile
    restart: "no"

  tools:
    <<: *node
    profiles: [tools]
    command: bash
    depends_on:
      deps: { condition: service_completed_successfully }
      postgres-test: { condition: service_healthy }
      redis: { condition: service_healthy }

volumes:
  postgres_data:
  node_modules:
  pnpm_store:
```

- [ ] **Step 6: Generar el lockfile dentro del contenedor**

Run: `docker compose build && docker compose run --rm --no-deps tools pnpm install`
Expected: crea `pnpm-lock.yaml` y termina con código 0.

- [ ] **Step 7: Verificar la infraestructura**

Run: `docker compose up -d postgres postgres-test redis mailpit && docker compose ps`
Expected: `postgres`, `postgres-test` y `redis` aparecen `healthy`, y `mailpit` aparece `running`.

Run: `docker compose run --rm tools pnpm --version`
Expected: `11.9.0` (el servicio `deps` corre primero y termina bien).

Run: `docker compose down`

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml .gitignore .dockerignore .env.example tsconfig.base.json docker docker-compose.yml
git commit -m "chore: monorepo pnpm y entorno docker base"
```

---

### Task 2: `packages/db` (schema, cliente, migraciones y utilidades de test)

**Files:**
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/drizzle.config.ts`, `packages/db/vitest.config.ts`
- Create: `packages/db/src/schema.ts`, `src/client.ts`, `src/migrate.ts`, `src/migrate-cli.ts`, `src/audit.ts`, `src/testing.ts`, `src/global-setup.ts`
- Test: `packages/db/src/audit.test.ts`
- Generated: `packages/db/drizzle/0000_*.sql`, `packages/db/drizzle/meta/*`
- Modify: `docker-compose.yml` (volumen `node_modules` del paquete)

**Interfaces:**
- Produces:
  - `@syntaxerror/db/schema`: `users`, `accounts`, `auditLog`.
  - `@syntaxerror/db/client`:
    - `createDb(url: string): { db: AppDb; close(): Promise<void> }`
    - `getDb(): AppDb`: singleton sobre `DATABASE_URL`
    - tipos `AppDb`, `DbTransaction`, `DbClient`.
  - `@syntaxerror/db/audit`:
    - `AUDIT_ACTIONS`, `AuditAction`, `AuditTargetType`
    - `insertAuditLogEntry(db: DbClient, input: InsertAuditLogEntryInput): Promise<void>`
  - `@syntaxerror/db/testing`:
    - `createTestDb(): { db: AppDb; close(): Promise<void> }`
    - `truncateAll(db: AppDb): Promise<void>`
  - `@syntaxerror/db/migrate`: `runMigrations(url: string): Promise<void>`.
  - Script `pnpm --filter @syntaxerror/db migrate`, que migra `DATABASE_URL`.

- [ ] **Step 1: Crear `packages/db/package.json`, `tsconfig.json`, `drizzle.config.ts` y `vitest.config.ts`**

```json
{
  "name": "@syntaxerror/db",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./schema": "./src/schema.ts",
    "./client": "./src/client.ts",
    "./audit": "./src/audit.ts",
    "./testing": "./src/testing.ts",
    "./migrate": "./src/migrate.ts"
  },
  "scripts": {
    "test": "vitest run",
    "generate": "drizzle-kit generate",
    "migrate": "tsx src/migrate-cli.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.36.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "drizzle-kit": "^0.28.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^4.1.9"
  }
}
```

`tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "include": ["src", "drizzle.config.ts", "vitest.config.ts"] }
```

`drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./src/global-setup.ts"],
    fileParallelism: false,
  },
});
```

Agregar en `docker-compose.yml`, dentro de `x-node.volumes`:
```yaml
    - db_node_modules:/app/packages/db/node_modules
```
y en `volumes:` (al final del archivo):
```yaml
  db_node_modules:
```

- [ ] **Step 2: Crear `src/schema.ts`** (portado de `$V1/packages/db/src/schema.ts`: `users`, `accounts` y `auditLog`, sin cambios de columnas)

```ts
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    passwordHash: text("password_hash"),
    role: text("role").notNull().default("student"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    abandonmentEmailsOptOut: boolean("abandonment_emails_opt_out")
      .notNull()
      .default(false),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    actorId: uuid("actor_id"),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    metadata: jsonb("metadata").notNull().$type<Record<string, unknown>>().default({}),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [index("audit_log_created_at_idx").on(table.createdAt)]
);
```

- [ ] **Step 3: Crear `src/client.ts`, `src/migrate.ts`, `src/migrate-cli.ts`, `src/testing.ts` y `src/global-setup.ts`**

`src/client.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 10 });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end() };
}

export type AppDb = ReturnType<typeof createDb>["db"];
export type DbTransaction = Parameters<Parameters<AppDb["transaction"]>[0]>[0];
export type DbClient = AppDb | DbTransaction;

const globalForDb = globalThis as { __syntaxerrorDb?: AppDb };

export function getDb(): AppDb {
  if (!globalForDb.__syntaxerrorDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.__syntaxerrorDb = createDb(url).db;
  }
  return globalForDb.__syntaxerrorDb;
}
```

`src/migrate.ts`:
```ts
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

export async function runMigrations(connectionString: string): Promise<void> {
  const client = postgres(connectionString, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    await client.end();
  }
}
```

`src/migrate-cli.ts`:
```ts
import { runMigrations } from "./migrate";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
await runMigrations(url);
console.log("[db] migraciones aplicadas");
```

`src/testing.ts`:
```ts
import { sql } from "drizzle-orm";
import { createDb, type AppDb } from "./client";

export function createTestDb() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set");
  return createDb(url);
}

export async function truncateAll(db: AppDb): Promise<void> {
  const rows = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`
  );
  const tables = [...rows].map((row) => `"${row.tablename}"`);
  if (tables.length === 0) return;
  await db.execute(sql.raw(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
}
```

`src/global-setup.ts`:
```ts
import { runMigrations } from "./migrate";

export default async function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set");
  await runMigrations(url);
}
```

- [ ] **Step 4: Escribir el test que falla, `src/audit.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { insertAuditLogEntry } from "./audit";
import { auditLog } from "./schema";
import { createTestDb, truncateAll } from "./testing";

const { db, close } = createTestDb();

describe("insertAuditLogEntry", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => close());

  it("guarda la acción con metadata vacía por defecto", async () => {
    await insertAuditLogEntry(db, {
      actorId: null,
      actorEmail: "ana@correo.cl",
      action: "login_failed",
      ipAddress: "10.0.0.1",
    });

    const rows = await db.select().from(auditLog);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorEmail: "ana@correo.cl",
      action: "login_failed",
      metadata: {},
      ipAddress: "10.0.0.1",
      userAgent: null,
    });
  });
});
```

- [ ] **Step 5: Generar la migración y verificar que el test falla**

Run: `docker compose build && npm run db:generate`
Expected: crea `packages/db/drizzle/0000_<nombre>.sql` con `CREATE TABLE "users"`, `"accounts"` y `"audit_log"`.

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/db test`
Expected: FAIL, porque no se puede resolver `./audit`.

- [ ] **Step 6: Crear `src/audit.ts`**

```ts
import type { DbClient } from "./client";
import { auditLog } from "./schema";

export const AUDIT_ACTIONS = ["login_success", "login_failed", "logout"] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditTargetType = "user";

export type InsertAuditLogEntryInput = {
  actorId: string | null;
  actorEmail: string | null;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function insertAuditLogEntry(
  db: DbClient,
  input: InsertAuditLogEntryInput
): Promise<void> {
  await db.insert(auditLog).values({
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {},
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}
```

- [ ] **Step 7: Correr los tests**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/db test`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add packages/db docker-compose.yml pnpm-lock.yaml
git commit -m "feat(db): schema base, cliente, migraciones y utilidades de test"
```

---

### Task 3: `packages/ui` (identidad visual y componentes base)

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/vitest.config.ts`
- Create: `packages/ui/src/tokens.css`, `src/components.css` (copiados desde la v1), `src/cn.ts`
- Create: `packages/ui/src/components/button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `badge.tsx` (portados)
- Test: `packages/ui/src/components/button.test.tsx`
- Modify: `docker-compose.yml` (volumen)

**Interfaces:**
- Produces:
  - `@syntaxerror/ui/tokens.css` y `@syntaxerror/ui/components.css`;
  - `@syntaxerror/ui/cn`: `cn(...inputs: ClassValue[]): string`;
  - `@syntaxerror/ui/components/button`: `Button`, `buttonVariants({ variant?: "primary"|"secondary"|"ghost"|"destructive"; size?: "default"|"sm"|"icon"; className? })`;
  - `@syntaxerror/ui/components/card`: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`;
  - `@syntaxerror/ui/components/input`: `Input`;
  - `@syntaxerror/ui/components/label`: `Label`;
  - `@syntaxerror/ui/components/badge`: `Badge`.

- [ ] **Step 1: Crear `package.json`, `tsconfig.json` y `vitest.config.ts`**

```json
{
  "name": "@syntaxerror/ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./tokens.css": "./src/tokens.css",
    "./components.css": "./src/components.css",
    "./cn": "./src/cn.ts",
    "./components/*": "./src/components/*.tsx"
  },
  "scripts": { "test": "vitest run" },
  "dependencies": {
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "peerDependencies": { "react": "^19.0.0" },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.6.0",
    "vitest": "^4.1.9"
  }
}
```

`tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx" },
  "include": ["src"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: { environment: "node" },
});
```

En `docker-compose.yml`, agregar a `x-node.volumes` `- ui_node_modules:/app/packages/ui/node_modules`, y en `volumes:` agregar `ui_node_modules:`.

- [ ] **Step 2: Copiar tokens, estilos y componentes desde la v1, y crear `cn.ts`**

```bash
mkdir -p packages/ui/src/components
cp "$V1/packages/design-tokens/tokens.css" packages/ui/src/tokens.css
cp "$V1/packages/design-tokens/components.css" packages/ui/src/components.css
for f in button card input label badge; do
  cp "$V1/apps/web/src/components/ui/$f.tsx" "packages/ui/src/components/$f.tsx"
done
sed -i '' 's|import { cn } from "@/lib/utils";|import { cn } from "../cn";|' packages/ui/src/components/*.tsx
```

`packages/ui/src/cn.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Verifica que ningún archivo siga importando desde `@/`:
Run: `grep -rn '@/' packages/ui/src`
Expected: sin resultados.

- [ ] **Step 3: Escribir el test `src/components/button.test.tsx`**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "./button";

describe("buttonVariants", () => {
  it("usa la variante primary por defecto", () => {
    expect(buttonVariants()).toContain("bg-primary");
  });

  it("deja que className sobrescriba clases de tailwind en conflicto", () => {
    const classes = buttonVariants({ size: "sm", className: "px-8" });
    expect(classes).toContain("px-8");
    expect(classes).not.toContain("px-3");
  });
});

describe("Button", () => {
  it("renderiza un botón con las clases de la variante", () => {
    const html = renderToStaticMarkup(<Button variant="secondary">Entrar</Button>);
    expect(html).toContain("<button");
    expect(html).toContain("bg-surface");
    expect(html).toContain("Entrar");
  });
});
```

- [ ] **Step 4: Instalar y correr los tests**

Run: `docker compose run --rm tools pnpm install && docker compose run --rm tools pnpm --filter @syntaxerror/ui test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ui docker-compose.yml pnpm-lock.yaml
git commit -m "feat(ui): identidad visual y componentes base portados desde la v1"
```

---

### Task 4: `apps/web` (sitio público, layout, páginas legales, errores y health)

**Files:**
- Create: `apps/web/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `next-env.d.ts`
- Create: `apps/web/src/app/layout.tsx`, `src/app/globals.css`, `src/app/not-found.tsx`, `src/app/global-error.tsx`
- Create: `apps/web/src/app/(marketing)/layout.tsx`, `page.tsx`, `error.tsx`, `privacidad/page.tsx`, `terminos/page.tsx`
- Create: `apps/web/src/app/api/health/route.ts`
- Create: `apps/web/src/components/theme-provider.tsx`, `theme-toggle.tsx`, `site-header.tsx`, `site-footer.tsx`, `terminal-window.tsx`, `error-glitch.tsx`, `not-found-glitch.tsx`
- Create: `apps/web/src/lib/redis.ts`, `src/lib/health.ts`, `src/lib/seo.ts`
- Test: `apps/web/src/lib/health.test.ts`
- Modify: `docker-compose.yml` (servicio `web` y volúmenes)

**Interfaces:**
- Consumes: `getDb()` y `createTestDb()` / `truncateAll()` (Task 2); los componentes y estilos de `@syntaxerror/ui` (Task 3).
- Produces:
  - `getRedis(): IORedis` en `src/lib/redis.ts`: singleton que falla rápido (`maxRetriesPerRequest: 1`, `enableOfflineQueue: false`);
  - `checkHealth(deps: { db: AppDb; redis: Pick<IORedis, "ping"> }): Promise<{ ok: boolean; db: boolean; redis: boolean }>`;
  - `SiteHeader`, al que la Task 6 le agrega la sesión;
  - alias `@/` que apunta a `apps/web/src`.

- [ ] **Step 1: Crear `apps/web/package.json`, `tsconfig.json`, `postcss.config.mjs`, `vitest.config.ts` y `next-env.d.ts`**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -H 0.0.0.0 -p 3000",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "db:seed": "tsx src/db/seed-cli.ts"
  },
  "dependencies": {
    "@auth/drizzle-adapter": "^1.7.0",
    "@syntaxerror/db": "workspace:*",
    "@syntaxerror/ui": "workspace:*",
    "bcryptjs": "^2.4.3",
    "drizzle-orm": "^0.36.0",
    "ioredis": "5.10.1",
    "lucide-react": "^0.468.0",
    "next": "^15.1.0",
    "next-auth": "5.0.0-beta.31",
    "next-themes": "^0.4.4",
    "rate-limiter-flexible": "^11.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^4.1.9"
  }
}
```

`tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "allowJs": true,
    "incremental": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`vitest.config.ts`:
```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    globalSetup: ["../../packages/db/src/global-setup.ts"],
    fileParallelism: false,
    // Todo lo que use getDb() en los tests apunta a la base de test.
    env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? "" },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

`next-env.d.ts`:
```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 2: Escribir el test que falla, `src/lib/health.test.ts`**

```ts
import { afterAll, describe, expect, it } from "vitest";
import { createTestDb } from "@syntaxerror/db/testing";
import { checkHealth } from "./health";

const { db, close } = createTestDb();

describe("checkHealth", () => {
  afterAll(() => close());

  it("reporta ok cuando responden la base y redis", async () => {
    const redis = { ping: async () => "PONG" };
    expect(await checkHealth({ db, redis })).toEqual({ ok: true, db: true, redis: true });
  });

  it("reporta el componente caído sin lanzar", async () => {
    const redis = { ping: async () => { throw new Error("ECONNREFUSED"); } };
    expect(await checkHealth({ db, redis })).toEqual({ ok: false, db: true, redis: false });
  });
});
```

- [ ] **Step 3: Agregar `web` a `docker-compose.yml`, instalar y ver fallar el test**

Agregar a `x-node.volumes`:
```yaml
    - web_node_modules:/app/apps/web/node_modules
    - web_next:/app/apps/web/.next
```
Agregar a `volumes:` `web_node_modules:` y `web_next:`. Agregar el servicio (la Task 7 le suma la dependencia de `db-setup`):
```yaml
  web:
    <<: *node
    command: pnpm --filter web dev
    ports: ["3000:3000"]
    environment:
      <<: *node-env
      WATCHPACK_POLLING: "true"
      AUTH_SECRET: ${AUTH_SECRET:-dev-only-secret-change-me-dev-only-secret}
      AUTH_URL: http://localhost:3000
      AUTH_TRUST_HOST: "true"
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
      NEXT_PUBLIC_CHAT_SOCKET_URL: http://localhost:4001
    depends_on:
      deps: { condition: service_completed_successfully }
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
```

Run: `docker compose run --rm tools pnpm install && docker compose run --rm tools pnpm --filter web test`
Expected: FAIL, porque no se puede resolver `./health`.

- [ ] **Step 4: Crear `src/lib/redis.ts` y `src/lib/health.ts`**

`src/lib/redis.ts`:
```ts
import IORedis from "ioredis";

const globalForRedis = globalThis as { __syntaxerrorRedis?: IORedis };

// Falla rápido si Redis no responde: el rate limit y el login no deben quedar colgados.
export function getRedis(): IORedis {
  if (!globalForRedis.__syntaxerrorRedis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not set");
    globalForRedis.__syntaxerrorRedis = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
    });
  }
  return globalForRedis.__syntaxerrorRedis;
}
```

`src/lib/health.ts`:
```ts
import { sql } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";

export type HealthStatus = { ok: boolean; db: boolean; redis: boolean };

async function succeeds(check: () => Promise<unknown>): Promise<boolean> {
  try {
    await check();
    return true;
  } catch {
    return false;
  }
}

export async function checkHealth(deps: {
  db: AppDb;
  redis: { ping: () => Promise<unknown> };
}): Promise<HealthStatus> {
  const [db, redis] = await Promise.all([
    succeeds(() => deps.db.execute(sql`select 1`)),
    succeeds(() => deps.redis.ping()),
  ]);
  return { ok: db && redis, db, redis };
}
```

- [ ] **Step 5: Correr el test**

Run: `docker compose run --rm tools pnpm --filter web test`
Expected: PASS (2 tests).

- [ ] **Step 6: Crear `next.config.ts` y la ruta de health**

`next.config.ts`:
```ts
import type { NextConfig } from "next";

const socketUrl = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? "";
const socketOrigins = socketUrl
  ? [socketUrl, socketUrl.replace(/^http/, "ws")].join(" ")
  : "";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  transpilePackages: ["@syntaxerror/db", "@syntaxerror/ui"],
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Content-Security-Policy",
        value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ${socketOrigins}; frame-ancestors 'none'`,
      });
    }
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
```

`src/app/api/health/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { checkHealth } from "@/lib/health";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await checkHealth({ db: getDb(), redis: getRedis() });
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
```

- [ ] **Step 7: Portar layout, estilos y componentes de marca**

```bash
mkdir -p apps/web/src/components apps/web/src/app/'(marketing)'/privacidad apps/web/src/app/'(marketing)'/terminos
for f in theme-provider theme-toggle site-footer terminal-window error-glitch not-found-glitch; do
  cp "$V1/apps/web/src/components/$f.tsx" "apps/web/src/components/$f.tsx"
done
cp "$V1/apps/web/src/app/globals.css" apps/web/src/app/globals.css
cp "$V1/apps/web/src/lib/seo.ts" apps/web/src/lib/seo.ts
cp "$V1/apps/web/src/app/(marketing)/privacidad/page.tsx" "apps/web/src/app/(marketing)/privacidad/page.tsx"
cp "$V1/apps/web/src/app/(marketing)/terminos/page.tsx" "apps/web/src/app/(marketing)/terminos/page.tsx"
sed -i '' 's|from "@/components/ui/button"|from "@syntaxerror/ui/components/button"|' apps/web/src/components/error-glitch.tsx
```

En `apps/web/src/app/globals.css`, reemplaza las 3 primeras líneas de imports y el `@source` por:
```css
@import "tailwindcss";
@import "@syntaxerror/ui/tokens.css";
@import "@syntaxerror/ui/components.css";

@source "../**/*.{ts,tsx}";
@source "../../../../packages/ui/src/**/*.{ts,tsx}";
```

En `apps/web/src/lib/seo.ts`, reemplaza `title` y `description` de `siteConfig` por:
```ts
  title: "syntaxError.cl | Aprende practicando y consigue tu primer trabajo en tecnología",
  description:
    "Academia gratuita: resuelve casos de trabajo reales en tu navegador, arma tu portafolio y prepárate para tu primer empleo en datos, ciberseguridad, desarrollo o cloud.",
```

Revisa que ningún archivo portado importe algo inexistente:
Run: `grep -rn 'from "@/' apps/web/src | grep -v -E '@/(components/(theme-provider|theme-toggle|site-header|site-footer|terminal-window|error-glitch|not-found-glitch)|lib/(seo|health|redis))"'`
Expected: sin resultados.

- [ ] **Step 8: Crear el layout raíz, el header, la home y las páginas de error**

`src/app/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { defaultOpenGraphImage, jsonLd, organizationJsonLd, siteConfig, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: "%s | syntaxError.cl" },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [defaultOpenGraphImage],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-accent="platform" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd()) }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

`src/components/site-header.tsx` (versión sin sesión; la Task 6 la extiende):
```tsx
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-auto flex items-center gap-2 font-black text-foreground">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary font-mono text-sm text-primary-foreground">
            {"{}"}
          </span>
          <span className="hidden sm:inline">syntaxError.cl</span>
        </Link>
        <ThemeToggle />
        <Link href="/login" className="btn btn-primary">
          Entrar
        </Link>
      </div>
    </header>
  );
}
```

`src/app/(marketing)/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
```

`src/app/(marketing)/page.tsx`:
```tsx
import Link from "next/link";

const STEPS = [
  {
    tag: "01_caso",
    title: "Un trabajo real, no un temario",
    body: "Cada curso es un caso de una empresa ficticia chilena. Llegas como junior y te piden resultados.",
  },
  {
    tag: "02_misiones",
    title: "Resuelves en herramientas de verdad",
    body: "SQL, Python, planillas y terminal corren en tu navegador. Cada misión se valida al instante.",
  },
  {
    tag: "03_portafolio",
    title: "Terminas con evidencia",
    body: "Cada caso deja un entregable para tu GitHub y un certificado verificable para tu CV.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <p className="font-mono text-sm font-bold text-primary">SYNTAXERROR_ / v2.0</p>
        <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
          Aprende resolviendo casos reales y consigue tu primer trabajo en tecnología
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
          Academia 100% gratuita. Sin videos eternos ni quizzes de memoria: practicas con datos y
          herramientas reales desde tu navegador y armas un portafolio que puedes mostrar.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/registro" className="btn btn-primary">
            Crear cuenta gratis
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
        {STEPS.map((step) => (
          <article key={step.tag} className="card grid gap-3 p-6">
            <span className="font-mono text-xs font-bold text-primary">{step.tag}</span>
            <h2 className="text-xl font-black">{step.title}</h2>
            <p className="leading-7 text-muted-foreground">{step.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
```

`src/app/not-found.tsx`:
```tsx
import { NotFoundGlitch } from "@/components/not-found-glitch";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <NotFoundGlitch />
      <SiteFooter />
    </>
  );
}
```

`src/app/(marketing)/error.tsx`:
```tsx
"use client";

import { ErrorGlitch } from "@/components/error-glitch";

export default function MarketingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorGlitch
      code="500"
      eyebrow="ERROR_500"
      title="La señal se rompió de este lado."
      description="Puedes reintentar la operación o volver al inicio mientras estabilizamos el runtime."
      onReset={reset}
      homeHref="/"
      homeLabel="Volver al inicio"
    />
  );
}
```

`src/app/global-error.tsx`:
```tsx
"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui", padding: "3rem", background: "#0a0a0a", color: "#fafafa" }}>
        <h1>syntaxError: algo se rompió</h1>
        <p>Recarga la página. Si el problema sigue, vuelve a intentarlo en unos minutos.</p>
        <button type="button" onClick={() => reset()}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
```

Sentry se integra en la fase 5. Por eso `error.tsx` y `global-error.tsx` no lo importan todavía.

- [ ] **Step 9: Levantar el web y verificar**

Run: `docker compose up -d --build web && sleep 20 && curl -s localhost:3000/api/health && curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/ && curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/privacidad && curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/no-existe`
Expected: `{"ok":true,"db":true,"redis":true}`, luego `200`, `200` y `404`.

Run: `docker compose run --rm tools pnpm --filter web exec tsc --noEmit`
Expected: sin errores.

Run: `docker compose down`

- [ ] **Step 10: Commit**

```bash
git add apps/web docker-compose.yml pnpm-lock.yaml
git commit -m "feat(web): sitio público con identidad syntaxError, páginas legales, errores y health"
```

---

### Task 5: Rate limiting, CORS y protección CSRF

**Files:**
- Create: `apps/web/src/lib/rate-limit.ts`, `src/lib/cors.ts`, `src/lib/csrf.ts`, `apps/web/middleware.ts`
- Test: `apps/web/src/lib/rate-limit.test.ts`, `src/lib/csrf.test.ts`

**Interfaces:**
- Consumes: `getRedis()` (Task 4).
- Produces:
  - `RateLimitKey = "login-email" | "login-ip" | "register-ip"`;
  - `RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number }`;
  - `consumeLimiter(limiter: Pick<RateLimiterRedis | RateLimiterMemory, "consume">, id: string): Promise<RateLimitResult>`;
  - `checkRateLimit(key: RateLimitKey, id: string): Promise<RateLimitResult>`;
  - `isAllowedOrigin(origin: string | null): origin is string`;
  - `isRequestOriginAllowed(request): boolean`.

- [ ] **Step 1: Copiar los tests de la v1 y agregar el caso "Redis caído"**

```bash
cp "$V1/apps/web/src/lib/rate-limit.test.ts" apps/web/src/lib/rate-limit.test.ts
cp "$V1/apps/web/src/lib/csrf.test.ts" apps/web/src/lib/csrf.test.ts
```

En `rate-limit.test.ts`, borra el caso `"limita teacher-question-ask a 5 usos en la ventana configurada"` (esa clave llega en la fase 3). Agrega este `describe` al final del archivo, con los imports correspondientes al inicio:

```ts
import IORedis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";

describe("consumeLimiter con Redis caído", () => {
  it("falla en menos de 3 segundos en vez de quedar colgado", async () => {
    const deadRedis = new IORedis("redis://127.0.0.1:6390", {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 500,
      lazyConnect: true,
    });
    const limiter = new RateLimiterRedis({ storeClient: deadRedis, keyPrefix: "rl:test", points: 5, duration: 60 });

    const started = Date.now();
    await expect(consumeLimiter(limiter, "ana@correo.cl")).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(3000);
    deadRedis.disconnect();
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/rate-limit.test.ts src/lib/csrf.test.ts`
Expected: FAIL, porque no se pueden resolver `./rate-limit` ni `./csrf`.

- [ ] **Step 3: Crear `cors.ts` y `csrf.ts`**

```bash
cp "$V1/apps/web/src/lib/cors.ts" apps/web/src/lib/cors.ts
cp "$V1/apps/web/src/lib/csrf.ts" apps/web/src/lib/csrf.ts
```
Los dos archivos se usan sin cambios: solo dependen de `next/server` y entre ellos.

- [ ] **Step 4: Crear `rate-limit.ts`**

```ts
import { RateLimiterMemory, RateLimiterRedis, type RateLimiterRes } from "rate-limiter-flexible";
import { getRedis } from "./redis";

export type RateLimitKey = "login-email" | "login-ip" | "register-ip";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const LIMITER_CONFIGS: Record<RateLimitKey, { points: number; duration: number }> = {
  "login-email": { points: 5, duration: 900 },
  "login-ip": { points: 10, duration: 900 },
  "register-ip": { points: 5, duration: 3600 },
};

const limiters = new Map<RateLimitKey, RateLimiterRedis>();

function getLimiter(key: RateLimitKey): RateLimiterRedis {
  let limiter = limiters.get(key);
  if (!limiter) {
    const config = LIMITER_CONFIGS[key];
    limiter = new RateLimiterRedis({
      storeClient: getRedis(),
      keyPrefix: `rl:${key}`,
      points: config.points,
      duration: config.duration,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

export async function consumeLimiter(
  limiter: Pick<RateLimiterRedis | RateLimiterMemory, "consume">,
  identifier: string
): Promise<RateLimitResult> {
  try {
    await limiter.consume(identifier);
    return { allowed: true };
  } catch (rejection) {
    if (rejection instanceof Error) throw rejection;
    const res = rejection as RateLimiterRes;
    return { allowed: false, retryAfterSeconds: Math.ceil(res.msBeforeNext / 1000) };
  }
}

export async function checkRateLimit(key: RateLimitKey, identifier: string): Promise<RateLimitResult> {
  return consumeLimiter(getLimiter(key), identifier);
}
```

- [ ] **Step 5: Crear `apps/web/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { isRequestOriginAllowed } from "./src/lib/csrf";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const config = { matcher: ["/api/:path*"] };

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth/") && !request.nextUrl.pathname.startsWith("/api/auth/register")) {
    return NextResponse.next();
  }
  if (!MUTATING_METHODS.has(request.method)) return NextResponse.next();
  if (!isRequestOriginAllowed(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  return NextResponse.next();
}
```

La ruta `/api/auth/register` sí pasa por la verificación de origen: es un endpoint propio, no de Auth.js.

- [ ] **Step 6: Correr los tests**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/rate-limit.test.ts src/lib/csrf.test.ts`
Expected: PASS (5 casos de rate limit y 6 de csrf).

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): rate limiting con redis que falla rápido y protección CSRF por origen"
```

---

### Task 6: Autenticación (registro, login con credenciales y Google, sesión con rol y dashboard)

**Files:**
- Create: `apps/web/src/lib/password.ts`, `src/lib/audit.ts`, `src/lib/auth.ts`, `src/types/next-auth.d.ts`
- Create: `apps/web/src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/auth/register/service.ts`, `src/app/api/auth/register/route.ts`
- Create: `apps/web/src/app/(auth)/login/page.tsx`, `login/LoginForm.tsx`, `registro/page.tsx`, `registro/RegisterForm.tsx`
- Create: `apps/web/src/components/sign-out-button.tsx`
- Create: `apps/web/src/app/(dashboard)/layout.tsx`, `(dashboard)/dashboard/page.tsx`
- Modify: `apps/web/src/components/site-header.tsx`
- Test: `apps/web/src/lib/password.test.ts`, `src/app/api/auth/register/service.test.ts`, `src/app/api/auth/register/route.test.ts`

**Interfaces:**
- Consumes:
  - `getDb`, `createTestDb`, `truncateAll`, `users`, `accounts` e `insertAuditLogEntry` (Task 2);
  - `checkRateLimit` (Task 5);
  - componentes de `@syntaxerror/ui` (Task 3).
- Produces:
  - `hashPassword(plain: string): Promise<string>` y `verifyPassword(plain: string, hash: string): Promise<boolean>`;
  - `normalizeEmail(email: string): string` (en `register/service.ts`);
  - `registerUser(db: AppDb, input: { name: string; email: string; password: string }): Promise<{ id: string; email: string }>`, que lanza `Error("email_taken")`;
  - `auth()`, `handlers`, `signIn` y `signOut` en `@/lib/auth`;
  - `session.user.id` y `session.user.role` (`"student" | "teacher" | "admin"`).

- [ ] **Step 1: Escribir los tests que fallan**

```bash
cp "$V1/apps/web/src/lib/password.test.ts" apps/web/src/lib/password.test.ts
```

`src/app/api/auth/register/service.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { verifyPassword } from "@/lib/password";
import { normalizeEmail, registerUser } from "./service";

const { db, close } = createTestDb();

describe("registerUser", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => close());

  it("crea la alumna con la contraseña hasheada y rol student", async () => {
    const created = await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    const [row] = await db.select().from(users).where(eq(users.id, created.id));
    expect(row.role).toBe("student");
    expect(row.passwordHash).not.toBe("clave-segura-123");
    expect(await verifyPassword("clave-segura-123", row.passwordHash!)).toBe(true);
  });

  it("normaliza el email (espacios y mayúsculas) y rechaza el duplicado", async () => {
    const created = await registerUser(db, { name: "Ana", email: "  Ana@Correo.CL ", password: "clave-segura-123" });
    expect(created.email).toBe("ana@correo.cl");
    await expect(
      registerUser(db, { name: "Otra", email: "ana@correo.cl", password: "clave-segura-456" })
    ).rejects.toThrow("email_taken");
  });

  it("normalizeEmail recorta y pasa a minúsculas", () => {
    expect(normalizeEmail("  Ana@Correo.CL ")).toBe("ana@correo.cl");
  });
});
```

`src/app/api/auth/register/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

const { db, close } = createTestDb();

// Sin mock del cliente: vitest.config.ts apunta DATABASE_URL a la base de test, así que getDb() usa esa base.
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));

const { POST } = await import("./route");
const { checkRateLimit } = await import("@/lib/rate-limit");

function post(body: unknown) {
  return POST(
    new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.9" },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/auth/register", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => close());

  it("crea la cuenta y responde 201", async () => {
    const res = await post({ name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ email: "ana@correo.cl" });
  });

  it("responde 400 si la contraseña tiene menos de 8 caracteres", async () => {
    const res = await post({ name: "Ana", email: "ana@correo.cl", password: "corta" });
    expect(res.status).toBe(400);
  });

  it("responde 409 si el email ya existe, aunque cambien las mayúsculas", async () => {
    await post({ name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    const res = await post({ name: "Ana", email: "ANA@correo.cl", password: "clave-segura-123" });
    expect(res.status).toBe(409);
  });

  it("responde 429 con Retry-After cuando se excede el límite", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 120 });
    const res = await post({ name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/password.test.ts src/app/api/auth/register`
Expected: FAIL, porque no se pueden resolver `./password`, `./service` ni `./route`.

- [ ] **Step 3: Implementar password, registro y ruta**

```bash
cp "$V1/apps/web/src/lib/password.ts" apps/web/src/lib/password.ts
```

`src/app/api/auth/register/service.ts`:
```ts
import { eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { hashPassword } from "@/lib/password";

export type RegisterInput = { name: string; email: string; password: string };
export type RegisterResult = { id: string; email: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUser(db: AppDb, input: RegisterInput): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) throw new Error("email_taken");

  const passwordHash = await hashPassword(input.password);
  const [created] = await db
    .insert(users)
    .values({ name: input.name.trim(), email, passwordHash })
    .returning({ id: users.id, email: users.email });
  return created;
}
```

`src/app/api/auth/register/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { registerUser } from "./service";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const limit = await checkRateLimit("register-ip", ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const result = await registerUser(getDb(), parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "email_taken") {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    throw err;
  }
}
```

- [ ] **Step 4: Correr los tests**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/password.test.ts src/app/api/auth/register`
Expected: PASS (2 + 3 + 4 tests).

- [ ] **Step 5: Implementar Auth.js**

```bash
mkdir -p apps/web/src/types
cp "$V1/apps/web/src/types/next-auth.d.ts" apps/web/src/types/next-auth.d.ts
cp "$V1/apps/web/src/components/sign-out-button.tsx" apps/web/src/components/sign-out-button.tsx
```

`src/lib/audit.ts`:
```ts
import { headers } from "next/headers";
import type { DbClient } from "@syntaxerror/db/client";
import { insertAuditLogEntry, type AuditAction, type AuditTargetType } from "@syntaxerror/db/audit";

export async function recordAuditEvent(
  db: DbClient,
  input: {
    actorId: string | null;
    actorEmail: string | null;
    action: AuditAction;
    targetType?: AuditTargetType;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const headerList = await headers();
  await insertAuditLogEntry(db, {
    ...input,
    ipAddress: headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip"),
    userAgent: headerList.get("user-agent"),
  });
}
```

`src/lib/auth.ts`: portado de `$V1/apps/web/src/lib/auth.ts` con estos cambios: usa `getDb()` en lugar de `db`, importa desde `@syntaxerror/db/*` y normaliza el email con `normalizeEmail`.
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { getDb } from "@syntaxerror/db/client";
import { accounts, users } from "@syntaxerror/db/schema";
import type { AuditAction } from "@syntaxerror/db/audit";
import { normalizeEmail } from "@/app/api/auth/register/service";
import { recordAuditEvent } from "./audit";
import { verifyPassword } from "./password";
import { checkRateLimit } from "./rate-limit";

async function recordAuthEvent(input: { actorId: string | null; actorEmail: string | null; action: AuditAction }) {
  try {
    await recordAuditEvent(getDb(), input);
  } catch (error) {
    console.error("[audit] no se pudo registrar el evento de auth", error);
  }
}

const providers = [
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
    : []),
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, request) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;

      const normalizedEmail = normalizeEmail(email);
      const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
      const [emailLimit, ipLimit] = await Promise.all([
        checkRateLimit("login-email", normalizedEmail),
        checkRateLimit("login-ip", ip),
      ]);
      if (!emailLimit.allowed || !ipLimit.allowed) return null;

      const [user] = await getDb().select().from(users).where(eq(users.email, normalizedEmail));
      if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
        await recordAuthEvent({ actorId: null, actorEmail: normalizedEmail, action: "login_failed" });
        return null;
      }

      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb(), { usersTable: users, accountsTable: accounts }),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  events: {
    async signIn({ user }) {
      await recordAuthEvent({ actorId: user.id ?? null, actorEmail: user.email ?? null, action: "login_success" });
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      await recordAuthEvent({
        actorId: (token?.sub as string | undefined) ?? null,
        actorEmail: (token?.email as string | undefined) ?? null,
        action: "logout",
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as typeof user & { role?: string }).role;
      }
      if (token.sub && !token.role) {
        const [stored] = await getDb().select({ role: users.role }).from(users).where(eq(users.id, token.sub));
        token.role = stored?.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = typeof token.role === "string" ? token.role : "student";
      }
      return session;
    },
  },
});
```

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 6: Portar las páginas de login y registro**

```bash
mkdir -p apps/web/src/app/'(auth)'/login apps/web/src/app/'(auth)'/registro
for f in login/page.tsx login/LoginForm.tsx registro/page.tsx registro/RegisterForm.tsx; do
  cp "$V1/apps/web/src/app/(auth)/$f" "apps/web/src/app/(auth)/$f"
done
sed -i '' -E 's#from "@/components/ui/(button|card|input|label)"#from "@syntaxerror/ui/components/\1"#' apps/web/src/app/'(auth)'/*/*.tsx
```

Edita `apps/web/src/app/(auth)/registro/RegisterForm.tsx` para quitar el código de clase, que vuelve en la fase 3 con las clases de profesor:
1. Borra la línea `const joinCode = String(formData.get("joinCode") ?? "").trim();`.
2. En el `body` del `fetch`, borra `...(joinCode ? { joinCode } : {}),`.
3. Borra `const registerResult = await response.json();`.
4. Reemplaza el bloque `const destination = ... ; router.push(destination);` por `router.push(result.url ?? callbackUrl);`.
5. Borra el `<Label>` completo que contiene `Codigo de clase (opcional)` y su `<Input name="joinCode" ... />`.

Run: `grep -n "joinCode\|registerResult\|classJoin" apps/web/src/app/'(auth)'/registro/RegisterForm.tsx`
Expected: sin resultados.

- [ ] **Step 7: Crear el dashboard y actualizar el header con la sesión**

`src/app/(dashboard)/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
```

`src/app/(dashboard)/dashboard/page.tsx`:
```tsx
import { auth } from "@/lib/auth";

export const metadata = { title: "Tu panel" };

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "estudiante";
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-sm font-bold text-primary">{"> whoami"}</p>
      <h1 className="text-3xl font-black">Hola, {name}</h1>
      <p className="max-w-2xl leading-7 text-muted-foreground">
        Aquí vas a ver tus casos en curso, tus entregables y tus certificados.
      </p>
    </main>
  );
}
```

Reemplaza `src/components/site-header.tsx` completo:
```tsx
import { LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;
  const initials = (user?.name ?? user?.email ?? "U")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-auto flex items-center gap-2 font-black text-foreground">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary font-mono text-sm text-primary-foreground">
            {"{}"}
          </span>
          <span className="hidden sm:inline">syntaxError.cl</span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1" aria-label="Principal">
            <Link className="nav-link" href="/dashboard">
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </nav>
        ) : null}

        <ThemeToggle />

        {user ? (
          <details className="relative">
            <summary
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground"
              aria-label="Abrir menú de perfil"
            >
              {initials}
            </summary>
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-border bg-surface shadow-2xl">
              <div className="border-b border-border px-3 py-3">
                <strong className="block truncate text-sm">{user.name ?? "Estudiante"}</strong>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              {user.role === "admin" ? (
                <span className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground">
                  <Settings size={15} />
                  Rol: administración
                </span>
              ) : null}
              <SignOutButton />
            </div>
          </details>
        ) : (
          <Link href="/login" className="btn btn-primary">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 8: Verificar con typecheck, tests y flujo manual**

Run: `docker compose run --rm tools pnpm --filter web exec tsc --noEmit && docker compose run --rm tools pnpm --filter web test`
Expected: sin errores de tipos y todos los tests en PASS.

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/db migrate && docker compose up -d --build web`
Luego abre `http://localhost:3000/registro`, crea una cuenta y verifica que:
- redirige a `/dashboard` con "Hola, <nombre>";
- el header muestra tus iniciales;
- "Cerrar sesión" te devuelve a la home;
- `/dashboard` sin sesión redirige a `/login?callbackUrl=/dashboard`.

Run: `docker compose down`

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): registro, login con credenciales y Google, sesión con rol y dashboard"
```

---

### Task 7: Seed del admin y servicio `db-setup`

**Files:**
- Create: `apps/web/src/db/seed.ts`, `apps/web/src/db/seed-cli.ts`
- Test: `apps/web/src/db/seed.test.ts`
- Modify: `docker-compose.yml` (servicio `db-setup` y dependencia de `web`)

**Interfaces:**
- Consumes: `hashPassword` (Task 6), `normalizeEmail` (Task 6), `users` (Task 2).
- Produces: `seedAdmin(db: AppDb, input: { email: string; password: string }): Promise<{ id: string }>`, idempotente.

- [ ] **Step 1: Escribir el test que falla, `src/db/seed.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { verifyPassword } from "@/lib/password";
import { seedAdmin } from "./seed";

const { db, close } = createTestDb();

describe("seedAdmin", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => close());

  it("es idempotente: ejecutarlo dos veces deja un solo admin", async () => {
    await seedAdmin(db, { email: "Admin@Local.test", password: "admin123456" });
    await seedAdmin(db, { email: "admin@local.test", password: "admin123456" });
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: "admin@local.test", role: "admin" });
  });

  it("promueve a admin y actualiza la clave si el usuario ya existía", async () => {
    await db.insert(users).values({ email: "admin@local.test", role: "student", passwordHash: "x" });
    await seedAdmin(db, { email: "admin@local.test", password: "nueva-clave-123" });
    const [row] = await db.select().from(users);
    expect(row.role).toBe("admin");
    expect(await verifyPassword("nueva-clave-123", row.passwordHash!)).toBe(true);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web test -- src/db/seed.test.ts`
Expected: FAIL, porque no se puede resolver `./seed`.

- [ ] **Step 3: Implementar `seed.ts` y `seed-cli.ts`**

`src/db/seed.ts`:
```ts
import type { AppDb } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { normalizeEmail } from "@/app/api/auth/register/service";
import { hashPassword } from "@/lib/password";

export async function seedAdmin(db: AppDb, input: { email: string; password: string }): Promise<{ id: string }> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(users)
    .values({ email, name: "Admin", role: "admin", passwordHash })
    .onConflictDoUpdate({ target: users.email, set: { role: "admin", passwordHash, updatedAt: new Date() } })
    .returning({ id: users.id });
  return row;
}
```

`src/db/seed-cli.ts`:
```ts
import { createDb } from "@syntaxerror/db/client";
import { seedAdmin } from "./seed";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const email = process.env.SEED_ADMIN_EMAIL ?? "admin@local.test";
const password = process.env.SEED_ADMIN_PASSWORD;
if (!password) throw new Error("SEED_ADMIN_PASSWORD is required");

async function main(databaseUrl: string, adminPassword: string) {
  const { db, close } = createDb(databaseUrl);
  try {
    await seedAdmin(db, { email, password: adminPassword });
  } finally {
    await close();
  }
  console.log(`[seed] admin listo: ${email}`);
}

main(url, password).catch((error) => {
  console.error(error);
  process.exit(1);
});
```

`tsx` resuelve los alias `@/` a partir del `tsconfig.json` de `apps/web`, que es el directorio de trabajo de `pnpm --filter web db:seed`. El script `db:seed` de la Task 4 queda igual.

- [ ] **Step 4: Correr el test**

Run: `docker compose run --rm tools pnpm --filter web test -- src/db/seed.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Agregar `db-setup` a `docker-compose.yml` y hacer que `web` dependa de él**

```yaml
  db-setup:
    <<: *node
    command: sh -c "pnpm --filter @syntaxerror/db migrate && pnpm --filter web db:seed"
    restart: "no"
    environment:
      <<: *node-env
      SEED_ADMIN_EMAIL: ${SEED_ADMIN_EMAIL:-admin@local.test}
      SEED_ADMIN_PASSWORD: ${SEED_ADMIN_PASSWORD:-admin123456}
    depends_on:
      deps: { condition: service_completed_successfully }
      postgres: { condition: service_healthy }
```

En el servicio `web`, agrega a `depends_on`:
```yaml
      db-setup: { condition: service_completed_successfully }
```

- [ ] **Step 6: Verificar que es idempotente de punta a punta**

Run: `docker compose up -d --build web && docker compose logs db-setup && docker compose down && docker compose up -d web && docker compose logs db-setup`
Expected: las dos veces se ven `[db] migraciones aplicadas` y `[seed] admin listo: admin@local.test`, y `db-setup` termina con código 0 (`docker compose ps -a db-setup` muestra `Exited (0)`).

Entra en `http://localhost:3000/login` con `admin@local.test` / `admin123456`: el menú de perfil muestra "Rol: administración".

Run: `docker compose down`

- [ ] **Step 7: Commit**

```bash
git add apps/web docker-compose.yml
git commit -m "feat: seed idempotente del admin y servicio db-setup previo al web"
```

---

### Task 8: `apps/worker` (servidor socket.io con health, listo para colas)

**Files:**
- Create: `apps/worker/package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `apps/worker/src/index.ts`, `src/redis.ts`, `src/server.ts`
- Test: `apps/worker/src/server.test.ts`
- Modify: `docker-compose.yml` (servicio `worker` y volumen)

**Interfaces:**
- Produces:
  - `createWorkerServer(deps: { redis: { ping: () => Promise<unknown> }; corsOrigin: string }): { httpServer: http.Server; io: SocketIOServer }`, con `GET /health` que responde `200 {"ok":true}` o `503 {"ok":false}`;
  - `getRedis(): IORedis` del worker, con `maxRetriesPerRequest: null` porque BullMQ lo exige para sus workers (fase 3).

- [ ] **Step 1: Crear `package.json`, `tsconfig.json` y `vitest.config.ts`**

```json
{
  "name": "worker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "ioredis": "5.10.1",
    "socket.io": "^4.8.3"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^4.1.9"
  }
}
```

`tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "lib": ["ES2022"], "types": ["node"] }, "include": ["src"] }
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({ test: { environment: "node" } });
```

En `docker-compose.yml`, agrega a `x-node.volumes` `- worker_node_modules:/app/apps/worker/node_modules`, y en `volumes:` agrega `worker_node_modules:`.

- [ ] **Step 2: Escribir el test que falla, `src/server.test.ts`**

```ts
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createWorkerServer } from "./server";

let close: (() => Promise<void>) | undefined;

async function start(ping: () => Promise<unknown>) {
  const { httpServer, io } = createWorkerServer({ redis: { ping }, corsOrigin: "http://localhost:3000" });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  close = () => new Promise((resolve) => io.close(() => resolve()));
  return `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
}

describe("worker /health", () => {
  afterEach(async () => close?.());

  it("responde 200 cuando redis contesta", async () => {
    const base = await start(async () => "PONG");
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("responde 503 cuando redis no contesta", async () => {
    const base = await start(async () => { throw new Error("ECONNREFUSED"); });
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `docker compose run --rm tools pnpm install && docker compose run --rm tools pnpm --filter worker test`
Expected: FAIL, porque no se puede resolver `./server`.

- [ ] **Step 4: Implementar `server.ts`, `redis.ts` e `index.ts`**

`src/server.ts`:
```ts
import { createServer, type Server } from "node:http";
import { Server as SocketIOServer } from "socket.io";

export function createWorkerServer(deps: {
  redis: { ping: () => Promise<unknown> };
  corsOrigin: string;
}): { httpServer: Server; io: SocketIOServer } {
  const httpServer = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      let ok = true;
      try {
        await deps.redis.ping();
      } catch {
        ok = false;
      }
      res.writeHead(ok ? 200 : 503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok }));
      return;
    }
    if (!req.url?.startsWith("/socket.io")) {
      res.writeHead(404).end();
    }
  });
  const io = new SocketIOServer(httpServer, { cors: { origin: deps.corsOrigin, credentials: true } });
  return { httpServer, io };
}
```

`src/redis.ts`:
```ts
import IORedis from "ioredis";

let connection: IORedis | undefined;

// BullMQ exige maxRetriesPerRequest: null en las conexiones de sus workers.
export function getRedis(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not set");
    connection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return connection;
}
```

`src/index.ts`:
```ts
import { getRedis } from "./redis";
import { createWorkerServer } from "./server";

const port = Number(process.env.CHAT_SOCKET_PORT ?? 4001);
const corsOrigin = process.env.APP_URL ?? "http://localhost:3000";

const redis = getRedis();
const { httpServer, io } = createWorkerServer({ redis, corsOrigin });

httpServer.listen(port, () => {
  console.log(`[worker] escuchando en :${port}`);
});

async function shutdown(signal: string) {
  console.log(`[worker] ${signal}: cerrando`);
  io.close();
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
```

- [ ] **Step 5: Correr los tests y el typecheck**

Run: `docker compose run --rm tools pnpm --filter worker test && docker compose run --rm tools pnpm --filter worker typecheck`
Expected: PASS (2 tests) y sin errores de tipos.

- [ ] **Step 6: Agregar el servicio `worker` a `docker-compose.yml`**

```yaml
  worker:
    <<: *node
    command: pnpm --filter worker dev
    ports: ["4001:4001"]
    environment:
      <<: *node-env
      CHAT_SOCKET_PORT: "4001"
      APP_URL: http://localhost:3000
    depends_on:
      db-setup: { condition: service_completed_successfully }
      redis: { condition: service_healthy }
```

Run: `docker compose up -d --build worker && sleep 8 && curl -s localhost:4001/health && docker compose down`
Expected: `{"ok":true}`.

- [ ] **Step 7: Commit**

```bash
git add apps/worker docker-compose.yml pnpm-lock.yaml
git commit -m "feat(worker): servidor socket.io con health, listo para colas"
```

---

### Task 9: E2E con Playwright en Docker, README y verificación completa

**Files:**
- Create: `e2e/package.json`, `e2e/playwright.config.ts`, `e2e/tests/auth.spec.ts`
- Create: `README.md`
- Modify: `docker-compose.yml` (servicio `e2e` y volumen)

**Interfaces:**
- Consumes: todo lo anterior. La página `/registro` usa los campos `name`, `email` y `password` (formularios portados de la v1), y el botón "Crear y entrar".

- [ ] **Step 1: Crear el paquete e2e**

`e2e/package.json`:
```json
{
  "name": "e2e",
  "private": true,
  "scripts": { "test:e2e": "playwright test" },
  "devDependencies": { "@playwright/test": "1.55.0" }
}
```

`e2e/playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  retries: 0,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
});
```

- [ ] **Step 2: Escribir el test `e2e/tests/auth.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test("una alumna se registra, entra al dashboard y cierra sesión", async ({ page }) => {
  const email = `alumna-${Date.now()}@correo.cl`;

  await page.goto("/registro");
  await page.locator('input[name="name"]').fill("Camila Rojas");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Hola, Camila Rojas" })).toBeVisible();

  await page.getByLabel("Abrir menú de perfil").click();
  await page.getByRole("button", { name: "Cerrar sesion" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard|\/login\?callbackUrl=\/dashboard/);
});

test("el login acepta el email con otras mayúsculas", async ({ page, request }) => {
  const email = `mayus-${Date.now()}@correo.cl`;
  const res = await request.post("/api/auth/register", {
    headers: { Origin: "http://localhost:3000" },
    data: { name: "Diego", email, password: "clave-segura-123" },
  });
  expect(res.status()).toBe(201);

  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email.toUpperCase());
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
```

Los textos de los botones vienen de los archivos portados de la v1: "Crear y entrar" (registro), "Entrar" (login; el de Google tiene otro texto, por eso `exact: true`) y "Cerrar sesion" (`sign-out-button.tsx`, sin tilde en la v1).

- [ ] **Step 3: Agregar el servicio `e2e` a `docker-compose.yml`**

```yaml
  e2e:
    image: mcr.microsoft.com/playwright:v1.55.0-noble
    profiles: [e2e]
    working_dir: /app/e2e
    network_mode: "service:web"
    volumes:
      - .:/app
      - node_modules:/app/node_modules
      - e2e_node_modules:/app/e2e/node_modules
    command: ./node_modules/.bin/playwright test
    depends_on:
      web: { condition: service_started }
```

Agrega también `- e2e_node_modules:/app/e2e/node_modules` a `x-node.volumes`, para que `deps` instale ahí, y `e2e_node_modules:` en `volumes:`. Con `network_mode: "service:web"`, `localhost:3000` dentro del contenedor e2e es el web, así que las redirecciones de Auth.js a `AUTH_URL=http://localhost:3000` funcionan.

- [ ] **Step 4: Correr el e2e**

Run: `docker compose run --rm tools pnpm install && npm run dev` (en otra terminal, o con Ctrl+C para salir de los logs, ya que los contenedores siguen arriba). Espera a ver `Ready` en los logs de `web`.
Run: `npm run test:e2e`
Expected: `2 passed`.

- [ ] **Step 5: Escribir `README.md`**

````markdown
# syntaxError.cl v2

Academia gratuita para conseguir tu primer trabajo en tecnología. Spec: `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md`.

## Requisitos

Solo Docker (con Compose v2.24+) y npm. Todo lo demás corre en contenedores.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta todo (Postgres, Redis, Mailpit, migraciones y seed, web y worker) y muestra los logs. Ctrl+C sale de los logs; los servicios siguen arriba |
| `npm run stop` | Baja todo y conserva los datos |
| `npm run reset` | Baja todo y borra los datos (base, `node_modules`) |
| `npm test` | Tests unitarios y de integración contra `postgres-test` |
| `npm run test:e2e` | Tests end-to-end con Playwright (requiere `npm run dev` arriba) |
| `npm run sh` | Shell dentro del contenedor de herramientas (`pnpm`, `tsc`, etc.) |
| `npm run db:generate` | Genera una migración Drizzle a partir de `packages/db/src/schema.ts` |

## URLs locales

- Sitio: http://localhost:3000 (admin: `admin@local.test` / `admin123456`)
- Emails (Mailpit): http://localhost:8025
- Worker: http://localhost:4001/health

## Agregar un paquete al monorepo

Agrega su volumen `node_modules` en `x-node.volumes` de `docker-compose.yml` y en `volumes:`. Luego corre `docker compose run --rm tools pnpm install`.
````

- [ ] **Step 6: Verificación completa desde cero (Review Focus 4 y 5)**

Run: `npm run reset && rm -f .env && npm run dev`
Expected:
- construye la imagen;
- `deps` instala;
- `db-setup` imprime `[db] migraciones aplicadas` y `[seed] admin listo`;
- `web` imprime `Ready`;
- `worker` imprime `[worker] escuchando en :4001`.

Con los servicios arriba:
- `curl -s localhost:3000/api/health` debe responder `{"ok":true,"db":true,"redis":true}`;
- abre `http://localhost:3000`, cambia el texto del `<h1>` en `apps/web/src/app/(marketing)/page.tsx` desde el host y guarda: la página se actualiza sola en pocos segundos, sin reiniciar contenedores;
- revierte ese cambio.

Run: `npm test`
Expected: todos los paquetes en PASS (`@syntaxerror/db`, `@syntaxerror/ui`, `web` y `worker`).

Run: `npm run stop && docker compose ps`
Expected: ningún servicio corriendo.

Run: `npm run dev` otra vez y entra con el admin.
Expected: los datos del primer arranque siguen ahí (la cuenta creada en el e2e existe) y `db-setup` vuelve a terminar con código 0.

Run: `npm run stop`

- [ ] **Step 7: Commit**

```bash
git add e2e README.md docker-compose.yml pnpm-lock.yaml
git commit -m "test: e2e de registro y login en docker, y README con los comandos"
```
