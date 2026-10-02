# Fase 5b: Migración desde la v1. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un script que copia de la base de la v1 a la v2 lo que la gente necesita para seguir: su cuenta (con la misma clave o su cuenta de Google), sus certificados verificables en la misma URL y la bitácora con los registros ARCO.

**Architecture:**
- **`migrarV1(v1, db)`, en `apps/web/src/db/migrar-v1.ts`:**
  - Lee la v1 con SQL directo (un cliente `postgres`), sin importar su esquema.
  - Escribe en la v2 con Drizzle, en lotes de 500.
  - Nunca escribe en la v1.
  - Devuelve un informe por tabla: cuántos registros copió y cuántos omitió, con la razón.
- **Qué copia:**
  - **Usuarios:** el mismo `id`, el mismo hash de contraseña (bcrypt en las dos versiones) y el mismo rol.
    - El email pasa a minúsculas, porque el login de la v2 lo busca así.
    - Un rol desconocido queda como `student`.
    - Si el email ya es de otra cuenta de la v2, o se repite en la v1 al pasarlo a minúsculas, se omite y se informa.
  - **Cuentas de Google** de esos usuarios: con el mismo `AUTH_GOOGLE_ID`, el login con Google encuentra a la misma persona.
  - **Certificados:** pasan a `certificados_legacy` como una foto fija (código, nombre, curso o ruta, tipo y fecha), y `/verificar/<código>` los sigue encontrando. Como en la v1, si la persona no tiene nombre se muestra su email.
  - **Bitácora completa:** incluye los registros de derechos ARCO.
- **Qué no copia:**
  - Los **puntos**: en la v2 cada punto se gana en un caso, y los de la v1 son de cursos que no existen aquí. Se cuentan en el informe.
  - Tampoco el progreso, las inscripciones, las reseñas ni la caché del tutor (spec, sección 10).
- **Es idempotente:** lo que ya está en la v2 se omite. Se puede correr una vez para probar y otra el día del cambio, y la segunda solo agrega lo nuevo.
- **Se corre con `V1_DATABASE_URL=<v1> DATABASE_URL=<v2> pnpm --filter web migrar-v1`.** En la Fase 5c se corre desde el contenedor `tools`, con las conexiones públicas de las dos bases de Railway.

**Tech Stack:** postgres.js 3.4 (lectura de la v1), Drizzle ORM (escritura en la v2), Vitest contra `postgres-test`, con un esquema `v1` de prueba.

**Spec:** `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md`, sección 10 (Migración desde la v1) y sección 14 ("Los alumnos de la v1 entran con su cuenta y sus certificados siguen verificables en la misma URL").

**Diferencia con el spec:** el spec dice que los puntos se copian, pero no se pueden copiar porque la v2 exige un caso para cada punto. El informe los cuenta. Si el equipo quiere conservarlos, se puede agregar una tabla `puntos_legacy` en otra fase.

## Global Constraints

**Copia literal:** cada archivo completo de este plan se copia exactamente como está, con sus comentarios. Antes de cada commit, compáralo con `diff`.

**Entorno**
- Todo se ejecuta con `docker compose run --rm tools ...`.
- El paquete de la app se llama `web`, que no es un módulo ES: las CLI no usan `await` en el nivel superior.

**Datos personales**
- La migración nunca escribe en la v1 y no imprime datos de personas: el informe solo tiene conteos.
- Las pruebas usan datos inventados.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Una persona de la v1 cuyo email ya existe en la v2,** por ejemplo el admin que crea el release. No se pisa la cuenta de la v2: se omite y se informa. Probado en `migrar-v1.test.ts`.
2. **Emails con mayúsculas en la v1**, como `Ana@Correo.cl`. Pasan a minúsculas para que la persona pueda entrar. Si dos se vuelven iguales, se copia el más antiguo y el otro se informa. Probado.
3. **Correr la migración dos veces:** la segunda no copia nada y no duplica certificados ni bitácora. Probado.
4. **El esquema real de la v1:** la Task 2, Step 3 aplica las 13 migraciones de la v1 en una base temporal y corre la CLI dos veces contra ella.
5. **Un certificado de la v1 sin curso ni ruta** (se borraron): se omite, porque no hay qué título mostrar, y se informa. Probado.

## Estructura de archivos

```
apps/web/src/db/migrar-v1.ts (+ test)    la migración y su informe
apps/web/src/db/migrar-v1-cli.ts         la CLI
apps/web/package.json, pnpm-lock.yaml     script migrar-v1 y la dependencia postgres
README.md
```

---

### Task 1: La migración

**Files:**
- Create: `apps/web/src/db/migrar-v1.ts`
- Test: `apps/web/src/db/migrar-v1.test.ts`
- Modify: `apps/web/package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes:
  - `normalizeEmail` (`@/app/api/auth/register/service`) y `esRol` (`@/lib/roles`);
  - `buscarCertificado` (`@/lib/certificados/servicio`), que ya busca en `certificados_legacy`.
- Produces:
  - `migrarV1(v1: Sql, db: AppDb): Promise<InformeMigracion>`;
  - `textoDelInforme(informe): string[]`;
  - los tipos `ResultadoTabla = { tabla, copiados, omitidos: Record<razón, cantidad> }` e `InformeMigracion`;
  - `RAZONES`.

- [ ] **Step 1: La dependencia**

En `apps/web/package.json`, agrega `"postgres": "^3.4.0"` a `dependencies`, en orden alfabético. Es la misma versión que usa `@syntaxerror/db`.

Run: `docker compose run --rm --no-deps tools pnpm install --no-frozen-lockfile`
Expected: `pnpm-lock.yaml` agrega `postgres` a web (3 líneas).

- [ ] **Step 2: Escribir las pruebas**

`apps/web/src/db/migrar-v1.test.ts`:
```ts
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { accounts, auditLog, certificadosLegacy, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { buscarCertificado } from "@/lib/certificados/servicio";
import { hashPassword, verifyPassword } from "@/lib/password";
import { migrarV1, RAZONES, textoDelInforme } from "./migrar-v1";

const { db, close } = createTestDb();
// La v1 se simula con un esquema aparte en la misma base de pruebas, con las columnas que lee la migración.
const v1 = postgres(process.env.DATABASE_URL_TEST!, { max: 1, onnotice: () => {}, connection: { search_path: "v1" } });

const ESQUEMA_V1 = `
  drop schema if exists v1 cascade;
  create schema v1;
  create table v1.users (
    id uuid primary key, name text, email text not null unique, email_verified timestamp, image text, password_hash text,
    role text not null default 'student', created_at timestamp not null default now(), updated_at timestamp not null default now(),
    abandonment_emails_opt_out boolean not null default false
  );
  create table v1.accounts (
    user_id uuid not null references v1.users(id) on delete cascade, type text not null, provider text not null,
    provider_account_id text not null, refresh_token text, access_token text, expires_at integer, token_type text, scope text,
    id_token text, session_state text, primary key (provider, provider_account_id)
  );
  create table v1.courses (id uuid primary key, slug text not null, title text not null);
  create table v1.learning_paths (id uuid primary key, slug text not null, title text not null);
  create table v1.certificates (
    id uuid primary key default gen_random_uuid(), user_id uuid not null references v1.users(id) on delete cascade,
    certificate_type text not null, course_id uuid, learning_path_id uuid, verification_code text not null unique,
    issued_at timestamp not null default now(), created_at timestamp not null default now()
  );
  create table v1.audit_log (
    id uuid primary key default gen_random_uuid(), created_at timestamp not null default now(), actor_id uuid, actor_email text,
    action text not null, target_type text, target_id uuid, metadata jsonb not null default '{}', ip_address text, user_agent text
  );
  create table v1.point_transactions (
    id uuid primary key default gen_random_uuid(), user_id uuid not null, course_id uuid not null, lesson_slug text not null,
    amount integer not null, reason text not null, created_at timestamp not null default now()
  );
`;

const ANA = "11111111-1111-4111-8111-111111111111";
const BETO = "22222222-2222-4222-8222-222222222222";
const CURSO = "33333333-3333-4333-8333-333333333333";
const RUTA = "44444444-4444-4444-8444-444444444444";

async function poblarV1() {
  const hash = await hashPassword("clave-de-ana-123");
  await v1`insert into users (id, name, email, password_hash, role, email_verified, created_at)
            values (${ANA}, 'Ana Rojas', 'Ana@Correo.cl', ${hash}, 'teacher', '2026-03-01', '2026-03-01'),
                   (${BETO}, null, 'beto@correo.cl', null, 'superusuario', null, '2026-04-01')`;
  await v1`insert into accounts (user_id, type, provider, provider_account_id) values (${BETO}, 'oidc', 'google', 'google-beto')`;
  await v1`insert into courses (id, slug, title) values (${CURSO}, 'aula-sql', 'SQL desde cero')`;
  await v1`insert into learning_paths (id, slug, title) values (${RUTA}, 'datos', 'Ruta de datos')`;
  await v1`insert into certificates (user_id, certificate_type, course_id, learning_path_id, verification_code, issued_at)
           values (${ANA}, 'course', ${CURSO}, null, 'V1CURSO0001', '2026-05-01'),
                  (${BETO}, 'path', null, ${RUTA}, 'V1RUTA00001', '2026-06-01'),
                  (${ANA}, 'course', null, null, 'V1HUERFANO1', '2026-06-02')`;
  await v1`insert into audit_log (actor_email, action, target_type) values ('ana@correo.cl', 'account_deleted', 'user'), (null, 'login_failed', null)`;
  await v1`insert into point_transactions (user_id, course_id, lesson_slug, amount, reason)
           values (${ANA}, ${CURSO}, 'select', 10, 'leccion'), (${ANA}, ${CURSO}, 'where', 10, 'leccion')`;
}

describe("migrarV1", () => {
  beforeEach(async () => {
    await truncateAll(db);
    await v1.unsafe(ESQUEMA_V1);
  });
  afterAll(async () => {
    await v1.unsafe("drop schema if exists v1 cascade");
    await v1.end();
    await close();
  });

  it("copia usuarios con su id, su clave y su rol, sus cuentas de Google, los certificados y la bitácora", async () => {
    await poblarV1();
    const informe = await migrarV1(v1, db);
    expect(textoDelInforme(informe)).toEqual([
      "[migrar-v1] usuarios: 2 copiados",
      "[migrar-v1] cuentas de Google: 1 copiados",
      `[migrar-v1] certificados: 2 copiados; omitidos: 1 ${RAZONES.sinTitulo}`,
      "[migrar-v1] bitácora: 2 copiados",
      `[migrar-v1] puntos: 0 copiados; omitidos: 2 ${RAZONES.cursosV1}`,
    ]);

    const [ana] = await db.select().from(users).where(eq(users.id, ANA));
    expect(ana).toMatchObject({ email: "ana@correo.cl", name: "Ana Rojas", role: "teacher", usuario: null, portafolioPublico: false });
    expect(await verifyPassword("clave-de-ana-123", ana.passwordHash!)).toBe(true);
    const [beto] = await db.select().from(users).where(eq(users.id, BETO));
    expect(beto).toMatchObject({ email: "beto@correo.cl", role: "student", passwordHash: null });
    expect(await db.select({ userId: accounts.userId, provider: accounts.provider }).from(accounts)).toEqual([{ userId: BETO, provider: "google" }]);
    expect(await db.select().from(auditLog)).toHaveLength(2);
  });

  it("los certificados de la v1 se siguen verificando en la misma URL", async () => {
    await poblarV1();
    await migrarV1(v1, db);
    expect(await buscarCertificado(db, "V1CURSO0001")).toMatchObject({ tipo: "curso", titulo: "SQL desde cero", nombreAlumno: "Ana Rojas", legado: true });
    // Sin nombre, se muestra el email, como en la v1.
    expect(await buscarCertificado(db, "V1RUTA00001")).toMatchObject({ tipo: "ruta", titulo: "Ruta de datos", nombreAlumno: "beto@correo.cl", legado: true });
    expect(await buscarCertificado(db, "V1HUERFANO1")).toBeNull();
  });

  it("es idempotente: la segunda corrida no copia nada y deja todo igual", async () => {
    await poblarV1();
    await migrarV1(v1, db);
    expect(textoDelInforme(await migrarV1(v1, db))).toEqual([
      `[migrar-v1] usuarios: 0 copiados; omitidos: 2 ${RAZONES.yaMigrado}`,
      `[migrar-v1] cuentas de Google: 0 copiados; omitidos: 1 ${RAZONES.yaMigrado}`,
      `[migrar-v1] certificados: 0 copiados; omitidos: 1 ${RAZONES.sinTitulo}, 2 ${RAZONES.yaMigrado}`,
      `[migrar-v1] bitácora: 0 copiados; omitidos: 2 ${RAZONES.yaMigrado}`,
      `[migrar-v1] puntos: 0 copiados; omitidos: 2 ${RAZONES.cursosV1}`,
    ]);
    expect(await db.select().from(users)).toHaveLength(2);
    expect(await db.select().from(certificadosLegacy)).toHaveLength(2);
  });

  it("no pisa una cuenta de la v2 con el mismo email ni copia un email repetido al pasarlo a minúsculas", async () => {
    await db.insert(users).values({ email: "ana@correo.cl", role: "admin", name: "Admin de la v2" });
    await poblarV1();
    await v1`insert into users (id, email) values ('55555555-5555-4555-8555-555555555555', 'BETO@correo.cl')`;
    const [usuarios, cuentas] = await migrarV1(v1, db);
    expect(usuarios).toEqual({ tabla: "usuarios", copiados: 1, omitidos: { [RAZONES.emailOcupado]: 1, [RAZONES.emailRepetido]: 1 } });
    expect(cuentas.copiados).toBe(1);
    const [admin] = await db.select().from(users).where(eq(users.email, "ana@correo.cl"));
    expect(admin).toMatchObject({ role: "admin", name: "Admin de la v2" });
  });
});
```

- [ ] **Step 3: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/db/migrar-v1.test.ts`
Expected: FAIL, "Failed to resolve import ./migrar-v1".

- [ ] **Step 4: Implementar**

`apps/web/src/db/migrar-v1.ts`:
```ts
import type { Sql } from "postgres";
import type { AppDb } from "@syntaxerror/db/client";
import { accounts, auditLog, certificadosLegacy, users } from "@syntaxerror/db/schema";
import { normalizeEmail } from "@/app/api/auth/register/service";
import { esRol } from "@/lib/roles";

// Migración desde la v1 (spec, sección 10). Lee la base de la v1 con SQL directo, sin importar su esquema, y escribe en
// la v2. Es idempotente: lo que ya está en la v2 se omite, así que se puede correr varias veces (por ejemplo, una
// prueba antes del lanzamiento y otra el día del cambio). Nunca escribe en la v1.

export type ResultadoTabla = { tabla: string; copiados: number; omitidos: Record<string, number> };
export type InformeMigracion = ResultadoTabla[];

export const RAZONES = {
  yaMigrado: "ya estaba en la v2",
  emailOcupado: "el email ya es de otra cuenta de la v2",
  emailRepetido: "el email se repite en la v1 al pasarlo a minúsculas",
  sinUsuario: "su usuario no se migró",
  sinTitulo: "no tiene curso ni ruta",
  cursosV1: "son de cursos de la v1, que no existen en la v2",
} as const;

const LOTE = 500;

function resultado(tabla: string): ResultadoTabla {
  return { tabla, copiados: 0, omitidos: {} };
}

function omitir(informe: ResultadoTabla, razon: string, cantidad = 1): void {
  if (cantidad > 0) informe.omitidos[razon] = (informe.omitidos[razon] ?? 0) + cantidad;
}

function enLotes<T>(filas: T[]): T[][] {
  const lotes: T[][] = [];
  for (let inicio = 0; inicio < filas.length; inicio += LOTE) lotes.push(filas.slice(inicio, inicio + LOTE));
  return lotes;
}

type UsuarioV1 = {
  id: string;
  name: string | null;
  email: string;
  email_verified: Date | null;
  image: string | null;
  password_hash: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
  abandonment_emails_opt_out: boolean;
};

// Mismo id, mismo hash de contraseña y mismo rol: la persona entra con su clave o su cuenta de Google de siempre.
// Devuelve los ids de la v1 que quedan en la v2, sea que se copiaron ahora o en una corrida anterior.
async function migrarUsuarios(v1: Sql, db: AppDb, informe: ResultadoTabla): Promise<Set<string>> {
  const filas = await v1<UsuarioV1[]>`
    select id, name, email, email_verified, image, password_hash, role, created_at, updated_at, abandonment_emails_opt_out
    from users order by created_at, id`;
  const existentes = await db.select({ id: users.id, email: users.email }).from(users);
  const idPorEmail = new Map(existentes.map((fila) => [fila.email, fila.id]));
  const idsV2 = new Set(existentes.map((fila) => fila.id));
  const presentes = new Set<string>();
  const vistos = new Set<string>();
  const nuevos: (typeof users.$inferInsert)[] = [];

  for (const fila of filas) {
    const email = normalizeEmail(fila.email);
    if (idsV2.has(fila.id)) {
      presentes.add(fila.id);
      omitir(informe, RAZONES.yaMigrado);
      continue;
    }
    if (vistos.has(email)) {
      omitir(informe, RAZONES.emailRepetido);
      continue;
    }
    vistos.add(email);
    if (idPorEmail.has(email)) {
      omitir(informe, RAZONES.emailOcupado);
      continue;
    }
    nuevos.push({
      id: fila.id,
      name: fila.name,
      email,
      emailVerified: fila.email_verified,
      image: fila.image,
      passwordHash: fila.password_hash,
      // Un rol que la v2 no conoce queda como estudiante: nadie gana permisos por la migración.
      role: esRol(fila.role) ? fila.role : "student",
      createdAt: fila.created_at,
      updatedAt: fila.updated_at,
      abandonmentEmailsOptOut: fila.abandonment_emails_opt_out,
    });
  }
  for (const lote of enLotes(nuevos)) {
    const copiados = await db.insert(users).values(lote).onConflictDoNothing().returning({ id: users.id });
    informe.copiados += copiados.length;
    for (const { id } of copiados) presentes.add(id);
    omitir(informe, RAZONES.yaMigrado, lote.length - copiados.length);
  }
  return presentes;
}

type CuentaV1 = {
  user_id: string;
  type: string;
  provider: string;
  provider_account_id: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
};

// Las cuentas de Google: con el mismo AUTH_GOOGLE_ID, el login con Google encuentra a la misma persona.
async function migrarCuentas(v1: Sql, db: AppDb, presentes: Set<string>, informe: ResultadoTabla): Promise<void> {
  const filas = await v1<CuentaV1[]>`
    select user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state
    from accounts`;
  const validas = filas.filter((fila) => presentes.has(fila.user_id));
  omitir(informe, RAZONES.sinUsuario, filas.length - validas.length);
  for (const lote of enLotes(validas)) {
    const copiados = await db
      .insert(accounts)
      .values(
        lote.map((fila) => ({
          userId: fila.user_id,
          type: fila.type,
          provider: fila.provider,
          providerAccountId: fila.provider_account_id,
          refresh_token: fila.refresh_token,
          access_token: fila.access_token,
          expires_at: fila.expires_at,
          token_type: fila.token_type,
          scope: fila.scope,
          id_token: fila.id_token,
          session_state: fila.session_state,
        }))
      )
      .onConflictDoNothing()
      .returning({ userId: accounts.userId });
    informe.copiados += copiados.length;
    omitir(informe, RAZONES.yaMigrado, lote.length - copiados.length);
  }
}

type CertificadoV1 = { codigo: string; tipo: string; emitido_en: Date; nombre: string | null; email: string; titulo: string | null };

// Una foto fija: el código, a quién se emitió, de qué curso o ruta y cuándo. Así /verificar/<código> sigue
// respondiendo con las URLs que ya circulan. Como en la v1, si la persona no tiene nombre se muestra su email.
async function migrarCertificados(v1: Sql, db: AppDb, informe: ResultadoTabla): Promise<void> {
  const filas = await v1<CertificadoV1[]>`
    select c.verification_code as codigo, c.certificate_type as tipo, c.issued_at as emitido_en,
           u.name as nombre, u.email, coalesce(co.title, lp.title) as titulo
    from certificates c
    join users u on u.id = c.user_id
    left join courses co on co.id = c.course_id
    left join learning_paths lp on lp.id = c.learning_path_id
    order by c.issued_at, c.verification_code`;
  const validos = filas.filter((fila) => fila.titulo);
  omitir(informe, RAZONES.sinTitulo, filas.length - validos.length);
  for (const lote of enLotes(validos)) {
    const copiados = await db
      .insert(certificadosLegacy)
      .values(
        lote.map((fila) => ({
          codigo: fila.codigo,
          nombreAlumno: fila.nombre?.trim() || fila.email,
          titulo: fila.titulo!,
          tipo: fila.tipo === "path" ? "ruta" : "curso",
          emitidoEn: fila.emitido_en,
        }))
      )
      .onConflictDoNothing()
      .returning({ codigo: certificadosLegacy.codigo });
    informe.copiados += copiados.length;
    omitir(informe, RAZONES.yaMigrado, lote.length - copiados.length);
  }
}

type EventoV1 = {
  id: string;
  created_at: Date;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
};

// La bitácora completa, incluidos los registros de derechos ARCO (eliminaciones y cambios de cuenta), por historial y
// obligación legal. La limpieza por antigüedad del worker (RETENCION_BITACORA_DIAS) también se les aplica.
async function migrarBitacora(v1: Sql, db: AppDb, informe: ResultadoTabla): Promise<void> {
  const filas = await v1<EventoV1[]>`
    select id, created_at, actor_id, actor_email, action, target_type, target_id, metadata, ip_address, user_agent
    from audit_log order by created_at, id`;
  for (const lote of enLotes(filas)) {
    const copiados = await db
      .insert(auditLog)
      .values(
        lote.map((fila) => ({
          id: fila.id,
          createdAt: fila.created_at,
          actorId: fila.actor_id,
          actorEmail: fila.actor_email,
          action: fila.action,
          targetType: fila.target_type,
          targetId: fila.target_id,
          metadata: fila.metadata ?? {},
          ipAddress: fila.ip_address,
          userAgent: fila.user_agent,
        }))
      )
      .onConflictDoNothing()
      .returning({ id: auditLog.id });
    informe.copiados += copiados.length;
    omitir(informe, RAZONES.yaMigrado, lote.length - copiados.length);
  }
}

// En la v2 cada punto se gana en un caso. Los de la v1 se ganaron en cursos que no existen aquí: se cuentan y se
// informan, pero no se copian.
async function contarPuntos(v1: Sql, informe: ResultadoTabla): Promise<void> {
  const [{ cantidad }] = await v1<{ cantidad: number }[]>`select count(*)::int as cantidad from point_transactions`;
  omitir(informe, RAZONES.cursosV1, cantidad);
}

export async function migrarV1(v1: Sql, db: AppDb): Promise<InformeMigracion> {
  const usuarios = resultado("usuarios");
  const cuentas = resultado("cuentas de Google");
  const certificados = resultado("certificados");
  const bitacora = resultado("bitácora");
  const puntos = resultado("puntos");

  const presentes = await migrarUsuarios(v1, db, usuarios);
  await migrarCuentas(v1, db, presentes, cuentas);
  await migrarCertificados(v1, db, certificados);
  await migrarBitacora(v1, db, bitacora);
  await contarPuntos(v1, puntos);
  return [usuarios, cuentas, certificados, bitacora, puntos];
}

export function textoDelInforme(informe: InformeMigracion): string[] {
  return informe.map(({ tabla, copiados, omitidos }) => {
    const detalle = Object.entries(omitidos).map(([razon, cantidad]) => `${cantidad} ${razon}`);
    return `[migrar-v1] ${tabla}: ${copiados} copiados${detalle.length ? `; omitidos: ${detalle.join(", ")}` : ""}`;
  });
}

```

- [ ] **Step 5: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec vitest run src/db/migrar-v1.test.ts && pnpm --filter web exec tsc --noEmit"`
Expected: PASS (4 pruebas) y sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/db/migrar-v1.ts apps/web/src/db/migrar-v1.test.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(migracion): copiar usuarios, cuentas, certificados y bitacora desde la v1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: La CLI, probada contra el esquema real de la v1

**Files:**
- Create: `apps/web/src/db/migrar-v1-cli.ts`
- Modify: `apps/web/package.json`, `README.md`

**Interfaces:**
- Consumes: `migrarV1` y `textoDelInforme` (Task 1).
- Produces: `pnpm --filter web migrar-v1`, que lee `V1_DATABASE_URL` y `DATABASE_URL`. Falla si falta alguna o si las dos apuntan a la misma base.

- [ ] **Step 1: La CLI**

`apps/web/src/db/migrar-v1-cli.ts`:
```ts
import postgres from "postgres";
import { createDb } from "@syntaxerror/db/client";
import { migrarV1, textoDelInforme } from "./migrar-v1";

// Uso: V1_DATABASE_URL=<base de la v1> DATABASE_URL=<base de la v2> pnpm --filter web migrar-v1
// La v2 ya debe tener sus migraciones aplicadas (release). La v1 solo se lee.
async function main(origen: string, destino: string) {
  const v1 = postgres(origen, { max: 1 });
  const { db, close } = createDb(destino);
  try {
    for (const linea of textoDelInforme(await migrarV1(v1, db))) console.log(linea);
  } finally {
    await v1.end();
    await close();
  }
}

const origen = process.env.V1_DATABASE_URL;
const destino = process.env.DATABASE_URL;
if (!origen) throw new Error("V1_DATABASE_URL is not set");
if (!destino) throw new Error("DATABASE_URL is not set");
if (origen === destino) throw new Error("V1_DATABASE_URL y DATABASE_URL apuntan a la misma base");

main(origen, destino).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
```

En `apps/web/package.json`, en `scripts`, después de `release`, agrega:
```json
    "migrar-v1": "tsx src/db/migrar-v1-cli.ts",
```

- [ ] **Step 2: README**

Agrega al final de `## Producción` en `README.md`:
```markdown
- **Migración desde la v1:** `apps/web/src/db/migrar-v1.ts`, que se corre con `V1_DATABASE_URL=<v1> DATABASE_URL=<v2> pnpm --filter web migrar-v1`.
  - Copia los usuarios (mismo id, hash de contraseña y rol, con el email en minúsculas), sus cuentas de Google, los certificados (a `certificados_legacy`, verificables en la misma URL) y la bitácora.
  - Los puntos de la v1 no se copian: son de cursos que no existen en la v2.
  - Solo lee la v1, es idempotente y al final imprime cuántos registros copió y cuántos omitió, con la razón.
```

- [ ] **Step 3: Probar contra el esquema real de la v1**

Aplica las 13 migraciones de la v1 (`~/Documents/desarrollo/cursos/packages/db/drizzle`) en una base temporal de `postgres-test`, agrega una persona con su cuenta de Google, un certificado, un evento y un punto, y corre la CLI dos veces contra una v2 recién migrada. Desde la raíz de la v2:

```bash
docker compose up -d --wait postgres-test
docker compose exec -T postgres-test psql -U platform -d platform_test -qc "drop database if exists v1_real" -c "create database v1_real" -c "drop database if exists v2_prueba" -c "create database v2_prueba"
find ../cursos/packages/db/drizzle -maxdepth 1 -name "*.sql" | sort | while IFS= read -r f; do
  sed 's/--> statement-breakpoint//' "$f" | docker compose exec -T postgres-test psql -U platform -d v1_real -q -v ON_ERROR_STOP=1 >/dev/null || echo "FALLO $f"
done
docker compose exec -T postgres-test psql -U platform -d v1_real -q -v ON_ERROR_STOP=1 <<'SQL'
insert into users (id, name, email, password_hash, role) values ('11111111-1111-4111-8111-111111111111', 'Ana Rojas', 'Ana@Correo.cl', '$2a$10$abcdefghijklmnopqrstuuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0', 'student');
insert into accounts (user_id, type, provider, provider_account_id) values ('11111111-1111-4111-8111-111111111111', 'oidc', 'google', 'g-ana');
insert into courses (id, slug, title) values ('33333333-3333-4333-8333-333333333333', 'aula-sql', 'SQL desde cero');
insert into certificates (user_id, certificate_type, course_id, verification_code) values ('11111111-1111-4111-8111-111111111111', 'course', '33333333-3333-4333-8333-333333333333', 'REALV1CODE01');
insert into audit_log (action) values ('account_deleted');
insert into point_transactions (user_id, course_id, lesson_slug, amount, reason) values ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'select', 10, 'leccion');
SQL
docker compose run --rm tools sh -c 'export DATABASE_URL=postgres://platform:platform@postgres-test:5432/v2_prueba; pnpm --filter @syntaxerror/db migrate >/dev/null && cd apps/web && for i in 1 2; do V1_DATABASE_URL=postgres://platform:platform@postgres-test:5432/v1_real pnpm -s migrar-v1; done'
docker compose exec -T postgres-test psql -U platform -d platform_test -qc "drop database v1_real" -c "drop database v2_prueba"
```

Expected:
- ningún `FALLO` al aplicar las migraciones de la v1;
- la primera corrida:
```
[migrar-v1] usuarios: 1 copiados
[migrar-v1] cuentas de Google: 1 copiados
[migrar-v1] certificados: 1 copiados
[migrar-v1] bitácora: 1 copiados
[migrar-v1] puntos: 0 copiados; omitidos: 1 son de cursos de la v1, que no existen en la v2
```
- en la segunda, cada tabla con `0 copiados; omitidos: 1 ya estaba en la v2`, salvo puntos, que repite la línea de la primera.

Si `ls` está personalizado en tu terminal, usa `find`, como en el bucle de arriba: las columnas extra de `ls` rompen el bucle.

- [ ] **Step 4: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes (606 pruebas; web 337).

Run: `npm run test:e2e`
Expected: `39 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/db/migrar-v1-cli.ts apps/web/package.json README.md
git commit -m "feat(migracion): cli migrar-v1 con informe, probada contra el esquema real de la v1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Fase 5c: publicar en Railway.** La hago yo con el MCP, confirmando contigo cada paso que crea o cambia algo:
1. **Proyecto nuevo `syntaxerror-v2`:**
   - Postgres con la imagen `pgvector/pgvector:pg16`, la misma de desarrollo;
   - Redis;
   - `web` y `worker` conectados a `LuN4t1k0/syntaxErrorV2`, cada uno con su `railway.*.json`.
2. **Variables:**
   - las cargo yo: referencias a Postgres y Redis, `AUTH_SECRET` y `CHAT_SOCKET_SECRET` nuevas, Google y Gemini;
   - las pegas tú: `RESEND_API_KEY`, `EMAIL_FROM` y las de Sentry, desde la v1;
   - `GITHUB_TOKEN`, que hay que crear.
3. **Dominio de prueba:** primero un subdominio (por ejemplo `nuevo.syntaxerror.cl`) o el que genera Railway, más el dominio del socket del worker.
4. **Migración:** se habilita la conexión pública de las dos bases solo mientras dura, y se corre `migrar-v1`.
5. **Revisión completa en el dominio de prueba:**
   - login con clave y con Google de una cuenta migrada;
   - un certificado de la v1 verificado;
   - el tutor, los emails, la memoria y el costo.
6. **Lanzamiento:**
   - mover `syntaxerror.cl` a la v2 (registro DNS);
   - correr la migración de nuevo, para sumar lo último de la v1;
   - apagar `cursos` y `worker` de la v1.
