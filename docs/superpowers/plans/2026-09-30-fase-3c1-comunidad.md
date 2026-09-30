# Fase 3c1: Comunidad. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar la comunidad de la v1, adaptada a casos y misiones:
- preguntas a un docente desde cada misión, con aviso en vivo y por email;
- solicitudes de acceso docente;
- clases de docentes con casos asignados, código para unirse y aprobación de inscripciones;
- puntos y niveles;
- reseñas por caso con comentarios moderados;
- reportes de errores y sugerencias;
- mensajes internos.

**Architecture:**
- **Datos:** nueve tablas nuevas con los nombres de la v1 donde el spec los conserva (`point_transactions`, `teacher_requests`, `teacher_questions`, `classes`, `class_enrollments`, `feedback_reports`, `user_messages`) y dos renombradas (`clase_casos`, `resenas_caso`). Columnas en español, como el resto de la v2.
- **Roles:** `users.role` es `student`, `teacher` o `admin`. Los permisos se leen desde la base en cada request con `obtenerUsuarioActual()`, no desde el JWT. Así un cambio de rol rige al instante y una cuenta eliminada deja de tener acceso aunque su sesión siga abierta en otro dispositivo. `teacher` y `admin` cuentan como docentes.
- **Emails:** ocho tipos nuevos en la cola `emails`, que envía el worker.
- **Avisos en vivo:** una cola nueva, `avisos`. La web encola `{ salas, evento, datos }` y el worker lo emite por socket.io.
  - El navegador entra a la sala `usuario:<id>` con un token HMAC de propósito `usuario`, el mismo mecanismo del tutor.
  - Las páginas de preguntas se refrescan solas con `router.refresh()`.
  - Si Redis o el socket fallan, la página se actualiza al recargarla.
- **Puntos:**
  - 10 por misión aprobada, 50 por caso completo y 5 por acertar una `Decision` en la primera respuesta.
  - Un índice único `(usuario, caso, clave)` hace que cada logro sume una sola vez.
  - Nivel = `floor(puntos / 100) + 1`.
- **Quién responde una pregunta:**
  - la toma el docente de la clase activa del alumno que tiene habilitado ese caso;
  - si no hay clase, va al grupo de administración;
  - el docente asignado y cualquier admin pueden responderla.
- **Páginas:**
  - Las de misión y caso siguen estáticas (`dynamic = "error"`): la pregunta al docente, las reseñas y los puntos de las decisiones son componentes de cliente que llaman a la API.
  - Las páginas de docente viven en `/profesor` y las del alumno en `/dashboard/*`.
- **Admin:** la moderación de reseñas, la decisión de solicitudes docentes y la respuesta a reportes quedan como funciones con tests. Sus pantallas llegan en la Fase 3c2 (Admin).

**Tech Stack:** Node 22, pnpm 11.9.0, Next.js 15, React 19, TypeScript 5, Drizzle ORM 0.36, BullMQ 5, socket.io 4.8, zod 3, Vitest 4, Playwright 1.55.

**Spec:** `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md`. Secciones:
- 7.5: las `Decision` cuentan para puntos;
- 8: tablas que se portan;
- 9: Comunidad y emails temáticos;
- 12: permisos de admin, profesor y alumno;
- 16: Fase 3.

## Global Constraints

**Entorno**
- Todo se ejecuta en contenedores. Ningún paso corre `pnpm` o `node` en el host: se usa `docker compose run --rm tools ...`.
- Si los contenedores de la v1 (`cursos-*`) están arriba, ocupan los puertos 5432, 5433, 6379, 1025 y 8025. Detenlos antes con `docker compose -p cursos stop`.

**Texto visible**
- Va en español de Chile, con tildes y `¿`/`¡`, tratando de tú y sin voseo.
- Usa lenguaje neutro: "docente" y "estudiante" en vez de "profesor/a" o "alumno/a". Las rutas y los nombres de tablas conservan `profesor` por compatibilidad con la v1.

**Páginas**
- Las páginas de misión y de caso siguen con `dynamic = "error"` y se sirven con `x-nextjs-cache: HIT`.
- Nada de esta fase llama a `auth()` en esas páginas ni en los layouts `(misiones)` y `(cuenta)`.

**Permisos y validación en rutas de API**
- Las rutas que dependen del rol usan `exigirUsuario()` o `exigirDocente()` de `@/lib/permisos`, que leen el rol desde la base.
- Toda ruta con un id en la URL valida que sea UUID antes de consultar la base. Si no lo es, responde 404, nunca 500.

**Avisos y emails**
- Los emails y avisos de esta fase son avisos: se encolan con `encolarSinFallar` y `avisarSinFallar`. Si Redis no responde, la acción del estudiante o docente igual se completa.

**Tests**
- Los tests de rutas mockean `@/lib/sesion`, `@/lib/emails` y `@/lib/avisos`. No encolan en Redis real.
- La excepción es `redis-caido.test.ts` (Task 9): usa las colas reales contra un Redis que no existe.

**Commits**
- Mensajes en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Id que no es UUID en la URL.** Ejemplos: `/api/mensajes/abc`, `/api/profesor/preguntas/123/respuesta`, `/profesor/clases/xyz`. Debe responder 404, no un 500 por el error de Postgres. Tests en Tasks 5, 7 y 9.
2. **Un docente o estudiante que intenta actuar sobre algo ajeno.** Ejemplos: ver o cambiar la clase de otro docente, o responder una pregunta asignada a otro docente. Debe responder 404 o 403, sin cambiar nada. Tests en Tasks 7 y 9.
3. **Doble envío o carrera.**
   - Dos respuestas a la misma pregunta: gana una y la otra recibe 404.
   - Dos reseñas del mismo caso: la segunda recibe 409.
   - Aprobar la misma misión o responder la misma decisión dos veces: suma una sola vez.
   - Unirse dos veces a una clase: no crea dos inscripciones.
   - Tests en Tasks 3, 4, 7 y 9.
4. **Redis caído.** Crear y responder una pregunta siguen funcionando aunque no se pueda encolar el email ni el aviso. Test en Task 9, con las colas reales contra un Redis que no existe. Reportes, reseñas, clases y solicitudes usan el mismo `encolarSinFallar`, que nunca lanza.
5. **Cuenta eliminada con la sesión abierta en otro dispositivo.** Las rutas de comunidad responden 401: `obtenerUsuarioActual()` no encuentra el usuario en la base. Test en Task 1.

## Estructura de archivos

```
packages/db/src/
  schema.ts                                   tablas de comunidad
  audit.ts                                    acciones y tipos de destino nuevos
  comunidad.test.ts                           índices únicos y borrado en cascada
packages/queue/src/
  emails.ts                                   ocho emails nuevos
  eventos.ts                                  sala y eventos por usuario
  avisos.ts                                   cola "avisos"
apps/worker/src/
  emails/mensajes.ts                          textos de los emails nuevos
  avisos/procesar.ts                          emite los avisos por socket.io
  server.ts                                   sockets de propósito "usuario"
  index.ts                                    worker de avisos
apps/web/src/lib/
  roles.ts                                    roles, esDocente, listarAdmins
  sesion.ts                                   obtenerUsuarioActual (rol desde la base)
  permisos.ts                                 exigirUsuario, exigirDocente
  uuid.ts                                     esUuid
  avisos.ts                                   avisarSinFallar
  puntos/niveles.ts, puntos/servicio.ts       puntos, niveles y decisiones
  resenas.ts                                  reseñas por caso y moderación
  reportes.ts, mensajes.ts                    reportes y mensajes internos
  docentes.ts                                 solicitudes de acceso docente
  clases/codigo.ts, clases/servicio.ts        clases, inscripciones y avance
  preguntas-profesor.ts                       preguntas a docentes
apps/web/src/app/api/
  avisos/token                                token del socket por usuario
  puntos/decision                             primera respuesta a una decisión
  resenas                                     resumen, mi reseña y publicar
  reportes, mensajes/[id]                     reportar y marcar leído
  docentes/solicitud                          estado y pedir acceso docente
  clases/unirse                               unirse con código
  profesor/clases/**                          crear clase, casos y alumnos
  preguntas-profesor                          preguntar desde la misión
  profesor/preguntas/[id]/respuesta           responder
apps/web/src/components/
  avisos/refrescar-con-avisos.tsx             refresca la página al llegar un aviso
  mision/decision.tsx, mision/pregunta-docente.tsx
  comunidad/**                                reseñas, reporte, mensajes, docencia, clases, preguntas
apps/web/src/app/
  (misiones)/casos/[caso]/page.tsx            reseñas del caso
  (cuenta)/reportar/page.tsx                  reportar un problema
  (dashboard)/dashboard/{mensajes,clases,preguntas}/page.tsx
  (dashboard)/profesor/page.tsx, profesor/clases/[id]/page.tsx, profesor/preguntas/page.tsx
e2e/tests/comunidad.spec.ts
```

---

### Task 1: Tablas de comunidad, roles y permisos

**Files:**
- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/drizzle/0005_<nombre>.sql` (generada)
- Modify: `packages/db/src/audit.ts`
- Test: `packages/db/src/comunidad.test.ts`
- Create: `apps/web/src/lib/roles.ts`, `apps/web/src/lib/permisos.ts`, `apps/web/src/lib/uuid.ts`
- Modify: `apps/web/src/lib/sesion.ts`
- Test: `apps/web/src/lib/roles.test.ts`, `apps/web/src/lib/sesion.test.ts`, `apps/web/src/lib/permisos.test.ts`

**Interfaces:**
- Consumes: `users`, `casos`, `rutas` (Fases 1 y 2).
- Produces tablas en `@syntaxerror/db/schema`. Los ids son uuid y las fechas `timestamp`; columnas:
  - `transaccionesPuntos` (`point_transactions`): `id`, `userId`, `casoId`, `clave`, `motivo`, `cantidad`, `creadoEn`. Único `(userId, casoId, clave)`.
  - `solicitudesDocente` (`teacher_requests`): `id`, `userId`, `estado` (`pendiente` | `aprobada` | `rechazada`), `creadaEn`, `revisadaEn`, `revisadaPor`. Una sola `pendiente` por usuario.
  - `clases` (`classes`): `id`, `profesorId`, `rutaId`, `titulo`, `codigo` (único), `estado` (`activa` | `archivada`), `creadaEn`.
  - `claseCasos` (`clase_casos`): `claseId`, `casoId`, `habilitado`. PK `(claseId, casoId)`.
  - `claseInscripciones` (`class_enrollments`): `claseId`, `userId`, `estado` (`pendiente` | `activa` | `retirada`), `solicitadaEn`, `decididaEn`. PK `(claseId, userId)`.
  - `preguntasProfesor` (`teacher_questions`): `id`, `alumnoId`, `casoId`, `mision`, `claseId`, `profesorId`, `texto`, `respuesta`, `estado` (`pendiente` | `respondida`), `creadaEn`, `respondidaEn`, `respondidaPor`.
  - `resenasCaso` (`resenas_caso`): `id`, `userId`, `casoId`, `estrellas`, `comentario`, `estadoComentario` (`pendiente` | `aprobado` | `rechazado` | null), `moderadaPor`, `creadaEn`. Único `(userId, casoId)`.
  - `reportes` (`feedback_reports`): `id`, `userId`, `tipo` (`error` | `sugerencia`), `descripcion`, `pagina`, `caso`, `mision`, `estado` (`pendiente` | `resuelto`), `resueltoPor`, `resueltoEn`, `creadoEn`.
  - `mensajes` (`user_messages`): `id`, `userId`, `remitenteId`, `reporteId`, `asunto`, `cuerpo`, `leidoEn`, `creadoEn`.
- Produces en `@syntaxerror/db/audit`:
  - acciones nuevas: `role_changed`, `teacher_question_answered`, `review_moderated`;
  - `AuditTargetType` nuevos: `teacher_request`, `teacher_question`, `review`.
- Produces en `@/lib/roles`: `ROLES`, `type Rol = "student" | "teacher" | "admin"`, `esRol(valor)`, `esDocente({ rol })`, `type Persona = { id; email; nombre }` y `listarAdmins(db): Promise<Persona[]>`.
- Produces en `@/lib/sesion`: `type UsuarioActual = { id; email; nombre: string | null; rol: Rol }` y `obtenerUsuarioActual(db?): Promise<UsuarioActual | null>`.
- Produces en `@/lib/permisos`: `exigirUsuario()` y `exigirDocente()`. Ambas devuelven `{ usuario: UsuarioActual; error: null } | { usuario: null; error: NextResponse }`. Los errores son 401 `no_autenticado` y 403 `prohibido`.
- Produces en `@/lib/uuid`: `esUuid(valor: string): boolean`.

- [ ] **Step 1: Agregar las tablas a `packages/db/src/schema.ts`**

Agregar al inicio del archivo:
```ts
import { sql } from "drizzle-orm";
```

Al final del archivo, agregar:
```ts
export const transaccionesPuntos = pgTable(
  "point_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    // Qué se premió: el slug de la misión, "__caso__" o "decision:<misión>:<hash>". Cada clave suma una vez.
    clave: text("clave").notNull(),
    motivo: text("motivo").notNull(),
    cantidad: integer("cantidad").notNull(),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("point_transactions_logro_idx").on(table.userId, table.casoId, table.clave),
    index("point_transactions_usuario_idx").on(table.userId),
  ]
);

export const solicitudesDocente = pgTable(
  "teacher_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    estado: text("estado").notNull().default("pendiente"),
    creadaEn: timestamp("creada_en").notNull().defaultNow(),
    revisadaEn: timestamp("revisada_en"),
    revisadaPor: uuid("revisada_por").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    uniqueIndex("teacher_requests_una_pendiente_idx").on(table.userId).where(sql`estado = 'pendiente'`),
    index("teacher_requests_estado_idx").on(table.estado, table.creadaEn),
  ]
);

export const clases = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profesorId: uuid("profesor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rutaId: uuid("ruta_id")
      .notNull()
      .references(() => rutas.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    codigo: text("codigo").notNull(),
    estado: text("estado").notNull().default("activa"),
    creadaEn: timestamp("creada_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("classes_codigo_idx").on(table.codigo), index("classes_profesor_idx").on(table.profesorId)]
);

export const claseCasos = pgTable(
  "clase_casos",
  {
    claseId: uuid("clase_id")
      .notNull()
      .references(() => clases.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    habilitado: boolean("habilitado").notNull().default(true),
  },
  (table) => [primaryKey({ columns: [table.claseId, table.casoId] })]
);

export const claseInscripciones = pgTable(
  "class_enrollments",
  {
    claseId: uuid("clase_id")
      .notNull()
      .references(() => clases.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    estado: text("estado").notNull().default("pendiente"),
    solicitadaEn: timestamp("solicitada_en").notNull().defaultNow(),
    decididaEn: timestamp("decidida_en"),
  },
  (table) => [primaryKey({ columns: [table.claseId, table.userId] }), index("class_enrollments_usuario_idx").on(table.userId)]
);

export const preguntasProfesor = pgTable(
  "teacher_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alumnoId: uuid("alumno_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    mision: text("mision").notNull(),
    claseId: uuid("clase_id").references(() => clases.id, { onDelete: "set null" }),
    // Sin docente (null), la pregunta queda para el grupo de administración.
    profesorId: uuid("profesor_id").references(() => users.id, { onDelete: "set null" }),
    texto: text("texto").notNull(),
    respuesta: text("respuesta"),
    estado: text("estado").notNull().default("pendiente"),
    creadaEn: timestamp("creada_en").notNull().defaultNow(),
    respondidaEn: timestamp("respondida_en"),
    respondidaPor: uuid("respondida_por").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("teacher_questions_alumno_idx").on(table.alumnoId, table.creadaEn),
    index("teacher_questions_profesor_idx").on(table.profesorId, table.estado),
  ]
);

export const resenasCaso = pgTable(
  "resenas_caso",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    estrellas: integer("estrellas").notNull(),
    comentario: text("comentario"),
    estadoComentario: text("estado_comentario"),
    moderadaPor: uuid("moderada_por").references(() => users.id, { onDelete: "set null" }),
    creadaEn: timestamp("creada_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("resenas_caso_usuario_idx").on(table.userId, table.casoId), index("resenas_caso_caso_idx").on(table.casoId)]
);

export const reportes = pgTable(
  "feedback_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    descripcion: text("descripcion").notNull(),
    pagina: text("pagina").notNull(),
    caso: text("caso"),
    mision: text("mision"),
    estado: text("estado").notNull().default("pendiente"),
    resueltoPor: uuid("resuelto_por").references(() => users.id, { onDelete: "set null" }),
    resueltoEn: timestamp("resuelto_en"),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
  },
  (table) => [index("feedback_reports_estado_idx").on(table.estado, table.creadoEn)]
);

export const mensajes = pgTable(
  "user_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    remitenteId: uuid("remitente_id").references(() => users.id, { onDelete: "set null" }),
    reporteId: uuid("reporte_id").references(() => reportes.id, { onDelete: "set null" }),
    asunto: text("asunto").notNull(),
    cuerpo: text("cuerpo").notNull(),
    leidoEn: timestamp("leido_en"),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
  },
  (table) => [index("user_messages_usuario_idx").on(table.userId, table.creadoEn)]
);
```

- [ ] **Step 2: Generar la migración**

Run: `npm run db:generate`
Expected:
- crea `packages/db/drizzle/0005_<nombre>.sql` con los nueve `CREATE TABLE`;
- incluye `CREATE UNIQUE INDEX "teacher_requests_una_pendiente_idx" ... WHERE estado = 'pendiente'`;
- no toca las tablas existentes.

- [ ] **Step 3: Ampliar la bitácora en `packages/db/src/audit.ts`**

Agregar al final de `AUDIT_ACTIONS` (después de `"portfolio_updated",`):
```ts
  "role_changed",
  "teacher_question_answered",
  "review_moderated",
```

Reemplazar la línea de `AuditTargetType` por:
```ts
export type AuditTargetType = "user" | "teacher_request" | "teacher_question" | "review";
```

- [ ] **Step 4: Escribir el test que falla, `packages/db/src/comunidad.test.ts`**

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, clases, preguntasProfesor, rutas, solicitudesDocente, transaccionesPuntos, users } from "./schema";
import { createTestDb, truncateAll } from "./testing";

const { db, close } = createTestDb();

async function persona(email: string): Promise<string> {
  const [fila] = await db.insert(users).values({ email }).returning({ id: users.id });
  return fila.id;
}

async function caso(): Promise<string> {
  const [fila] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
    .returning({ id: casos.id });
  return fila.id;
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("tablas de comunidad", () => {
  it("cada logro suma puntos una sola vez", async () => {
    const userId = await persona("ana@correo.cl");
    const casoId = await caso();
    const logro = { userId, casoId, clave: "m1", motivo: "mision_aprobada", cantidad: 10 };
    expect(await db.insert(transaccionesPuntos).values(logro).onConflictDoNothing().returning()).toHaveLength(1);
    expect(await db.insert(transaccionesPuntos).values(logro).onConflictDoNothing().returning()).toHaveLength(0);
  });

  it("solo hay una solicitud docente pendiente por persona, pero se puede volver a pedir tras un rechazo", async () => {
    const userId = await persona("ana@correo.cl");
    const [primera] = await db.insert(solicitudesDocente).values({ userId }).returning();
    expect(await db.insert(solicitudesDocente).values({ userId }).onConflictDoNothing().returning()).toHaveLength(0);
    await db.update(solicitudesDocente).set({ estado: "rechazada" }).where(eq(solicitudesDocente.id, primera.id));
    expect(await db.insert(solicitudesDocente).values({ userId }).onConflictDoNothing().returning()).toHaveLength(1);
  });

  it("si se elimina la cuenta docente, sus clases se borran y sus preguntas pasan a administración", async () => {
    const profesorId = await persona("docente@correo.cl");
    const alumnoId = await persona("ana@correo.cl");
    const casoId = await caso();
    const [ruta] = await db
      .insert(rutas)
      .values({ slug: "analista", titulo: "Analista", cargo: "Analista", descripcion: "Ruta" })
      .returning({ id: rutas.id });
    const [clase] = await db.insert(clases).values({ profesorId, rutaId: ruta.id, titulo: "Clase", codigo: "ABC234" }).returning();
    await db.insert(preguntasProfesor).values({ alumnoId, casoId, mision: "m1", claseId: clase.id, profesorId, texto: "¿Cómo filtro?" });

    await db.delete(users).where(eq(users.id, profesorId));

    expect(await db.select().from(clases)).toEqual([]);
    const [pregunta] = await db.select().from(preguntasProfesor);
    expect(pregunta).toMatchObject({ profesorId: null, claseId: null, estado: "pendiente" });
  });
});
```

- [ ] **Step 5: Verificar que pasa contra la migración nueva**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/db test`
Expected: PASS (6 tests: 3 anteriores y 3 nuevos). Si el Step 2 no generó la migración, este test falla con `relation "point_transactions" does not exist`.

- [ ] **Step 6: Escribir los tests que fallan de roles, sesión y permisos**

`apps/web/src/lib/roles.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { esDocente, esRol, listarAdmins } from "./roles";

const { db, close } = createTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("roles", () => {
  it("reconoce los tres roles y trata a teacher y admin como docentes", () => {
    expect(esRol("teacher")).toBe(true);
    expect(esRol("superadmin")).toBe(false);
    expect(esDocente({ rol: "student" })).toBe(false);
    expect(esDocente({ rol: "teacher" })).toBe(true);
    expect(esDocente({ rol: "admin" })).toBe(true);
  });

  it("listarAdmins devuelve solo las cuentas de administración", async () => {
    await db.insert(users).values([
      { email: "admin@correo.cl", name: "Admin", role: "admin" },
      { email: "ana@correo.cl", name: "Ana" },
    ]);
    expect(await listarAdmins(db)).toEqual([{ id: expect.any(String), email: "admin@correo.cl", nombre: "Admin" }]);
  });
});
```

`apps/web/src/lib/sesion.test.ts`:
```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("./auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));

const { auth } = await import("./auth");
const { obtenerUsuarioActual } = await import("./sesion");
const { db, close } = createTestDb();

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("obtenerUsuarioActual", () => {
  it("lee el rol desde la base, no desde la sesión", async () => {
    const [fila] = await db.insert(users).values({ email: "ana@correo.cl", name: "Ana", role: "teacher" }).returning({ id: users.id });
    vi.mocked(auth).mockResolvedValue({ user: { id: fila.id, role: "student" }, expires: "" } as never);
    expect(await obtenerUsuarioActual(db)).toEqual({ id: fila.id, email: "ana@correo.cl", nombre: "Ana", rol: "teacher" });
  });

  it("con la cuenta eliminada devuelve null aunque la sesión siga abierta", async () => {
    const [fila] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    vi.mocked(auth).mockResolvedValue({ user: { id: fila.id }, expires: "" } as never);
    await db.delete(users).where(eq(users.id, fila.id));
    expect(await obtenerUsuarioActual(db)).toBeNull();
  });

  it("sin sesión devuelve null", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect(await obtenerUsuarioActual(db)).toBeNull();
  });
});
```

`apps/web/src/lib/permisos.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { exigirDocente, exigirUsuario } = await import("./permisos");
const { esUuid } = await import("./uuid");

const persona = (rol: "student" | "teacher" | "admin") => ({ id: "u1", email: "a@b.cl", nombre: null, rol });

describe("permisos", () => {
  it("sin sesión responde 401", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
    expect((await exigirUsuario()).error?.status).toBe(401);
    expect((await exigirDocente()).error?.status).toBe(401);
  });

  it("una cuenta estudiante no es docente: 403", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(persona("student"));
    expect((await exigirUsuario()).usuario?.rol).toBe("student");
    expect((await exigirDocente()).error?.status).toBe(403);
  });

  it("teacher y admin pasan como docentes", async () => {
    for (const rol of ["teacher", "admin"] as const) {
      vi.mocked(obtenerUsuarioActual).mockResolvedValue(persona(rol));
      expect((await exigirDocente()).usuario?.rol).toBe(rol);
    }
  });

  it("esUuid distingue un uuid de cualquier otro texto", () => {
    expect(esUuid("0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11")).toBe(true);
    expect(esUuid("abc")).toBe(false);
    expect(esUuid("0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11' or 1=1")).toBe(false);
  });
});
```

- [ ] **Step 7: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/roles.test.ts src/lib/sesion.test.ts src/lib/permisos.test.ts`
Expected: FAIL. No se pueden resolver `./roles`, `./permisos` ni `./uuid`, y `obtenerUsuarioActual` no existe.

- [ ] **Step 8: Crear `apps/web/src/lib/roles.ts`**

```ts
import { eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";

export const ROLES = ["student", "teacher", "admin"] as const;
export type Rol = (typeof ROLES)[number];
export type Persona = { id: string; email: string; nombre: string | null };

export function esRol(valor: string): valor is Rol {
  return (ROLES as readonly string[]).includes(valor);
}

// Administración también hace de docente: crea clases y responde las preguntas sin docente asignado.
export function esDocente(usuario: { rol: Rol }): boolean {
  return usuario.rol === "teacher" || usuario.rol === "admin";
}

export async function listarAdmins(db: DbClient): Promise<Persona[]> {
  return db.select({ id: users.id, email: users.email, nombre: users.name }).from(users).where(eq(users.role, "admin"));
}
```

- [ ] **Step 9: Agregar `obtenerUsuarioActual` a `apps/web/src/lib/sesion.ts`**

Reemplazar el archivo por:
```ts
import { eq } from "drizzle-orm";
import { getDb, type AppDb } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { auth, signOut } from "./auth";
import { esRol, type Rol } from "./roles";

export type UsuarioActual = { id: string; email: string; nombre: string | null; rol: Rol };

export async function obtenerUsuarioId(): Promise<string | null> {
  const sesion = await auth();
  return sesion?.user?.id ?? null;
}

// El rol se lee desde la base y no desde el JWT: un cambio de rol rige al instante y una cuenta
// eliminada pierde el acceso aunque su sesión siga abierta en otro dispositivo.
export async function obtenerUsuarioActual(db: AppDb = getDb()): Promise<UsuarioActual | null> {
  const id = await obtenerUsuarioId();
  if (!id) return null;
  const [fila] = await db.select({ id: users.id, email: users.email, nombre: users.name, rol: users.role }).from(users).where(eq(users.id, id));
  if (!fila) return null;
  return { ...fila, rol: esRol(fila.rol) ? fila.rol : "student" };
}

export async function cerrarSesion(): Promise<void> {
  await signOut({ redirect: false });
}
```

- [ ] **Step 10: Crear `apps/web/src/lib/permisos.ts` y `apps/web/src/lib/uuid.ts`**

`apps/web/src/lib/permisos.ts`:
```ts
import { NextResponse } from "next/server";
import { esDocente } from "./roles";
import { obtenerUsuarioActual, type UsuarioActual } from "./sesion";

export type Acceso = { usuario: UsuarioActual; error: null } | { usuario: null; error: NextResponse };

export async function exigirUsuario(): Promise<Acceso> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return { usuario: null, error: NextResponse.json({ error: "no_autenticado" }, { status: 401 }) };
  return { usuario, error: null };
}

export async function exigirDocente(): Promise<Acceso> {
  const acceso = await exigirUsuario();
  if (acceso.error || esDocente(acceso.usuario)) return acceso;
  return { usuario: null, error: NextResponse.json({ error: "prohibido" }, { status: 403 }) };
}
```

`apps/web/src/lib/uuid.ts`:
```ts
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres rechaza con error un uuid mal formado: se valida antes para responder 404 y no 500.
export function esUuid(valor: string): boolean {
  return UUID.test(valor);
}
```

- [ ] **Step 11: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && cd apps/web && pnpm exec tsc --noEmit -p . && cd ../../packages/db && pnpm exec tsc --noEmit -p ."`
Expected:
- PASS en todos los paquetes;
- `web` suma 9 tests (2 de roles, 3 de sesión y 4 de permisos);
- `tsc` sin errores.

- [ ] **Step 12: Commit**

```bash
git add packages/db apps/web/src/lib/roles.ts apps/web/src/lib/roles.test.ts apps/web/src/lib/sesion.ts apps/web/src/lib/sesion.test.ts apps/web/src/lib/permisos.ts apps/web/src/lib/permisos.test.ts apps/web/src/lib/uuid.ts
git commit -m "feat(comunidad): tablas de comunidad, roles desde la base y permisos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Emails de comunidad y avisos en vivo

**Files:**
- Modify: `packages/queue/src/emails.ts`, `packages/queue/src/eventos.ts`, `packages/queue/package.json` (export `./avisos`)
- Create: `packages/queue/src/avisos.ts`
- Test: `packages/queue/src/avisos.test.ts`
- Modify: `apps/worker/src/emails/mensajes.ts`, `apps/worker/src/emails/mensajes.test.ts`
- Modify: `apps/worker/src/server.ts`, `apps/worker/src/server.test.ts`
- Create: `apps/worker/src/avisos/procesar.ts`
- Test: `apps/worker/src/avisos/procesar.test.ts`
- Modify: `apps/worker/src/index.ts`
- Create: `apps/web/src/lib/avisos.ts`, `apps/web/src/app/api/avisos/token/route.ts`, `apps/web/src/components/avisos/refrescar-con-avisos.tsx`
- Test: `apps/web/src/app/api/avisos/token/route.test.ts`
- Modify: `apps/web/src/lib/cuenta/enlaces.ts`

**Interfaces:**
- Consumes: `firmarTokenSocket` y `verificarTokenSocket` (Fase 3b), `plantillaSyntaxError` (Fase 3a), `obtenerUsuarioActual` (Task 1).
- Produces `TrabajoEmail` con estos tipos nuevos (además de `para` y `nombre`):
  - `pregunta-profesor-nueva`: `alumno`, `caso`, `mision`, `pregunta`, `enlace`;
  - `pregunta-profesor-respondida`: `caso`, `mision`, `pregunta`, `respuesta`, `enlace`;
  - `resena-nueva`: `caso`, `estrellas`, `comentario`;
  - `reporte-nuevo`: `tipoReporte` (`error` | `sugerencia`), `descripcion`, `pagina`, `autor`;
  - `solicitud-docente-nueva`: `solicitante`;
  - `clase-solicitud`: `alumno`, `clase`, `enlace`;
  - `clase-decision`: `clase`, `aceptada`, `enlace`;
  - `mensaje-nuevo`: `asunto`, `enlace`.
- Produces en `@syntaxerror/queue/eventos` (sin dependencias de Node):
  - `PROPOSITO_USUARIO = "usuario"`;
  - `salaUsuario(userId)`, que devuelve `usuario:<id>`;
  - `EVENTO_PREGUNTA_NUEVA = "profesor:pregunta-nueva"` y `EVENTO_PREGUNTA_RESPONDIDA = "profesor:pregunta-respondida"`;
  - `type EventoComunidad` y `type AvisoPregunta = { preguntaId: string }`.
- Produces en `@syntaxerror/queue/avisos`:
  - `COLA_AVISOS = "avisos"`;
  - `type TrabajoAviso = { salas: string[]; evento: EventoComunidad; datos: AvisoPregunta }`;
  - `crearColaAvisos(url, { nombre?, limiteMs? }): { encolar, cerrar }`.
- Produces en el worker: `crearProcesadorAvisos(emitir)` y sockets de propósito `usuario`, que entran a `salaUsuario(userId del token)`.
- Produces en la web:
  - `type Avisar` y `avisarSinFallar(trabajo)` (`@/lib/avisos`);
  - `GET /api/avisos/token?clientId=`, que responde `{ token }`;
  - `<RefrescarConAvisos eventos={[...]} />`;
  - enlaces nuevos: `enlacePanelDocente(claseId?)`, `enlacePreguntasDocente()`, `enlaceMisPreguntas()`, `enlaceMisClases()` y `enlaceMensajes()`.

- [ ] **Step 1: Agregar los emails a `packages/queue/src/emails.ts`**

Reemplazar la unión `TrabajoEmail` por:
```ts
export type TrabajoEmail =
  | (Destinatario & { tipo: "verificar-email"; enlace: string })
  | (Destinatario & { tipo: "confirmar-nuevo-email"; enlace: string })
  | (Destinatario & { tipo: "aviso-cambio-email"; nuevoEmail: string })
  | (Destinatario & { tipo: "clave-cambiada" })
  | (Destinatario & { tipo: "recuperar-clave"; enlace: string })
  | (Destinatario & { tipo: "cuenta-eliminada" })
  | (Destinatario & { tipo: "certificado-emitido"; titulo: string; enlace: string })
  | (Destinatario & { tipo: "pregunta-profesor-nueva"; alumno: string; caso: string; mision: string; pregunta: string; enlace: string })
  | (Destinatario & { tipo: "pregunta-profesor-respondida"; caso: string; mision: string; pregunta: string; respuesta: string; enlace: string })
  | (Destinatario & { tipo: "resena-nueva"; caso: string; estrellas: number; comentario: string })
  | (Destinatario & { tipo: "reporte-nuevo"; tipoReporte: "error" | "sugerencia"; descripcion: string; pagina: string; autor: string })
  | (Destinatario & { tipo: "solicitud-docente-nueva"; solicitante: string })
  | (Destinatario & { tipo: "clase-solicitud"; alumno: string; clase: string; enlace: string })
  | (Destinatario & { tipo: "clase-decision"; clase: string; aceptada: boolean; enlace: string })
  | (Destinatario & { tipo: "mensaje-nuevo"; asunto: string; enlace: string });
```

- [ ] **Step 2: Agregar la sala por usuario a `packages/queue/src/eventos.ts`**

Agregar al final del archivo:
```ts
// Avisos de comunidad: cada persona escucha su propia sala, identificada por el token.
export const PROPOSITO_USUARIO = "usuario";
export const EVENTO_PREGUNTA_NUEVA = "profesor:pregunta-nueva";
export const EVENTO_PREGUNTA_RESPONDIDA = "profesor:pregunta-respondida";

export type EventoComunidad = typeof EVENTO_PREGUNTA_NUEVA | typeof EVENTO_PREGUNTA_RESPONDIDA;
export type AvisoPregunta = { preguntaId: string };

export function salaUsuario(userId: string): string {
  return `usuario:${userId}`;
}
```

- [ ] **Step 3: Escribir el test que falla, `packages/queue/src/avisos.test.ts`**

```ts
import { Queue } from "bullmq";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { crearColaAvisos, type TrabajoAviso } from "./avisos";
import { conexionWorker } from "./conexion";
import { EVENTO_PREGUNTA_NUEVA, salaUsuario } from "./eventos";

const url = process.env.REDIS_URL ?? "redis://redis:6379";
const nombre = `avisos-test-${process.pid}`;
const inspector = new Queue(nombre, { connection: conexionWorker(url) });

afterEach(() => inspector.obliterate({ force: true }));
afterAll(() => inspector.close());

describe("crearColaAvisos", () => {
  it("encola el aviso con el evento como nombre", async () => {
    const cola = crearColaAvisos(url, { nombre });
    const trabajo: TrabajoAviso = { salas: [salaUsuario("u1")], evento: EVENTO_PREGUNTA_NUEVA, datos: { preguntaId: "p1" } };
    await cola.encolar(trabajo);
    const [job] = await inspector.getJobs(["waiting"]);
    expect(job.name).toBe(EVENTO_PREGUNTA_NUEVA);
    expect(job.data).toEqual(trabajo);
    await cola.cerrar();
  });

  it("sin salas no encola nada", async () => {
    const cola = crearColaAvisos(url, { nombre });
    await cola.encolar({ salas: [], evento: EVENTO_PREGUNTA_NUEVA, datos: { preguntaId: "p1" } });
    expect(await inspector.getJobs(["waiting"])).toHaveLength(0);
    await cola.cerrar();
  });
});
```

- [ ] **Step 4: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/queue test`
Expected: FAIL, porque no se puede resolver `./avisos`.

- [ ] **Step 5: Crear `packages/queue/src/avisos.ts`**

```ts
import { Queue } from "bullmq";
import { conexionProductor, conLimite } from "./conexion";
import type { AvisoPregunta, EventoComunidad } from "./eventos";

export const COLA_AVISOS = "avisos";

export type TrabajoAviso = { salas: string[]; evento: EventoComunidad; datos: AvisoPregunta };

export type ColaAvisos = {
  encolar(trabajo: TrabajoAviso): Promise<void>;
  cerrar(): Promise<void>;
};

export function crearColaAvisos(
  url: string,
  { nombre = COLA_AVISOS, limiteMs = 3_000 }: { nombre?: string; limiteMs?: number } = {}
): ColaAvisos {
  const cola = new Queue<TrabajoAviso>(nombre, { connection: conexionProductor(url) });
  cola.on("error", () => {});

  return {
    async encolar(trabajo) {
      if (trabajo.salas.length === 0) return;
      await conLimite(
        cola.add(trabajo.evento, trabajo, {
          attempts: 2,
          backoff: { type: "fixed", delay: 1_000 },
          removeOnComplete: 500,
          removeOnFail: 1_000,
        }),
        limiteMs,
        "La cola de avisos no responde."
      );
    },
    cerrar: () => cola.close(),
  };
}
```

En `packages/queue/package.json`, agregar a `exports`:
```json
"./avisos": "./src/avisos.ts"
```

- [ ] **Step 6: Agregar los casos al test de mensajes, `apps/worker/src/emails/mensajes.test.ts`**

Agregar al final del arreglo `casos` (después de la línea de `certificado-emitido`):
```ts
  [
    { tipo: "pregunta-profesor-nueva", para: "docente@correo.cl", nombre: "Rosa", alumno: "Ana", caso: "Ventas", mision: "Clientes", pregunta: "¿Uso WHERE?", enlace },
    "Tienes una pregunta nueva",
  ],
  [
    { tipo: "pregunta-profesor-respondida", para: "ana@correo.cl", nombre: "Ana", caso: "Ventas", mision: "Clientes", pregunta: "¿Uso WHERE?", respuesta: "Sí, con comillas.", enlace },
    "Respondieron tu pregunta",
  ],
  [{ tipo: "resena-nueva", para: "admin@correo.cl", nombre: "Admin", caso: "Ventas", estrellas: 4, comentario: "Muy claro" }, "Hay una reseña por moderar"],
  [
    { tipo: "reporte-nuevo", para: "admin@correo.cl", nombre: "Admin", tipoReporte: "error", descripcion: "No carga", pagina: "/casos/ventas", autor: "Ana" },
    "Reportaron un error",
  ],
  [
    { tipo: "reporte-nuevo", para: "admin@correo.cl", nombre: "Admin", tipoReporte: "sugerencia", descripcion: "Más casos", pagina: "/", autor: "Ana" },
    "Llegó una sugerencia",
  ],
  [{ tipo: "solicitud-docente-nueva", para: "admin@correo.cl", nombre: "Admin", solicitante: "Rosa (rosa@correo.cl)" }, "Pidieron acceso docente"],
  [{ tipo: "clase-solicitud", para: "docente@correo.cl", nombre: "Rosa", alumno: "Ana", clase: "3°A", enlace }, "Pidieron entrar a tu clase"],
  [{ tipo: "clase-decision", para: "ana@correo.cl", nombre: "Ana", clase: "3°A", aceptada: true, enlace }, "Te aceptaron en la clase"],
  [{ tipo: "clase-decision", para: "ana@correo.cl", nombre: "Ana", clase: "3°A", aceptada: false, enlace }, "Ya no estás en la clase"],
  [{ tipo: "mensaje-nuevo", para: "ana@correo.cl", nombre: "Ana", asunto: "Gracias por tu reporte", enlace }, "Tienes un mensaje nuevo"],
```

Agregar dentro del `describe("construirEmail", ...)`, al final:
```ts
  it("la respuesta de una pregunta incluye la pregunta y la respuesta", () => {
    const email = construirEmail(casos[8][0]);
    expect(email.texto).toContain("¿Uso WHERE?");
    expect(email.texto).toContain("Sí, con comillas.");
  });

  it("el texto que escribe una persona se escapa en el HTML", () => {
    const email = construirEmail({
      tipo: "reporte-nuevo",
      para: "admin@correo.cl",
      nombre: null,
      tipoReporte: "error",
      descripcion: '<img src=x onerror="alert(1)">',
      pagina: "/",
      autor: "Ana",
    });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img");
  });
```

- [ ] **Step 7: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter worker exec vitest run src/emails/mensajes.test.ts`
Expected: FAIL. `construirEmail` no devuelve nada para los tipos nuevos, así que falla al leer `asunto` de `undefined`.

- [ ] **Step 8: Agregar los textos a `apps/worker/src/emails/mensajes.ts`**

Agregar estos casos dentro del `switch`, después del caso `certificado-emitido`:
```ts
    case "pregunta-profesor-nueva":
      return plantillaSyntaxError({
        asunto: "Tienes una pregunta nueva",
        estado: { etiqueta: "INFO", mensaje: "Pregunta de estudiante" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`${trabajo.alumno} preguntó en la misión «${trabajo.mision}» del caso ${trabajo.caso}:`, `«${trabajo.pregunta}»`],
        enlace: { texto: "Responder la pregunta", url: trabajo.enlace },
        comandoCierre: "git pull origin preguntas",
      });
    case "pregunta-profesor-respondida":
      return plantillaSyntaxError({
        asunto: "Respondieron tu pregunta",
        estado: { etiqueta: "INFO", mensaje: "Pregunta respondida" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          `Tu pregunta en la misión «${trabajo.mision}» del caso ${trabajo.caso} ya tiene respuesta.`,
          `Preguntaste: «${trabajo.pregunta}»`,
          `Respuesta: ${trabajo.respuesta}`,
        ],
        enlace: { texto: "Ver mis preguntas", url: trabajo.enlace },
        comandoCierre: "git merge respuesta",
      });
    case "resena-nueva":
      return plantillaSyntaxError({
        asunto: "Hay una reseña por moderar",
        estado: { etiqueta: "INFO", mensaje: "Reseña con comentario" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          `Dejaron ${trabajo.estrellas} de 5 estrellas en el caso ${trabajo.caso}, con este comentario:`,
          `«${trabajo.comentario}»`,
          "El comentario queda oculto hasta que alguien de administración lo apruebe.",
        ],
        comandoCierre: "git review",
      });
    case "reporte-nuevo":
      return plantillaSyntaxError({
        asunto: trabajo.tipoReporte === "error" ? "Reportaron un error" : "Llegó una sugerencia",
        estado: trabajo.tipoReporte === "error" ? { etiqueta: "WARNING", mensaje: "Reporte de error" } : { etiqueta: "INFO", mensaje: "Sugerencia" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`${trabajo.autor} escribió desde ${trabajo.pagina}:`, `«${trabajo.descripcion}»`],
        comandoCierre: "git issue create",
      });
    case "solicitud-docente-nueva":
      return plantillaSyntaxError({
        asunto: "Pidieron acceso docente",
        estado: { etiqueta: "INFO", mensaje: "Solicitud docente" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`${trabajo.solicitante} pidió acceso docente en syntaxError.cl.`, "Revisa la solicitud desde administración para aprobarla o rechazarla."],
        comandoCierre: "sudo usermod -aG docentes",
      });
    case "clase-solicitud":
      return plantillaSyntaxError({
        asunto: "Pidieron entrar a tu clase",
        estado: { etiqueta: "INFO", mensaje: "Solicitud de inscripción" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`${trabajo.alumno} pidió entrar a tu clase «${trabajo.clase}».`, "Acepta o rechaza la solicitud desde tu panel docente."],
        enlace: { texto: "Ver mi clase", url: trabajo.enlace },
        comandoCierre: "git remote add estudiante",
      });
    case "clase-decision":
      return plantillaSyntaxError({
        asunto: trabajo.aceptada ? "Te aceptaron en la clase" : "Ya no estás en la clase",
        estado: trabajo.aceptada ? { etiqueta: "INFO", mensaje: "Inscripción aceptada" } : { etiqueta: "WARNING", mensaje: "Inscripción cerrada" },
        saludo: saludo(trabajo.nombre),
        parrafos: trabajo.aceptada
          ? [`Ya eres parte de la clase «${trabajo.clase}».`, "Tus preguntas sobre los casos de la clase le llegan a tu docente."]
          : [
              `Tu docente cerró tu inscripción en la clase «${trabajo.clase}».`,
              "Puedes seguir con los casos por tu cuenta, y tus preguntas le llegarán al equipo de syntaxError.cl.",
            ],
        enlace: { texto: "Ver mis clases", url: trabajo.enlace },
        comandoCierre: "git checkout clase",
      });
    case "mensaje-nuevo":
      return plantillaSyntaxError({
        asunto: "Tienes un mensaje nuevo",
        estado: { etiqueta: "INFO", mensaje: "Mensaje nuevo" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`Te escribieron desde syntaxError.cl: «${trabajo.asunto}».`],
        enlace: { texto: "Leer el mensaje", url: trabajo.enlace },
        comandoCierre: "cat ~/mensajes",
      });
```

- [ ] **Step 9: Escribir los tests que fallan del worker**

Agregar a `apps/worker/src/server.test.ts`. Primero, reemplazar el import de eventos por:
```ts
import { EVENTO_PREGUNTA_NUEVA, EVENTO_TUTOR, PROPOSITO_TUTOR, PROPOSITO_USUARIO, salaTutor, salaUsuario } from "@syntaxerror/queue/eventos";
```

Luego agregar al final:
```ts
describe("sockets de avisos por usuario", () => {
  it("con un token de usuario entra a la sala de esa persona", async () => {
    const base = await start(async () => "PONG");
    const token = firmarTokenSocket({ userId: "u1", clientId: "c1", proposito: PROPOSITO_USUARIO, secreto: SECRETO });
    const cliente = conectarCon(base, { clientId: "c1", token, proposito: PROPOSITO_USUARIO });
    const recibido = new Promise((resolve) => cliente.on(EVENTO_PREGUNTA_NUEVA, resolve));

    await expect.poll(async () => (await servidor!.in(salaUsuario("u1")).fetchSockets()).length).toBe(1);
    servidor!.to(salaUsuario("u1")).emit(EVENTO_PREGUNTA_NUEVA, { preguntaId: "p1" });
    expect(await recibido).toEqual({ preguntaId: "p1" });
  });

  it("un token del tutor no sirve para escuchar avisos de usuario", async () => {
    const base = await start(async () => "PONG");
    const token = firmarTokenSocket({ userId: "u1", clientId: "c1", proposito: PROPOSITO_TUTOR, secreto: SECRETO });
    const cliente = conectarCon(base, { clientId: "c1", token, proposito: PROPOSITO_USUARIO });
    await new Promise<void>((resolve) => cliente.on("disconnect", () => resolve()));
    expect(await servidor!.in(salaUsuario("u1")).fetchSockets()).toHaveLength(0);
  });
});
```

Crear `apps/worker/src/avisos/procesar.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { EVENTO_PREGUNTA_RESPONDIDA, salaUsuario } from "@syntaxerror/queue/eventos";
import { crearProcesadorAvisos } from "./procesar";

describe("crearProcesadorAvisos", () => {
  it("emite el evento en cada sala del trabajo", async () => {
    const emitidos: unknown[][] = [];
    const procesar = crearProcesadorAvisos((sala, evento, datos) => void emitidos.push([sala, evento, datos]));
    await procesar({
      data: { salas: [salaUsuario("u1"), salaUsuario("u2")], evento: EVENTO_PREGUNTA_RESPONDIDA, datos: { preguntaId: "p1" } },
    });
    expect(emitidos).toEqual([
      ["usuario:u1", EVENTO_PREGUNTA_RESPONDIDA, { preguntaId: "p1" }],
      ["usuario:u2", EVENTO_PREGUNTA_RESPONDIDA, { preguntaId: "p1" }],
    ]);
  });
});
```

- [ ] **Step 10: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter worker test`
Expected: FAIL. No se puede resolver `./procesar`, y el socket de propósito `usuario` se desconecta porque el servidor solo acepta `tutor`.

- [ ] **Step 11: Aceptar sockets de usuario en `apps/worker/src/server.ts`**

Reemplazar el import de eventos por:
```ts
import { PROPOSITO_TUTOR, PROPOSITO_USUARIO, salaTutor, salaUsuario } from "@syntaxerror/queue/eventos";
```

Reemplazar el bloque `io.on("connection", ...)` por:
```ts
  io.on("connection", (socket) => {
    const { clientId, token, proposito } = socket.handshake.query;
    if (typeof clientId !== "string" || typeof token !== "string" || (proposito !== PROPOSITO_TUTOR && proposito !== PROPOSITO_USUARIO)) {
      socket.disconnect(true);
      return;
    }
    const verificado = verificarTokenSocket({ token, clientId, proposito, secreto: deps.secretoSocket });
    if (!verificado) {
      socket.disconnect(true);
      return;
    }
    // El tutor responde a un navegador; los avisos de comunidad llegan a la persona, en todos sus navegadores.
    void socket.join(proposito === PROPOSITO_TUTOR ? salaTutor(clientId) : salaUsuario(verificado.userId));
  });
```

- [ ] **Step 12: Crear `apps/worker/src/avisos/procesar.ts`**

```ts
import type { TrabajoAviso } from "@syntaxerror/queue/avisos";

export type EmisorAvisos = (sala: string, evento: string, datos: unknown) => void;

export function crearProcesadorAvisos(emitir: EmisorAvisos) {
  return async (job: { data: TrabajoAviso }): Promise<void> => {
    for (const sala of job.data.salas) emitir(sala, job.data.evento, job.data.datos);
  };
}
```

- [ ] **Step 13: Levantar el worker de avisos en `apps/worker/src/index.ts`**

Agregar a los imports:
```ts
import { COLA_AVISOS, type TrabajoAviso } from "@syntaxerror/queue/avisos";
import { crearProcesadorAvisos } from "./avisos/procesar";
```

Después del bloque `emails.on("error", ...)`, agregar:
```ts
const avisos = new Worker<TrabajoAviso>(
  COLA_AVISOS,
  crearProcesadorAvisos((sala, evento, datos) => void io.to(sala).emit(evento, datos)),
  { connection: conexionWorker(redisUrl), concurrency: 5 }
);
avisos.on("error", (error) => {
  console.error(`[avisos] error de worker: ${error.message}`);
});
```

En `shutdown`, después de `await emails.close();`, agregar:
```ts
  await avisos.close();
```

- [ ] **Step 14: Escribir el test que falla del token, `apps/web/src/app/api/avisos/token/route.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROPOSITO_USUARIO } from "@syntaxerror/queue/eventos";
import { verificarTokenSocket } from "@syntaxerror/queue/token-socket";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.stubEnv("CHAT_SOCKET_SECRET", "secreto-de-prueba");

const { GET } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");

const pedir = (clientId: string) => GET(new Request(`http://localhost:3000/api/avisos/token?clientId=${clientId}`));

beforeEach(() => vi.mocked(obtenerUsuarioActual).mockResolvedValue(null));

describe("GET /api/avisos/token", () => {
  it("sin sesión responde 401", async () => {
    expect((await pedir("c1")).status).toBe(401);
  });

  it("con un clientId inválido responde 400", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: "u1", email: "a@b.cl", nombre: null, rol: "student" });
    expect((await pedir("no%20vale")).status).toBe(400);
  });

  it("firma un token de propósito usuario para esa persona", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: "u1", email: "a@b.cl", nombre: null, rol: "student" });
    const { token } = (await (await pedir("c1")).json()) as { token: string };
    expect(verificarTokenSocket({ token, clientId: "c1", proposito: PROPOSITO_USUARIO, secreto: "secreto-de-prueba" })).toEqual({ userId: "u1" });
  });
});
```

- [ ] **Step 15: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/app/api/avisos`
Expected: FAIL, porque no se puede resolver `./route`.

- [ ] **Step 16: Crear la ruta, la cola web y el componente**

`apps/web/src/app/api/avisos/token/route.ts`:
```ts
import { NextResponse } from "next/server";
import { PROPOSITO_USUARIO } from "@syntaxerror/queue/eventos";
import { firmarTokenSocket } from "@syntaxerror/queue/token-socket";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const clientId = new URL(request.url).searchParams.get("clientId") ?? "";
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(clientId)) return NextResponse.json({ error: "falta_client_id" }, { status: 400 });
  const secreto = process.env.CHAT_SOCKET_SECRET;
  if (!secreto) return NextResponse.json({ error: "avisos_no_disponibles" }, { status: 503 });
  return NextResponse.json(
    { token: firmarTokenSocket({ userId: usuario.id, clientId, proposito: PROPOSITO_USUARIO, secreto }) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
```

`apps/web/src/lib/avisos.ts`:
```ts
import { crearColaAvisos, type ColaAvisos, type TrabajoAviso } from "@syntaxerror/queue/avisos";

export type Avisar = (trabajo: TrabajoAviso) => Promise<void>;

const globalParaCola = globalThis as { __syntaxerrorColaAvisos?: ColaAvisos };

// Los avisos en vivo son un extra: si Redis no responde, se registra y la página se ve al recargar.
export const avisarSinFallar: Avisar = async (trabajo) => {
  try {
    if (!globalParaCola.__syntaxerrorColaAvisos) {
      const url = process.env.REDIS_URL;
      if (!url) throw new Error("REDIS_URL is not set");
      globalParaCola.__syntaxerrorColaAvisos = crearColaAvisos(url);
    }
    await globalParaCola.__syntaxerrorColaAvisos.encolar(trabajo);
  } catch (error) {
    console.error(`[avisos] no se pudo encolar ${trabajo.evento}`, error);
  }
};
```

`apps/web/src/components/avisos/refrescar-con-avisos.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { PROPOSITO_USUARIO } from "@syntaxerror/queue/eventos";

const SOCKET_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? "";

// Vuelve a pedir la página al servidor cuando llega uno de estos eventos a la sala de la persona.
export function RefrescarConAvisos({ eventos }: { eventos: string[] }) {
  const router = useRouter();
  const clave = eventos.join(",");

  useEffect(() => {
    if (!SOCKET_URL || !clave) return;
    const clientId = crypto.randomUUID();
    let socket: Socket | null = null;
    let vigente = true;
    void fetch(`/api/avisos/token?clientId=${clientId}`, { cache: "no-store" })
      .then((respuesta) => (respuesta.ok ? (respuesta.json() as Promise<{ token?: string }>) : null))
      .then((datos) => {
        if (!vigente || !datos?.token) return;
        socket = io(SOCKET_URL, { query: { clientId, token: datos.token, proposito: PROPOSITO_USUARIO }, transports: ["websocket", "polling"] });
        for (const evento of clave.split(",")) socket.on(evento, () => router.refresh());
      })
      .catch(() => {});
    return () => {
      vigente = false;
      socket?.close();
    };
  }, [clave, router]);

  return null;
}
```

Agregar al final de `apps/web/src/lib/cuenta/enlaces.ts`:
```ts
export const enlacePanelDocente = (claseId?: string) => absoluteUrl(claseId ? `/profesor/clases/${claseId}` : "/profesor");
export const enlacePreguntasDocente = () => absoluteUrl("/profesor/preguntas");
export const enlaceMisPreguntas = () => absoluteUrl("/dashboard/preguntas");
export const enlaceMisClases = () => absoluteUrl("/dashboard/clases");
export const enlaceMensajes = () => absoluteUrl("/dashboard/mensajes");
```

- [ ] **Step 17: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && for p in apps/web apps/worker packages/queue; do (cd \$p && pnpm exec tsc --noEmit -p .) || exit 1; done"`
Expected:
- PASS en todos los paquetes;
- `queue` suma 2 tests, `worker` suma 15 (10 emails nuevos en `it.each`, 2 de mensajes, 2 de sockets y 1 de avisos), y `web` suma 3;
- `tsc` sin errores.

- [ ] **Step 18: Commit**

```bash
git add packages/queue apps/worker apps/web/src/lib/avisos.ts apps/web/src/lib/cuenta/enlaces.ts apps/web/src/app/api/avisos apps/web/src/components/avisos
git commit -m "feat(comunidad): emails de comunidad y avisos en vivo por usuario

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Puntos y niveles

**Files:**
- Create: `apps/web/src/lib/puntos/niveles.ts`, `apps/web/src/lib/puntos/servicio.ts`
- Test: `apps/web/src/lib/puntos/niveles.test.ts`, `apps/web/src/lib/puntos/servicio.test.ts`
- Modify: `apps/web/src/lib/progreso/servicio.ts`
- Create: `apps/web/src/app/api/puntos/decision/route.ts`
- Test: `apps/web/src/app/api/puntos/decision/route.test.ts`
- Modify: `apps/web/src/components/mision/mision-provider.tsx`, `apps/web/src/components/mision/decision.tsx`, `apps/web/src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes:
  - `transaccionesPuntos` (Task 1);
  - `registrarIntento` y `guardarEntregable` (Fase 2);
  - `obtenerCaso` (`@/lib/contenido`);
  - el tipo `Mision` (`@syntaxerror/content/tipos`), cuyos `bloques` son `{ tipo, props, texto }`. El bloque `Decision` tiene `props.pregunta` y `props.opciones: { texto; correcta; porque }[]`.
- Produces en `@/lib/puntos/niveles`:
  - `PUNTOS_POR_NIVEL = 100`;
  - `type Nivel = { puntos; nivel; faltan }`;
  - `calcularNivel(puntos): Nivel`.
- Produces en `@/lib/puntos/servicio`:
  - `PUNTOS = { mision: 10, caso: 50, decision: 5 }` y `CLAVE_CASO = "__caso__"`;
  - `otorgarPuntos(db, { userId, casoId, clave, motivo, cantidad }): Promise<boolean>`, que devuelve `true` si el logro era nuevo;
  - `obtenerNivel(db, userId): Promise<Nivel>`;
  - `claveDecision(mision, pregunta)`;
  - `responderDecision(db, userId, { casoSlug, mision, pregunta, opcion })`, que devuelve `{ estado: "decision_no_existe" } | { estado: "registrada"; correcta; puntos }`.
- Produces `POST /api/puntos/decision` con `{ caso, mision, pregunta, opcion }`. Responde 200 `{ correcta, puntos }`, o 401, 400 o 404.
- Produces en `useMisionOpcional()`: el contexto de misión (ahora con `caso` y `mision`) o `null` fuera de una misión.

- [ ] **Step 1: Escribir los tests que fallan**

`apps/web/src/lib/puntos/niveles.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { calcularNivel } from "./niveles";

describe("calcularNivel", () => {
  it("sube un nivel cada 100 puntos", () => {
    expect(calcularNivel(0)).toEqual({ puntos: 0, nivel: 1, faltan: 100 });
    expect(calcularNivel(99)).toEqual({ puntos: 99, nivel: 1, faltan: 1 });
    expect(calcularNivel(100)).toEqual({ puntos: 100, nivel: 2, faltan: 100 });
    expect(calcularNivel(265)).toEqual({ puntos: 265, nivel: 3, faltan: 35 });
  });

  it("nunca baja de nivel 1 con puntos negativos", () => {
    expect(calcularNivel(-20)).toEqual({ puntos: 0, nivel: 1, faltan: 100 });
  });
});
```

`apps/web/src/lib/puntos/servicio.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Mision } from "@syntaxerror/content/tipos";
import { casos, transaccionesPuntos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { guardarEntregable, registrarIntento } from "@/lib/progreso/servicio";
import { obtenerNivel, responderDecision } from "./servicio";

const { db, close } = createTestDb();

const MISION: Mision = {
  slug: "m1",
  titulo: "M1",
  tiempo: 10,
  fuente: "",
  bloques: [
    {
      tipo: "Decision",
      texto: null,
      props: {
        pregunta: "¿Qué haces si falta un dato?",
        opciones: [
          { texto: "Pregunto a quien pidió el reporte", correcta: true, porque: "Aclara el criterio." },
          { texto: "Invento un criterio", correcta: false, porque: "Nadie puede revisarlo." },
        ],
      },
    },
  ],
} as Mision;

async function preparar(): Promise<string> {
  const [usuario] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
  await db.insert(casos).values({
    slug: "ventas",
    titulo: "Ventas",
    cargo: "Analista",
    empresa: "Distribuidora",
    entregable: "Repo",
    misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }],
  });
  return usuario.id;
}

const aprobar = (userId: string) => registrarIntento(db, userId, { caso: "ventas", mision: "m1", tarea: "t1", aprobada: true });

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("puntos por progreso", () => {
  it("aprobar una misión suma 10 puntos una sola vez", async () => {
    const userId = await preparar();
    await aprobar(userId);
    await aprobar(userId);
    expect(await obtenerNivel(db, userId)).toEqual({ puntos: 10, nivel: 1, faltan: 90 });
  });

  it("completar el caso suma 50 más, una sola vez", async () => {
    const userId = await preparar();
    await aprobar(userId);
    await guardarEntregable(db, userId, { caso: "ventas", url: "https://github.com/ana/ventas" });
    await guardarEntregable(db, userId, { caso: "ventas", url: "https://github.com/ana/ventas-v2" });
    expect((await obtenerNivel(db, userId)).puntos).toBe(60);
  });

  it("un intento fallido no suma", async () => {
    const userId = await preparar();
    await registrarIntento(db, userId, { caso: "ventas", mision: "m1", tarea: "t1", aprobada: false });
    expect((await obtenerNivel(db, userId)).puntos).toBe(0);
  });
});

describe("responderDecision", () => {
  const responder = (userId: string, opcion: string, pregunta = "¿Qué haces si falta un dato?") =>
    responderDecision(db, userId, { casoSlug: "ventas", mision: MISION, pregunta, opcion });

  it("la opción correcta suma 5 puntos la primera vez y nada después", async () => {
    const userId = await preparar();
    expect(await responder(userId, "Pregunto a quien pidió el reporte")).toEqual({ estado: "registrada", correcta: true, puntos: 5 });
    expect(await responder(userId, "Pregunto a quien pidió el reporte")).toEqual({ estado: "registrada", correcta: true, puntos: 0 });
    expect((await obtenerNivel(db, userId)).puntos).toBe(5);
  });

  it("si la primera respuesta es incorrecta, acertar después no suma", async () => {
    const userId = await preparar();
    expect(await responder(userId, "Invento un criterio")).toEqual({ estado: "registrada", correcta: false, puntos: 0 });
    expect(await responder(userId, "Pregunto a quien pidió el reporte")).toEqual({ estado: "registrada", correcta: true, puntos: 0 });
    expect(await db.select().from(transaccionesPuntos)).toHaveLength(1);
  });

  it("una decisión u opción que no está en la misión no registra nada", async () => {
    const userId = await preparar();
    expect(await responder(userId, "Pregunto a quien pidió el reporte", "¿Otra pregunta?")).toEqual({ estado: "decision_no_existe" });
    expect(await responder(userId, "Una opción inventada")).toEqual({ estado: "decision_no_existe" });
    expect(await db.select().from(transaccionesPuntos)).toEqual([]);
  });
});
```

`apps/web/src/app/api/puntos/decision/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");

const { POST } = await import("./route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { obtenerCaso } = await import("@/lib/contenido");
const { db, close } = createTestDb();

const MISION = "01-clientes-de-regiones";

async function decisionDeLaMision() {
  const caso = await obtenerCaso("demo-motor");
  const bloque = caso!.misiones.find((mision) => mision.slug === MISION)!.bloques.find((candidato) => candidato.tipo === "Decision");
  if (bloque?.tipo !== "Decision") throw new Error("La misión de prueba no tiene una Decision");
  return bloque.props;
}

function enviar(cuerpo: unknown) {
  return POST(
    new Request("http://localhost:3000/api/puntos/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("POST /api/puntos/decision", () => {
  it("sin sesión responde 401", async () => {
    expect((await enviar({ caso: "demo-motor", mision: MISION, pregunta: "x", opcion: "y" })).status).toBe(401);
  });

  it("registra la primera respuesta a una decisión del contenido", async () => {
    const [usuario] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    await db.insert(casos).values({ slug: "demo-motor", titulo: "Demo", cargo: "Analista", empresa: "Demo", entregable: "Repo", misiones: [] });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
    const { pregunta, opciones } = await decisionDeLaMision();
    const correcta = opciones.find((opcion) => opcion.correcta)!;

    const respuesta = await enviar({ caso: "demo-motor", mision: MISION, pregunta, opcion: correcta.texto });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ correcta: true, puntos: 5 });
  });

  it("responde 400 con datos inválidos y 404 si la misión o la decisión no existen", async () => {
    const [usuario] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    await db.insert(casos).values({ slug: "demo-motor", titulo: "Demo", cargo: "Analista", empresa: "Demo", entregable: "Repo", misiones: [] });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
    expect((await enviar({ caso: "demo-motor" })).status).toBe(400);
    expect((await enviar({ caso: "demo-motor", mision: "no-existe", pregunta: "x", opcion: "y" })).status).toBe(404);
    expect((await enviar({ caso: "demo-motor", mision: MISION, pregunta: "¿Inventada?", opcion: "y" })).status).toBe(404);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/puntos src/app/api/puntos`
Expected: FAIL, porque no se pueden resolver `./niveles`, `./servicio` ni `./route`.

- [ ] **Step 3: Crear `apps/web/src/lib/puntos/niveles.ts`**

```ts
export const PUNTOS_POR_NIVEL = 100;

export type Nivel = { puntos: number; nivel: number; faltan: number };

export function calcularNivel(total: number): Nivel {
  const puntos = Math.max(0, Math.floor(total));
  return { puntos, nivel: Math.floor(puntos / PUNTOS_POR_NIVEL) + 1, faltan: PUNTOS_POR_NIVEL - (puntos % PUNTOS_POR_NIVEL) };
}
```

- [ ] **Step 4: Crear `apps/web/src/lib/puntos/servicio.ts`**

```ts
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Mision } from "@syntaxerror/content/tipos";
import type { AppDb, DbClient } from "@syntaxerror/db/client";
import { casos, transaccionesPuntos } from "@syntaxerror/db/schema";
import { calcularNivel, type Nivel } from "./niveles";

export const PUNTOS = { mision: 10, caso: 50, decision: 5 } as const;
export const CLAVE_CASO = "__caso__";

export type MotivoPuntos = "mision_aprobada" | "caso_completo" | "decision";
export type ResultadoDecision = { estado: "decision_no_existe" } | { estado: "registrada"; correcta: boolean; puntos: number };

// El índice único (usuario, caso, clave) hace que cada logro sume una sola vez, aunque llegue repetido.
export async function otorgarPuntos(
  db: DbClient,
  entrada: { userId: string; casoId: string; clave: string; motivo: MotivoPuntos; cantidad: number }
): Promise<boolean> {
  const filas = await db.insert(transaccionesPuntos).values(entrada).onConflictDoNothing().returning({ id: transaccionesPuntos.id });
  return filas.length > 0;
}

export async function obtenerNivel(db: DbClient, userId: string): Promise<Nivel> {
  const [fila] = await db
    .select({ total: sql<string>`coalesce(sum(${transaccionesPuntos.cantidad}), 0)` })
    .from(transaccionesPuntos)
    .where(eq(transaccionesPuntos.userId, userId));
  return calcularNivel(Number(fila?.total ?? 0));
}

export function claveDecision(mision: string, pregunta: string): string {
  return `decision:${mision}:${createHash("sha256").update(pregunta).digest("hex").slice(0, 16)}`;
}

// Solo cuenta la primera respuesta a cada decisión: elegir otra vez no suma ni resta.
export async function responderDecision(
  db: AppDb,
  userId: string,
  { casoSlug, mision, pregunta, opcion }: { casoSlug: string; mision: Mision; pregunta: string; opcion: string }
): Promise<ResultadoDecision> {
  const bloque = mision.bloques.find((candidato) => candidato.tipo === "Decision" && candidato.props.pregunta === pregunta);
  if (bloque?.tipo !== "Decision") return { estado: "decision_no_existe" };
  const elegida = bloque.props.opciones.find((candidata) => candidata.texto === opcion);
  const [caso] = await db.select({ id: casos.id }).from(casos).where(eq(casos.slug, casoSlug));
  if (!elegida || !caso) return { estado: "decision_no_existe" };

  const cantidad = elegida.correcta ? PUNTOS.decision : 0;
  const primera = await otorgarPuntos(db, { userId, casoId: caso.id, clave: claveDecision(mision.slug, pregunta), motivo: "decision", cantidad });
  return { estado: "registrada", correcta: elegida.correcta, puntos: primera ? cantidad : 0 };
}
```

- [ ] **Step 5: Sumar puntos al aprobar en `apps/web/src/lib/progreso/servicio.ts`**

Agregar a los imports:
```ts
import { CLAVE_CASO, otorgarPuntos, PUNTOS } from "@/lib/puntos/servicio";
```

En `actualizarCompletitud`, justo después de `if (!completo) return false;`, agregar:
```ts
  await otorgarPuntos(tx, { userId, casoId: caso.id, clave: CLAVE_CASO, motivo: "caso_completo", cantidad: PUNTOS.caso });
```

En `registrarIntento`, justo antes de `return { misionAprobada: aprobada, ... }`, agregar:
```ts
    if (aprobada) await otorgarPuntos(tx, { userId, casoId: caso.id, clave: mision.slug, motivo: "mision_aprobada", cantidad: PUNTOS.mision });
```

- [ ] **Step 6: Crear `apps/web/src/app/api/puntos/decision/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { obtenerCaso } from "@/lib/contenido";
import { responderDecision } from "@/lib/puntos/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const esquema = z.object({ caso: slug, mision: slug, pregunta: z.string().min(1).max(1000), opcion: z.string().min(1).max(1000) });

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });

  const caso = await obtenerCaso(parsed.data.caso);
  const mision = caso?.misiones.find((candidata) => candidata.slug === parsed.data.mision);
  if (!caso || !mision) return NextResponse.json({ error: "mision_no_existe" }, { status: 404 });

  const resultado = await responderDecision(getDb(), userId, {
    casoSlug: caso.slug,
    mision,
    pregunta: parsed.data.pregunta,
    opcion: parsed.data.opcion,
  });
  if (resultado.estado === "decision_no_existe") return NextResponse.json({ error: "decision_no_existe" }, { status: 404 });
  return NextResponse.json({ correcta: resultado.correcta, puntos: resultado.puntos });
}
```

- [ ] **Step 7: Correr los tests**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/puntos src/app/api/puntos src/lib/progreso src/app/api/progreso`
Expected: PASS. Son 11 tests nuevos (2 de niveles, 6 de servicio y 3 de la ruta), y los de progreso siguen verdes.

- [ ] **Step 8: Enviar la decisión desde la misión**

En `apps/web/src/components/mision/mision-provider.tsx`:
- Reemplazar el tipo `ContextoMision` por:
```ts
type ContextoMision = {
  caso: string;
  mision: string;
  completa: boolean;
  tareaAprobada: (id: string) => boolean;
  registrarResultado: (id: string, aprobada: boolean) => void;
};
```
- Reemplazar el `useMemo` de `valor` por:
```ts
  const valor = useMemo<ContextoMision>(
    () => ({
      caso,
      mision,
      completa: tareas.length > 0 && tareas.every((tarea) => aprobadas.has(tarea)),
      tareaAprobada: (id) => aprobadas.has(id),
      registrarResultado,
    }),
    [caso, mision, aprobadas, tareas, registrarResultado]
  );
```
- Agregar al final del archivo:
```ts
export function useMisionOpcional(): ContextoMision | null {
  return useContext(Contexto);
}
```

Reemplazar `apps/web/src/components/mision/decision.tsx` por:
```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@syntaxerror/ui/cn";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";
import { mezclar } from "@/lib/mezclar";
import { useMisionOpcional } from "./mision-provider";

type Opcion = { texto: string; correcta: boolean; porque: string };

export function Decision({ pregunta, opciones }: { pregunta: string; opciones: Opcion[] }) {
  const mision = useMisionOpcional();
  const [orden, setOrden] = useState<number[] | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [ganados, setGanados] = useState(0);
  const cantidad = opciones.length;
  useEffect(() => setOrden(mezclar(Array.from({ length: cantidad }, (_, indice) => indice))), [cantidad]);

  function elegir(indice: number) {
    setElegida(indice);
    if (!mision) return;
    // Sin sesión la API responde 401 y la decisión solo se muestra: los puntos son para cuentas.
    void enviarJson("/api/puntos/decision", "POST", { caso: mision.caso, mision: mision.mision, pregunta, opcion: opciones[indice].texto }).then(
      (respuesta) => {
        const puntos = respuesta.datos.puntos;
        if (respuesta.ok && typeof puntos === "number" && puntos > 0) setGanados(puntos);
      }
    );
  }

  return (
    <section className="card grid gap-4 p-5">
      <p className="font-mono text-sm font-bold text-primary">{"> decisión"}</p>
      <p className="font-bold leading-7">{pregunta}</p>
      {orden ? (
        <ul className="grid gap-2">
          {orden.map((indice) => {
            const opcion = opciones[indice];
            const esElegida = elegida === indice;
            return (
              <li key={indice} className="grid gap-1">
                <button type="button" aria-pressed={esElegida} disabled={elegida !== null} onClick={() => elegir(indice)} className={cn("w-full rounded-md border p-3 text-left text-sm leading-6", esElegida && opcion.correcta && "border-primary bg-primary/10", esElegida && !opcion.correcta && "border-destructive bg-destructive/10", !esElegida && "border-border hover:border-primary")}>
                  {opcion.texto}
                </button>
                {elegida !== null ? <p className="px-3 text-sm text-muted-foreground">{opcion.correcta ? "Correcta. " : "Incorrecta. "}{opcion.porque}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-muted-foreground">Cargando opciones…</p>}
      {ganados > 0 ? <p role="status" className="text-sm font-bold text-primary">{`+${ganados} puntos`}</p> : null}
      {elegida !== null ? <div><Button type="button" variant="ghost" size="sm" onClick={() => setElegida(null)}>Elegir otra vez</Button></div> : null}
    </section>
  );
}
```

- [ ] **Step 9: Mostrar el nivel en `apps/web/src/app/(dashboard)/dashboard/page.tsx`**

Agregar a los imports:
```ts
import { calcularNivel } from "@/lib/puntos/niveles";
import { obtenerNivel } from "@/lib/puntos/servicio";
```

Después de `const verificar = ...`, agregar:
```ts
  const nivel = userId ? await obtenerNivel(db, userId) : calcularNivel(0);
```

Después de `{verificar ? <AvisoVerificacion /> : null}`, agregar:
```tsx
      <section className="card grid gap-1 p-4" aria-label="Tu nivel">
        <p className="font-mono text-sm font-bold text-primary">{`> nivel ${nivel.nivel}`}</p>
        <p className="text-xl font-black">{`${nivel.puntos} puntos`}</p>
        <p className="text-sm text-muted-foreground">
          {`Te faltan ${nivel.faltan} para el nivel ${nivel.nivel + 1}. Sumas puntos al aprobar misiones, completar casos y acertar decisiones.`}
        </p>
      </section>
```

- [ ] **Step 10: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS y `tsc` sin errores.

- [ ] **Step 11: Probar en el navegador**

Run: `docker compose up -d --build`

Con una cuenta nueva, abrir `http://localhost:3000/casos/demo-motor/01-clientes-de-regiones`. Luego:
1. Elegir la opción correcta de la decisión: aparece `+5 puntos`.
2. Pulsar `Elegir otra vez` y repetir: no vuelve a aparecer.
3. Aprobar la tarea SQL y abrir `/dashboard`: dice `15 puntos`.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/lib/puntos apps/web/src/lib/progreso/servicio.ts apps/web/src/app/api/puntos apps/web/src/components/mision/mision-provider.tsx apps/web/src/components/mision/decision.tsx "apps/web/src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(comunidad): puntos por mision, caso y decisiones, y nivel en el panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Reseñas por caso

**Files:**
- Create: `apps/web/src/lib/resenas.ts`
- Test: `apps/web/src/lib/resenas.test.ts`
- Create: `apps/web/src/app/api/resenas/route.ts`
- Test: `apps/web/src/app/api/resenas/route.test.ts`
- Create: `apps/web/src/components/comunidad/resenas-caso.tsx`
- Modify: `apps/web/src/app/(misiones)/casos/[caso]/page.tsx`

**Interfaces:**
- Consumes:
  - `resenasCaso`, `casoInscripciones` y `casos` (Tasks 1 y Fase 2);
  - `listarAdmins` (Task 1) y `Encolar`/`encolarSinFallar` (`@/lib/emails`);
  - `insertAuditLogEntry` y `MetaRequest` (`@/lib/cuenta/meta`).
- Produces en `@/lib/resenas`:
  - `type MiResena`: `{ estado: "sin_sesion" }`, `{ estado: "no_completado" }`, `{ estado: "puede_resenar" }` o `{ estado: "ya_reseno"; estrellas; comentario; estadoComentario }`;
  - `type ResumenResenas = { promedio; cantidad; comentarios: { id; nombre; estrellas; comentario; creadaEn: string }[] }`;
  - `miResena(db, userId | null, casoSlug): Promise<MiResena | null>` (null si el caso no existe);
  - `resumenResenas(db, casoSlug): Promise<ResumenResenas | null>`;
  - `crearResena(db, { userId, casoSlug, estrellas, comentario }, { encolar })`, que devuelve `{ ok: true } | { ok: false; motivo: "caso_no_existe" | "no_completado" | "ya_reseno" }`;
  - `moderarComentario(db, { resenaId, admin: { id; email }, decision: "aprobado" | "rechazado" }, meta): Promise<boolean>`. Su pantalla llega en la Fase 3c2.
- Produces la API:
  - `GET /api/resenas?caso=` responde `{ ...ResumenResenas, mia: MiResena }`;
  - `POST /api/resenas` recibe `{ caso, estrellas, comentario? }` y responde 201, o 401, 400, 404, 403 `no_completado` o 409 `ya_reseno`.

- [ ] **Step 1: Escribir los tests que fallan**

`apps/web/src/lib/resenas.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, casoInscripciones, casos, resenasCaso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { crearResena, miResena, moderarComentario, resumenResenas } from "./resenas";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

async function preparar({ completo }: { completo: boolean }) {
  const [alumna] = await db.insert(users).values({ email: "ana@correo.cl", name: "Ana María Soto" }).returning({ id: users.id });
  const [admin] = await db.insert(users).values({ email: "admin@correo.cl", name: "Admin", role: "admin" }).returning({ id: users.id });
  const [caso] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
    .returning({ id: casos.id });
  await db.insert(casoInscripciones).values({ userId: alumna.id, casoId: caso.id, completadoEn: completo ? new Date() : null });
  return { alumnaId: alumna.id, adminId: admin.id };
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("reseñas por caso", () => {
  it("solo quien completó el caso puede reseñar", async () => {
    const { alumnaId } = await preparar({ completo: false });
    expect(await miResena(db, alumnaId, "ventas")).toEqual({ estado: "no_completado" });
    expect(await crearResena(db, { userId: alumnaId, casoSlug: "ventas", estrellas: 5, comentario: null }, { encolar })).toEqual({
      ok: false,
      motivo: "no_completado",
    });
  });

  it("sin sesión, o con un caso que no existe", async () => {
    await preparar({ completo: true });
    expect(await miResena(db, null, "ventas")).toEqual({ estado: "sin_sesion" });
    expect(await miResena(db, null, "otro")).toBeNull();
    expect(await resumenResenas(db, "otro")).toBeNull();
  });

  it("una reseña con comentario queda pendiente, avisa a administración y no se publica hasta aprobarla", async () => {
    const { alumnaId, adminId } = await preparar({ completo: true });
    expect(await crearResena(db, { userId: alumnaId, casoSlug: "ventas", estrellas: 4, comentario: "  Muy claro  " }, { encolar })).toEqual({ ok: true });
    expect(enviados).toEqual([
      { tipo: "resena-nueva", para: "admin@correo.cl", nombre: "Admin", caso: "Ventas", estrellas: 4, comentario: "Muy claro" },
    ]);
    expect(await miResena(db, alumnaId, "ventas")).toEqual({ estado: "ya_reseno", estrellas: 4, comentario: "Muy claro", estadoComentario: "pendiente" });
    expect(await resumenResenas(db, "ventas")).toEqual({ promedio: 4, cantidad: 1, comentarios: [] });

    const [resena] = await db.select().from(resenasCaso);
    expect(await moderarComentario(db, { resenaId: resena.id, admin: { id: adminId, email: "admin@correo.cl" }, decision: "aprobado" }, SIN_META)).toBe(true);
    expect(await moderarComentario(db, { resenaId: resena.id, admin: { id: adminId, email: "admin@correo.cl" }, decision: "rechazado" }, SIN_META)).toBe(false);
    expect((await resumenResenas(db, "ventas"))?.comentarios).toEqual([
      { id: resena.id, nombre: "Ana", estrellas: 4, comentario: "Muy claro", creadaEn: expect.any(String) },
    ]);
    expect((await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action)).toEqual(["review_moderated"]);
  });

  it("la segunda reseña del mismo caso se rechaza", async () => {
    const { alumnaId } = await preparar({ completo: true });
    await crearResena(db, { userId: alumnaId, casoSlug: "ventas", estrellas: 5, comentario: null }, { encolar });
    expect(await crearResena(db, { userId: alumnaId, casoSlug: "ventas", estrellas: 1, comentario: null }, { encolar })).toEqual({
      ok: false,
      motivo: "ya_reseno",
    });
    expect(enviados).toEqual([]);
    expect(await resumenResenas(db, "ventas")).toEqual({ promedio: 5, cantidad: 1, comentarios: [] });
  });

  it("el promedio se redondea a un decimal", async () => {
    await preparar({ completo: true });
    const [caso] = await db.select({ id: casos.id }).from(casos);
    const otras = await db
      .insert(users)
      .values([{ email: "b@correo.cl" }, { email: "c@correo.cl" }, { email: "d@correo.cl" }])
      .returning({ id: users.id });
    await db.insert(resenasCaso).values(otras.map((persona, indice) => ({ userId: persona.id, casoId: caso.id, estrellas: [5, 4, 4][indice] })));
    expect((await resumenResenas(db, "ventas"))?.promedio).toBe(4.3);
  });
});
```

`apps/web/src/app/api/resenas/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casoInscripciones, casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { GET, POST } = await import("./route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function alumnaQueCompleto(): Promise<string> {
  const [alumna] = await db.insert(users).values({ email: "ana@correo.cl", name: "Ana" }).returning({ id: users.id });
  const [caso] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
    .returning({ id: casos.id });
  await db.insert(casoInscripciones).values({ userId: alumna.id, casoId: caso.id, completadoEn: new Date() });
  return alumna.id;
}

const consultar = (caso: string) => GET(new Request(`http://localhost:3000/api/resenas?caso=${caso}`));
const publicar = (cuerpo: unknown) =>
  POST(new Request("http://localhost:3000/api/resenas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("/api/resenas", () => {
  it("GET es público y dice si la persona puede reseñar", async () => {
    const id = await alumnaQueCompleto();
    expect(await (await consultar("ventas")).json()).toEqual({ promedio: 0, cantidad: 0, comentarios: [], mia: { estado: "sin_sesion" } });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(id);
    expect((await (await consultar("ventas")).json()).mia).toEqual({ estado: "puede_resenar" });
    expect((await consultar("otro")).status).toBe(404);
    expect((await GET(new Request("http://localhost:3000/api/resenas"))).status).toBe(400);
  });

  it("POST publica una reseña y la segunda responde 409", async () => {
    expect((await publicar({ caso: "ventas", estrellas: 5 })).status).toBe(401);
    vi.mocked(obtenerUsuarioId).mockResolvedValue(await alumnaQueCompleto());
    expect((await publicar({ caso: "ventas", estrellas: 6 })).status).toBe(400);
    expect((await publicar({ caso: "ventas", estrellas: 4.5 })).status).toBe(400);
    expect((await publicar({ caso: "otro", estrellas: 5 })).status).toBe(404);
    expect((await publicar({ caso: "ventas", estrellas: 5, comentario: "Buenísimo" })).status).toBe(201);
    expect((await publicar({ caso: "ventas", estrellas: 3 })).status).toBe(409);
  });

  it("POST sin completar el caso responde 403", async () => {
    const [persona] = await db.insert(users).values({ email: "b@correo.cl" }).returning({ id: users.id });
    await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "D", entregable: "R", misiones: [] });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(persona.id);
    expect((await publicar({ caso: "ventas", estrellas: 5 })).status).toBe(403);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/resenas.test.ts src/app/api/resenas`
Expected: FAIL, porque no se pueden resolver `./resenas` ni `./route`.

- [ ] **Step 3: Crear `apps/web/src/lib/resenas.ts`**

```ts
import { and, avg, count, desc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { casoInscripciones, casos, resenasCaso, users } from "@syntaxerror/db/schema";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { listarAdmins } from "@/lib/roles";

export type EstadoComentario = "pendiente" | "aprobado" | "rechazado";
export type MiResena =
  | { estado: "sin_sesion" }
  | { estado: "no_completado" }
  | { estado: "puede_resenar" }
  | { estado: "ya_reseno"; estrellas: number; comentario: string | null; estadoComentario: EstadoComentario | null };
export type ResumenResenas = {
  promedio: number;
  cantidad: number;
  comentarios: { id: string; nombre: string; estrellas: number; comentario: string; creadaEn: string }[];
};
export type ResultadoResena = { ok: true } | { ok: false; motivo: "caso_no_existe" | "no_completado" | "ya_reseno" };

async function buscarCaso(db: AppDb, slug: string) {
  const [caso] = await db.select({ id: casos.id, titulo: casos.titulo }).from(casos).where(eq(casos.slug, slug));
  return caso ?? null;
}

async function completo(db: AppDb, userId: string, casoId: string): Promise<boolean> {
  const [inscripcion] = await db
    .select({ completadoEn: casoInscripciones.completadoEn })
    .from(casoInscripciones)
    .where(and(eq(casoInscripciones.userId, userId), eq(casoInscripciones.casoId, casoId)));
  return Boolean(inscripcion?.completadoEn);
}

// En público se muestra solo el primer nombre de quien reseña.
function primerNombre(nombre: string | null): string {
  return nombre?.trim().split(/\s+/)[0] || "Estudiante";
}

export async function miResena(db: AppDb, userId: string | null, casoSlug: string): Promise<MiResena | null> {
  const caso = await buscarCaso(db, casoSlug);
  if (!caso) return null;
  if (!userId) return { estado: "sin_sesion" };
  const [propia] = await db
    .select({ estrellas: resenasCaso.estrellas, comentario: resenasCaso.comentario, estadoComentario: resenasCaso.estadoComentario })
    .from(resenasCaso)
    .where(and(eq(resenasCaso.userId, userId), eq(resenasCaso.casoId, caso.id)));
  if (propia) return { estado: "ya_reseno", ...propia, estadoComentario: propia.estadoComentario as EstadoComentario | null };
  return (await completo(db, userId, caso.id)) ? { estado: "puede_resenar" } : { estado: "no_completado" };
}

export async function resumenResenas(db: AppDb, casoSlug: string): Promise<ResumenResenas | null> {
  const caso = await buscarCaso(db, casoSlug);
  if (!caso) return null;
  const [[totales], comentarios] = await Promise.all([
    db.select({ promedio: avg(resenasCaso.estrellas), cantidad: count() }).from(resenasCaso).where(eq(resenasCaso.casoId, caso.id)),
    db
      .select({ id: resenasCaso.id, nombre: users.name, estrellas: resenasCaso.estrellas, comentario: resenasCaso.comentario, creadaEn: resenasCaso.creadaEn })
      .from(resenasCaso)
      .innerJoin(users, eq(users.id, resenasCaso.userId))
      .where(and(eq(resenasCaso.casoId, caso.id), eq(resenasCaso.estadoComentario, "aprobado")))
      .orderBy(desc(resenasCaso.creadaEn))
      .limit(20),
  ]);
  const cantidad = Number(totales?.cantidad ?? 0);
  return {
    promedio: cantidad > 0 ? Math.round(Number(totales.promedio) * 10) / 10 : 0,
    cantidad,
    comentarios: comentarios.map((fila) => ({
      id: fila.id,
      nombre: primerNombre(fila.nombre),
      estrellas: fila.estrellas,
      comentario: fila.comentario ?? "",
      creadaEn: fila.creadaEn.toISOString(),
    })),
  };
}

export async function crearResena(
  db: AppDb,
  { userId, casoSlug, estrellas, comentario }: { userId: string; casoSlug: string; estrellas: number; comentario: string | null },
  { encolar }: { encolar: Encolar }
): Promise<ResultadoResena> {
  const caso = await buscarCaso(db, casoSlug);
  if (!caso) return { ok: false, motivo: "caso_no_existe" };
  if (!(await completo(db, userId, caso.id))) return { ok: false, motivo: "no_completado" };

  const texto = comentario?.trim() || null;
  const creadas = await db
    .insert(resenasCaso)
    .values({ userId, casoId: caso.id, estrellas, comentario: texto, estadoComentario: texto ? "pendiente" : null })
    .onConflictDoNothing()
    .returning({ id: resenasCaso.id });
  if (creadas.length === 0) return { ok: false, motivo: "ya_reseno" };

  if (texto) {
    for (const admin of await listarAdmins(db)) {
      await encolar({ tipo: "resena-nueva", para: admin.email, nombre: admin.nombre, caso: caso.titulo, estrellas, comentario: texto });
    }
  }
  return { ok: true };
}

export async function moderarComentario(
  db: AppDb,
  { resenaId, admin, decision }: { resenaId: string; admin: { id: string; email: string }; decision: "aprobado" | "rechazado" },
  meta: MetaRequest
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [moderada] = await tx
      .update(resenasCaso)
      .set({ estadoComentario: decision, moderadaPor: admin.id })
      .where(and(eq(resenasCaso.id, resenaId), eq(resenasCaso.estadoComentario, "pendiente")))
      .returning({ id: resenasCaso.id });
    if (!moderada) return false;
    await insertAuditLogEntry(tx, {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "review_moderated",
      targetType: "review",
      targetId: resenaId,
      metadata: { decision },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return true;
  });
}
```

- [ ] **Step 4: Crear `apps/web/src/app/api/resenas/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { encolarSinFallar } from "@/lib/emails";
import { crearResena, miResena, resumenResenas } from "@/lib/resenas";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const esquema = z.object({
  caso: slug,
  estrellas: z.number().int().min(1).max(5),
  comentario: z.string().max(1000).optional(),
});
const ESTADOS = { caso_no_existe: 404, no_completado: 403, ya_reseno: 409 } as const;

export async function GET(request: Request) {
  const caso = new URL(request.url).searchParams.get("caso");
  if (!caso || !slug.safeParse(caso).success) return NextResponse.json({ error: "falta_caso" }, { status: 400 });
  const db = getDb();
  const [resumen, mia] = await Promise.all([resumenResenas(db, caso), obtenerUsuarioId().then((userId) => miResena(db, userId, caso))]);
  if (!resumen || !mia) return NextResponse.json({ error: "caso_no_existe" }, { status: 404 });
  return NextResponse.json({ ...resumen, mia }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await crearResena(
    getDb(),
    { userId, casoSlug: parsed.data.caso, estrellas: parsed.data.estrellas, comentario: parsed.data.comentario ?? null },
    { encolar: encolarSinFallar }
  );
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: ESTADOS[resultado.motivo] });
  return NextResponse.json({ ok: true }, { status: 201 });
}
```

- [ ] **Step 5: Correr los tests**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/resenas.test.ts src/app/api/resenas`
Expected: PASS (8 tests: 5 del servicio y 3 de la ruta).

- [ ] **Step 6: Crear `apps/web/src/components/comunidad/resenas-caso.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";
import type { MiResena, ResumenResenas } from "@/lib/resenas";

type Datos = ResumenResenas & { mia: MiResena };

const estrellasTexto = (cantidad: number) => `${"★".repeat(cantidad)}${"☆".repeat(5 - cantidad)}`;

export function ResenasCaso({ caso }: { caso: string }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const respuesta = await fetch(`/api/resenas?caso=${encodeURIComponent(caso)}`, { cache: "no-store" }).catch(() => null);
    if (respuesta?.ok) setDatos((await respuesta.json()) as Datos);
  }, [caso]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function publicar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (estrellas === 0) {
      setAviso("Elige de 1 a 5 estrellas.");
      return;
    }
    setEnviando(true);
    const texto = comentario.trim();
    const respuesta = await enviarJson("/api/resenas", "POST", { caso, estrellas, ...(texto ? { comentario: texto } : {}) });
    setEnviando(false);
    if (!respuesta.ok) {
      setAviso("No pudimos publicar tu reseña. Intenta de nuevo.");
      return;
    }
    setAviso(texto ? "Gracias. Tu comentario se publicará cuando lo revisemos." : "Gracias por tu reseña.");
    await cargar();
  }

  if (!datos) return null;
  const { mia } = datos;

  return (
    <section className="card grid gap-4 p-5" aria-labelledby="titulo-resenas">
      <h2 id="titulo-resenas" className="text-xl font-black">Reseñas</h2>
      {datos.cantidad === 0 ? (
        <p className="text-muted-foreground">Todavía no hay reseñas de este caso.</p>
      ) : (
        <p className="font-bold">{`★ ${datos.promedio.toLocaleString("es-CL")} de 5 · ${datos.cantidad} ${datos.cantidad === 1 ? "reseña" : "reseñas"}`}</p>
      )}
      {datos.comentarios.length > 0 ? (
        <ul className="grid gap-3">
          {datos.comentarios.map((resena) => (
            <li key={resena.id} className="grid gap-1 border-t border-border pt-3">
              <p className="text-sm">
                <span className="font-bold">{resena.nombre}</span> <span aria-label={`${resena.estrellas} de 5 estrellas`}>{estrellasTexto(resena.estrellas)}</span>
              </p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{resena.comentario}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {mia.estado === "no_completado" ? <p className="text-sm text-muted-foreground">Cuando completes el caso podrás dejar tu reseña.</p> : null}
      {mia.estado === "ya_reseno" ? (
        <p className="text-sm">
          {`Tu reseña: ${mia.estrellas} de 5.`}
          {mia.estadoComentario === "pendiente" ? " Tu comentario se publicará cuando lo revisemos." : null}
        </p>
      ) : null}
      {mia.estado === "puede_resenar" ? (
        <form className="grid gap-3" onSubmit={publicar}>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-bold">Tu nota</legend>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((valor) => (
                <label key={valor} className="flex items-center gap-1 text-sm">
                  <input type="radio" name="estrellas" value={valor} checked={estrellas === valor} onChange={() => setEstrellas(valor)} />
                  {valor === 1 ? "1 estrella" : `${valor} estrellas`}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-2 text-sm font-bold">
            Comentario (opcional)
            <textarea
              value={comentario}
              onChange={(evento) => setComentario(evento.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
            />
          </label>
          <div>
            <Button type="submit" disabled={enviando}>Publicar reseña</Button>
          </div>
        </form>
      ) : null}
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </section>
  );
}
```

`resenas.ts` importa `drizzle-orm` y la base, pero este componente solo importa sus **tipos** con `import type`: no llega código de servidor al navegador.

- [ ] **Step 7: Agregar las reseñas a la página del caso**

En `apps/web/src/app/(misiones)/casos/[caso]/page.tsx`, agregar a los imports:
```ts
import { ResenasCaso } from "@/components/comunidad/resenas-caso";
```

Justo después de `<PanelCaso ... />`, agregar:
```tsx
      <ResenasCaso caso={caso.slug} />
```

- [ ] **Step 8: Correr los tests, el typecheck y el build**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS y `tsc` sin errores.

Run: `docker compose up -d --build && curl -s -D - -o /dev/null localhost:3000/casos/demo-motor | grep -i x-nextjs-cache`
Expected: la página del caso sigue estática. La primera visita puede decir `MISS`; la segunda, `HIT`. En `next dev` el header puede no aparecer: esta comprobación se repite contra el build de producción en la Task 10.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/resenas.ts apps/web/src/lib/resenas.test.ts apps/web/src/app/api/resenas apps/web/src/components/comunidad/resenas-caso.tsx "apps/web/src/app/(misiones)/casos/[caso]/page.tsx"
git commit -m "feat(comunidad): resenas por caso con comentarios moderados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Reportes y mensajes internos

**Files:**
- Create: `apps/web/src/lib/reportes.ts`, `apps/web/src/lib/mensajes.ts`
- Test: `apps/web/src/lib/reportes.test.ts`, `apps/web/src/lib/mensajes.test.ts`
- Modify: `apps/web/src/lib/rate-limit.ts`
- Create: `apps/web/src/app/api/reportes/route.ts`, `apps/web/src/app/api/mensajes/[id]/route.ts`
- Test: `apps/web/src/app/api/reportes/route.test.ts`, `apps/web/src/app/api/mensajes/[id]/route.test.ts`
- Create:
  - `apps/web/src/components/comunidad/enlace-reportar.tsx`
  - `apps/web/src/components/comunidad/formulario-reporte.tsx`
  - `apps/web/src/components/comunidad/boton-marcar-leido.tsx`
  - `apps/web/src/app/(cuenta)/reportar/page.tsx`
  - `apps/web/src/app/(dashboard)/dashboard/mensajes/page.tsx`
- Modify: `apps/web/src/components/site-footer.tsx`

**Interfaces:**
- Consumes: `reportes` y `mensajes` (Task 1), `listarAdmins` y `exigirUsuario` (Task 1), `esUuid` (Task 1), `enlaceMensajes` (Task 2), `checkRateLimit`.
- Produces en `@/lib/reportes`:
  - `reporteSchema`, que recibe `{ tipo: "error" | "sugerencia"; descripcion: 10..2000; pagina: ruta interna }`;
  - `paginaValida(pagina)`;
  - `contextoDePagina(pagina): { caso; mision }`;
  - `crearReporte(db, autor: Persona, datos, { encolar }): Promise<string>`.
- Produces en `@/lib/mensajes`:
  - `type Mensaje = { id; asunto; cuerpo; leido; creadoEn }`;
  - `crearMensaje(db, { userId, remitenteId, reporteId?, asunto, cuerpo }, { encolar }): Promise<string | null>`, que usará la Fase 3c2 para responder reportes;
  - `listarMensajes(db, userId)`, `contarNoLeidos(db, userId)` y `marcarLeido(db, userId, mensajeId): Promise<boolean>`.
- Produces la API:
  - `POST /api/reportes` responde 201, o 401, 429 o 400;
  - `PATCH /api/mensajes/[id]` responde 200, o 401 o 404.
- Produces las páginas `/reportar?pagina=` y `/dashboard/mensajes`, y el enlace `Reportar un problema` en el pie de página.
- Límite nuevo: `reportes`, 5 por hora por persona.

- [ ] **Step 1: Escribir los tests que fallan**

`apps/web/src/lib/reportes.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { reportes, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Encolar } from "@/lib/emails";
import { contextoDePagina, crearReporte, paginaValida } from "./reportes";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("reportes", () => {
  it("solo acepta rutas internas como página", () => {
    expect(paginaValida("/casos/ventas/m1?x=1")).toBe(true);
    expect(paginaValida("/")).toBe(true);
    expect(paginaValida("https://otro.sitio")).toBe(false);
    expect(paginaValida("//otro.sitio")).toBe(false);
    expect(paginaValida("/con espacio")).toBe(false);
  });

  it("saca el caso y la misión de la página", () => {
    expect(contextoDePagina("/casos/ventas/m1?x=1")).toEqual({ caso: "ventas", mision: "m1" });
    expect(contextoDePagina("/casos/ventas")).toEqual({ caso: "ventas", mision: null });
    expect(contextoDePagina("/dashboard")).toEqual({ caso: null, mision: null });
  });

  it("guarda el reporte con su contexto y avisa a administración", async () => {
    const [autora] = await db.insert(users).values({ email: "ana@correo.cl", name: "Ana" }).returning({ id: users.id });
    await db.insert(users).values({ email: "admin@correo.cl", name: "Admin", role: "admin" });
    await crearReporte(
      db,
      { id: autora.id, email: "ana@correo.cl", nombre: "Ana" },
      { tipo: "error", descripcion: "La tabla no carga en la misión.", pagina: "/casos/ventas/m1" },
      { encolar }
    );
    const [guardado] = await db.select().from(reportes);
    expect(guardado).toMatchObject({ userId: autora.id, tipo: "error", caso: "ventas", mision: "m1", estado: "pendiente" });
    expect(enviados).toEqual([
      {
        tipo: "reporte-nuevo",
        para: "admin@correo.cl",
        nombre: "Admin",
        tipoReporte: "error",
        descripcion: "La tabla no carga en la misión.",
        pagina: "/casos/ventas/m1",
        autor: "Ana (ana@correo.cl)",
      },
    ]);
  });
});
```

`apps/web/src/lib/mensajes.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Encolar } from "@/lib/emails";
import { contarNoLeidos, crearMensaje, listarMensajes, marcarLeido } from "./mensajes";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("mensajes internos", () => {
  it("crea el mensaje, avisa por email y se marca como leído solo por su destinataria", async () => {
    const [ana, otra] = await db
      .insert(users)
      .values([{ email: "ana@correo.cl", name: "Ana" }, { email: "otra@correo.cl" }])
      .returning({ id: users.id });
    const id = await crearMensaje(db, { userId: ana.id, remitenteId: null, asunto: "Gracias por tu reporte", cuerpo: "Ya lo arreglamos." }, { encolar });
    expect(enviados).toEqual([
      { tipo: "mensaje-nuevo", para: "ana@correo.cl", nombre: "Ana", asunto: "Gracias por tu reporte", enlace: expect.stringContaining("/dashboard/mensajes") },
    ]);
    expect(await contarNoLeidos(db, ana.id)).toBe(1);

    expect(await marcarLeido(db, otra.id, id!)).toBe(false);
    expect(await marcarLeido(db, ana.id, id!)).toBe(true);
    expect(await marcarLeido(db, ana.id, id!)).toBe(true);
    expect(await contarNoLeidos(db, ana.id)).toBe(0);
    expect(await listarMensajes(db, ana.id)).toEqual([
      { id, asunto: "Gracias por tu reporte", cuerpo: "Ya lo arreglamos.", leido: true, creadoEn: expect.any(Date) },
    ]);
  });

  it("no crea mensajes para una cuenta que no existe", async () => {
    expect(
      await crearMensaje(db, { userId: "0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11", remitenteId: null, asunto: "Hola", cuerpo: "Hola" }, { encolar })
    ).toBeNull();
    expect(enviados).toEqual([]);
  });
});
```

`apps/web/src/app/api/reportes/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { reportes, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { POST } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const reportar = (cuerpo: unknown) =>
  POST(new Request("http://localhost:3000/api/reportes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));
const valido = { tipo: "sugerencia", descripcion: "Me gustaría un caso de retail.", pagina: "/rutas" };

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

async function iniciarSesion() {
  const [persona] = await db.insert(users).values({ email: `ana-${crypto.randomUUID()}@correo.cl` }).returning({ id: users.id, email: users.email });
  vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: persona.id, email: persona.email, nombre: null, rol: "student" });
}

describe("POST /api/reportes", () => {
  it("sin sesión responde 401 y con datos inválidos 400", async () => {
    expect((await reportar(valido)).status).toBe(401);
    await iniciarSesion();
    expect((await reportar({ ...valido, descripcion: "corto" })).status).toBe(400);
    expect((await reportar({ ...valido, pagina: "https://otro.sitio" })).status).toBe(400);
  });

  it("guarda el reporte y desde el sexto en una hora responde 429", async () => {
    await iniciarSesion();
    for (let intento = 0; intento < 5; intento++) expect((await reportar(valido)).status).toBe(201);
    expect((await reportar(valido)).status).toBe(429);
    expect(await db.select().from(reportes)).toHaveLength(5);
  });
});
```

`apps/web/src/app/api/mensajes/[id]/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mensajes, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const { PATCH } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const marcar = (id: string) => PATCH(new Request(`http://localhost:3000/api/mensajes/${id}`, { method: "PATCH" }), { params: Promise.resolve({ id }) });

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("PATCH /api/mensajes/[id]", () => {
  it("marca como leído un mensaje propio y responde 404 para uno ajeno o un id inválido", async () => {
    const [ana, otra] = await db.insert(users).values([{ email: "ana@correo.cl" }, { email: "otra@correo.cl" }]).returning({ id: users.id });
    const [mensaje] = await db.insert(mensajes).values({ userId: ana.id, asunto: "Hola", cuerpo: "Hola" }).returning({ id: mensajes.id });

    expect((await marcar(mensaje.id)).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: otra.id, email: "otra@correo.cl", nombre: null, rol: "student" });
    expect((await marcar(mensaje.id)).status).toBe(404);
    expect((await marcar("no-es-un-uuid")).status).toBe(404);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: ana.id, email: "ana@correo.cl", nombre: null, rol: "student" });
    expect((await marcar(mensaje.id)).status).toBe(200);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/reportes.test.ts src/lib/mensajes.test.ts src/app/api/reportes src/app/api/mensajes`
Expected: FAIL, porque no se pueden resolver `./reportes`, `./mensajes` ni `./route`.

- [ ] **Step 3: Crear `apps/web/src/lib/reportes.ts`**

```ts
import { z } from "zod";
import type { AppDb } from "@syntaxerror/db/client";
import { reportes } from "@syntaxerror/db/schema";
import type { Encolar } from "@/lib/emails";
import { listarAdmins, type Persona } from "@/lib/roles";

// Solo rutas internas: empieza con "/" pero no con "//", y no lleva espacios.
const pagina = z.string().trim().max(300).regex(/^\/(?!\/)\S*$/);

export const reporteSchema = z.object({
  tipo: z.enum(["error", "sugerencia"]),
  descripcion: z.string().trim().min(10).max(2000),
  pagina,
});
export type DatosReporte = z.infer<typeof reporteSchema>;

export function paginaValida(valor: string): boolean {
  return pagina.safeParse(valor).success;
}

export function contextoDePagina(valor: string): { caso: string | null; mision: string | null } {
  const coincidencia = /^\/casos\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?/.exec(valor);
  return { caso: coincidencia?.[1] ?? null, mision: coincidencia?.[2] ?? null };
}

export async function crearReporte(db: AppDb, autor: Persona, datos: DatosReporte, { encolar }: { encolar: Encolar }): Promise<string> {
  const [creado] = await db
    .insert(reportes)
    .values({ userId: autor.id, ...datos, ...contextoDePagina(datos.pagina) })
    .returning({ id: reportes.id });
  const quien = autor.nombre ? `${autor.nombre} (${autor.email})` : autor.email;
  for (const admin of await listarAdmins(db)) {
    await encolar({
      tipo: "reporte-nuevo",
      para: admin.email,
      nombre: admin.nombre,
      tipoReporte: datos.tipo,
      descripcion: datos.descripcion,
      pagina: datos.pagina,
      autor: quien,
    });
  }
  return creado.id;
}
```

- [ ] **Step 4: Crear `apps/web/src/lib/mensajes.ts`**

```ts
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { mensajes, users } from "@syntaxerror/db/schema";
import { enlaceMensajes } from "@/lib/cuenta/enlaces";
import type { Encolar } from "@/lib/emails";

export type Mensaje = { id: string; asunto: string; cuerpo: string; leido: boolean; creadoEn: Date };

export async function crearMensaje(
  db: AppDb,
  entrada: { userId: string; remitenteId: string | null; reporteId?: string | null; asunto: string; cuerpo: string },
  { encolar }: { encolar: Encolar }
): Promise<string | null> {
  const [destinataria] = await db.select({ email: users.email, nombre: users.name }).from(users).where(eq(users.id, entrada.userId));
  if (!destinataria) return null;
  const [creado] = await db
    .insert(mensajes)
    .values({ ...entrada, reporteId: entrada.reporteId ?? null })
    .returning({ id: mensajes.id });
  await encolar({ tipo: "mensaje-nuevo", para: destinataria.email, nombre: destinataria.nombre, asunto: entrada.asunto, enlace: enlaceMensajes() });
  return creado.id;
}

export async function listarMensajes(db: AppDb, userId: string): Promise<Mensaje[]> {
  const filas = await db
    .select({ id: mensajes.id, asunto: mensajes.asunto, cuerpo: mensajes.cuerpo, leidoEn: mensajes.leidoEn, creadoEn: mensajes.creadoEn })
    .from(mensajes)
    .where(eq(mensajes.userId, userId))
    .orderBy(desc(mensajes.creadoEn))
    .limit(50);
  return filas.map(({ leidoEn, ...fila }) => ({ ...fila, leido: leidoEn !== null }));
}

export async function contarNoLeidos(db: AppDb, userId: string): Promise<number> {
  const [fila] = await db.select({ total: count() }).from(mensajes).where(and(eq(mensajes.userId, userId), isNull(mensajes.leidoEn)));
  return Number(fila?.total ?? 0);
}

// Idempotente: marcar dos veces conserva la primera fecha de lectura.
export async function marcarLeido(db: AppDb, userId: string, mensajeId: string): Promise<boolean> {
  const filas = await db
    .update(mensajes)
    .set({ leidoEn: sql`coalesce(${mensajes.leidoEn}, now())` })
    .where(and(eq(mensajes.id, mensajeId), eq(mensajes.userId, userId)))
    .returning({ id: mensajes.id });
  return filas.length > 0;
}
```

- [ ] **Step 5: Agregar el límite en `apps/web/src/lib/rate-limit.ts`**

Agregar `| "reportes"` al final del tipo `RateLimitKey` (después de `| "tutor"`). Agregar a `LIMITER_CONFIGS`, después de `tutor: ...`:
```ts
  reportes: { points: 5, duration: 3600 },
```

- [ ] **Step 6: Crear las rutas**

`apps/web/src/app/api/reportes/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { encolarSinFallar } from "@/lib/emails";
import { exigirUsuario } from "@/lib/permisos";
import { checkRateLimit } from "@/lib/rate-limit";
import { crearReporte, reporteSchema } from "@/lib/reportes";

export async function POST(request: Request) {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  const limite = await checkRateLimit("reportes", usuario.id);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const parsed = reporteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const id = await crearReporte(getDb(), usuario, parsed.data, { encolar: encolarSinFallar });
  return NextResponse.json({ id }, { status: 201 });
}
```

`apps/web/src/app/api/mensajes/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { marcarLeido } from "@/lib/mensajes";
import { exigirUsuario } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id) || !(await marcarLeido(getDb(), usuario.id, id))) {
    return NextResponse.json({ error: "no_existe" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Correr los tests**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/reportes.test.ts src/lib/mensajes.test.ts src/app/api/reportes src/app/api/mensajes`
Expected: PASS (8 tests).

- [ ] **Step 8: Crear los componentes y las páginas**

`apps/web/src/components/comunidad/enlace-reportar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Lleva la página actual para que el reporte diga desde dónde se envió. Funciona en páginas estáticas.
export function EnlaceReportar() {
  const pathname = usePathname();
  return (
    <Link href={`/reportar?pagina=${encodeURIComponent(pathname || "/")}`} className="hover:text-foreground">
      Reportar un problema
    </Link>
  );
}
```

En `apps/web/src/components/site-footer.tsx`:
- agregar `import { EnlaceReportar } from "./comunidad/enlace-reportar";`;
- agregar `<EnlaceReportar />` después del enlace `Términos`, dentro del mismo `<nav>`;
- cambiar su `aria-label="Legal"` por `aria-label="Pie de página"`.

`apps/web/src/components/comunidad/formulario-reporte.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioReporte({ pagina }: { pagina: string }) {
  const [tipo, setTipo] = useState<"error" | "sugerencia">("error");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson("/api/reportes", "POST", { tipo, descripcion, pagina });
    setEnviando(false);
    if (respuesta.ok) {
      setEnviado(true);
      return;
    }
    if (respuesta.status === 429) setAviso("Ya enviaste varios reportes esta hora. Intenta más tarde.");
    else if (respuesta.status === 400) setAviso("Cuéntanos un poco más: escribe al menos 10 caracteres.");
    else setAviso("No pudimos enviar el reporte. Intenta de nuevo.");
  }

  if (enviado) {
    return (
      <div className="grid gap-3">
        <p role="status" className="font-bold">Gracias. Lo vamos a revisar.</p>
        <Link className="font-bold text-primary hover:underline" href={pagina}>Volver a donde estabas</Link>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={enviar}>
      <p className="text-sm text-muted-foreground">{`Página: ${pagina}`}</p>
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-2 text-sm font-bold">¿Qué quieres contarnos?</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="tipo" checked={tipo === "error"} onChange={() => setTipo("error")} /> Un error
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="tipo" checked={tipo === "sugerencia"} onChange={() => setTipo("sugerencia")} /> Una sugerencia
        </label>
      </fieldset>
      <label className="grid gap-2 text-sm font-bold">
        Descripción
        <textarea
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
          rows={5}
          minLength={10}
          maxLength={2000}
          required
          className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
        />
      </label>
      <div>
        <Button type="submit" disabled={enviando}>Enviar reporte</Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
```

`apps/web/src/app/(cuenta)/reportar/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { FormularioReporte } from "@/components/comunidad/formulario-reporte";
import { paginaValida } from "@/lib/reportes";
import { obtenerUsuarioId } from "@/lib/sesion";

export const metadata = { title: "Reportar un problema" };
export const dynamic = "force-dynamic";

export default async function ReportarPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina: pedida } = await searchParams;
  const pagina = pedida && paginaValida(pedida) ? pedida : "/";
  if (!(await obtenerUsuarioId())) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/reportar?pagina=${encodeURIComponent(pagina)}`)}`);
  }
  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-bold text-primary">{"> git issue create"}</p>
      <h1 className="text-3xl font-black">Reportar un problema</h1>
      <p className="leading-7 text-muted-foreground">Cuéntanos qué falló o qué mejorarías. Lo lee el equipo de syntaxError.cl.</p>
      <FormularioReporte pagina={pagina} />
    </main>
  );
}
```

`apps/web/src/components/comunidad/boton-marcar-leido.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

export function BotonMarcarLeido({ id }: { id: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={enviando}
      onClick={async () => {
        setEnviando(true);
        const respuesta = await enviarJson(`/api/mensajes/${id}`, "PATCH");
        setEnviando(false);
        if (respuesta.ok) router.refresh();
      }}
    >
      Marcar como leído
    </Button>
  );
}
```

`apps/web/src/app/(dashboard)/dashboard/mensajes/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { BotonMarcarLeido } from "@/components/comunidad/boton-marcar-leido";
import { listarMensajes } from "@/lib/mensajes";
import { obtenerUsuarioId } from "@/lib/sesion";

export const metadata = { title: "Tus mensajes" };

export default async function MensajesPage() {
  const userId = await obtenerUsuarioId();
  if (!userId) redirect("/login?callbackUrl=/dashboard/mensajes");
  const lista = await listarMensajes(getDb(), userId);
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-bold text-primary">{"> cat ~/mensajes"}</p>
      <h1 className="text-3xl font-black">Tus mensajes</h1>
      {lista.length === 0 ? (
        <p className="text-muted-foreground">No tienes mensajes. Cuando el equipo te escriba, por ejemplo al revisar un reporte, aparecerá aquí.</p>
      ) : (
        <ul className="grid gap-3">
          {lista.map((mensaje) => (
            <li key={mensaje.id} className={mensaje.leido ? "card grid gap-2 p-4" : "card grid gap-2 border-primary p-4"}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">{mensaje.asunto}</h2>
                {mensaje.leido ? null : <span className="badge">Nuevo</span>}
              </div>
              <p className="text-xs text-muted-foreground">{mensaje.creadoEn.toLocaleString("es-CL", { timeZone: "America/Santiago" })}</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{mensaje.cuerpo}</p>
              {mensaje.leido ? null : <div><BotonMarcarLeido id={mensaje.id} /></div>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 9: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS y `tsc` sin errores.

- [ ] **Step 10: Probar en el navegador**

Con `docker compose up -d --build` y una sesión abierta:
1. Abrir una misión y pulsar `Reportar un problema` en el pie de página. La página muestra `Página: /casos/demo-motor/...`.
2. Enviar un error. En Mailpit (`http://localhost:8025`) llega `Reportaron un error` a `admin@local.test`.
3. Sin sesión, `Reportar un problema` lleva al login y, al entrar, vuelve al formulario con la misma página.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/lib/reportes.ts apps/web/src/lib/reportes.test.ts apps/web/src/lib/mensajes.ts apps/web/src/lib/mensajes.test.ts apps/web/src/lib/rate-limit.ts apps/web/src/app/api/reportes apps/web/src/app/api/mensajes apps/web/src/components/comunidad apps/web/src/components/site-footer.tsx "apps/web/src/app/(cuenta)/reportar" "apps/web/src/app/(dashboard)/dashboard/mensajes"
git commit -m "feat(comunidad): reportes de errores y sugerencias, y mensajes internos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Solicitudes de acceso docente

**Files:**
- Create: `apps/web/src/lib/docentes.ts`
- Test: `apps/web/src/lib/docentes.test.ts`
- Create: `apps/web/src/app/api/docentes/solicitud/route.ts`
- Test: `apps/web/src/app/api/docentes/solicitud/route.test.ts`
- Create: `apps/web/src/components/comunidad/seccion-docencia.tsx`
- Modify: `apps/web/src/app/(dashboard)/perfil/page.tsx`

**Interfaces:**
- Consumes: `solicitudesDocente` y `users` (Task 1), `esDocente`, `listarAdmins` y `exigirUsuario` (Task 1), `insertAuditLogEntry` y `MetaRequest`.
- Produces en `@/lib/docentes`:
  - `type EstadoDocencia = "docente" | "pendiente" | "puede_solicitar"`;
  - `estadoDocencia(db, usuario: { id; rol }): Promise<EstadoDocencia>`;
  - `solicitarDocencia(db, usuario: UsuarioActual, { encolar }): Promise<EstadoDocencia>`;
  - `decidirSolicitud(db, { solicitudId, admin: { id; email }, decision: "aprobada" | "rechazada" }, meta): Promise<boolean>`. Su pantalla llega en la Fase 3c2.
- Produces la API: `GET` y `POST /api/docentes/solicitud` responden `{ estado }`, o 401.
- Produces en `/perfil` la sección `Docencia`.

- [ ] **Step 1: Escribir los tests que fallan**

`apps/web/src/lib/docentes.test.ts`:
```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, solicitudesDocente, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import type { Rol } from "@/lib/roles";
import { decidirSolicitud, estadoDocencia, solicitarDocencia } from "./docentes";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const ADMIN = { id: "", email: "admin@correo.cl" };

async function persona(rol: Rol = "student") {
  const [fila] = await db.insert(users).values({ email: `${rol}@correo.cl`, name: "Rosa Díaz", role: rol }).returning({ id: users.id });
  return { id: fila.id, email: `${rol}@correo.cl`, nombre: "Rosa Díaz", rol };
}

async function rolDe(id: string) {
  const [fila] = await db.select({ role: users.role }).from(users).where(eq(users.id, id));
  return fila.role;
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
  const [admin] = await db.insert(users).values({ email: "admin@correo.cl", name: "Admin", role: "admin" }).returning({ id: users.id });
  ADMIN.id = admin.id;
});
afterAll(() => close());

describe("solicitudes de acceso docente", () => {
  it("pedir acceso crea una sola solicitud pendiente y avisa a administración una vez", async () => {
    const rosa = await persona();
    expect(await estadoDocencia(db, rosa)).toBe("puede_solicitar");
    expect(await solicitarDocencia(db, rosa, { encolar })).toBe("pendiente");
    expect(await solicitarDocencia(db, rosa, { encolar })).toBe("pendiente");
    expect(await db.select().from(solicitudesDocente)).toHaveLength(1);
    expect(enviados).toEqual([
      { tipo: "solicitud-docente-nueva", para: "admin@correo.cl", nombre: "Admin", solicitante: "Rosa Díaz (student@correo.cl)" },
    ]);
  });

  it("aprobar cambia el rol a teacher y deja registro; decidir dos veces no hace nada", async () => {
    const rosa = await persona();
    await solicitarDocencia(db, rosa, { encolar });
    const [solicitud] = await db.select().from(solicitudesDocente);
    expect(await decidirSolicitud(db, { solicitudId: solicitud.id, admin: ADMIN, decision: "aprobada" }, SIN_META)).toBe(true);
    expect(await decidirSolicitud(db, { solicitudId: solicitud.id, admin: ADMIN, decision: "rechazada" }, SIN_META)).toBe(false);
    expect(await rolDe(rosa.id)).toBe("teacher");
    expect(await estadoDocencia(db, { id: rosa.id, rol: "teacher" })).toBe("docente");
    expect((await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action)).toEqual(["role_changed"]);
  });

  it("tras un rechazo se puede volver a pedir", async () => {
    const rosa = await persona();
    await solicitarDocencia(db, rosa, { encolar });
    const [solicitud] = await db.select().from(solicitudesDocente);
    await decidirSolicitud(db, { solicitudId: solicitud.id, admin: ADMIN, decision: "rechazada" }, SIN_META);
    expect(await rolDe(rosa.id)).toBe("student");
    expect(await estadoDocencia(db, rosa)).toBe("puede_solicitar");
    expect(await solicitarDocencia(db, rosa, { encolar })).toBe("pendiente");
  });

  it("una cuenta que ya es docente no crea solicitudes", async () => {
    const docente = await persona("teacher");
    expect(await solicitarDocencia(db, docente, { encolar })).toBe("docente");
    expect(await db.select().from(solicitudesDocente)).toEqual([]);
  });
});
```

`apps/web/src/app/api/docentes/solicitud/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { GET, POST } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("/api/docentes/solicitud", () => {
  it("sin sesión responde 401", async () => {
    expect((await GET()).status).toBe(401);
    expect((await POST()).status).toBe(401);
  });

  it("pedir acceso deja la solicitud pendiente", async () => {
    const [rosa] = await db.insert(users).values({ email: "rosa@correo.cl" }).returning({ id: users.id });
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: rosa.id, email: "rosa@correo.cl", nombre: null, rol: "student" });
    expect(await (await GET()).json()).toEqual({ estado: "puede_solicitar" });
    expect(await (await POST()).json()).toEqual({ estado: "pendiente" });
    expect(await (await GET()).json()).toEqual({ estado: "pendiente" });
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/docentes.test.ts src/app/api/docentes`
Expected: FAIL, porque no se pueden resolver `./docentes` ni `./route`.

- [ ] **Step 3: Crear `apps/web/src/lib/docentes.ts`**

```ts
import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { solicitudesDocente, users } from "@syntaxerror/db/schema";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { esDocente, listarAdmins, type Rol } from "@/lib/roles";
import type { UsuarioActual } from "@/lib/sesion";

export type EstadoDocencia = "docente" | "pendiente" | "puede_solicitar";

export async function estadoDocencia(db: AppDb, usuario: { id: string; rol: Rol }): Promise<EstadoDocencia> {
  if (esDocente(usuario)) return "docente";
  const [ultima] = await db
    .select({ estado: solicitudesDocente.estado })
    .from(solicitudesDocente)
    .where(eq(solicitudesDocente.userId, usuario.id))
    .orderBy(desc(solicitudesDocente.creadaEn))
    .limit(1);
  return ultima?.estado === "pendiente" ? "pendiente" : "puede_solicitar";
}

export async function solicitarDocencia(db: AppDb, usuario: UsuarioActual, { encolar }: { encolar: Encolar }): Promise<EstadoDocencia> {
  if (esDocente(usuario)) return "docente";
  // El índice único parcial deja una sola solicitud pendiente por persona, aunque lleguen dos clics.
  const creadas = await db.insert(solicitudesDocente).values({ userId: usuario.id }).onConflictDoNothing().returning({ id: solicitudesDocente.id });
  if (creadas.length > 0) {
    const solicitante = usuario.nombre ? `${usuario.nombre} (${usuario.email})` : usuario.email;
    for (const admin of await listarAdmins(db)) {
      await encolar({ tipo: "solicitud-docente-nueva", para: admin.email, nombre: admin.nombre, solicitante });
    }
  }
  return "pendiente";
}

export async function decidirSolicitud(
  db: AppDb,
  { solicitudId, admin, decision }: { solicitudId: string; admin: { id: string; email: string }; decision: "aprobada" | "rechazada" },
  meta: MetaRequest
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [solicitud] = await tx
      .update(solicitudesDocente)
      .set({ estado: decision, revisadaEn: new Date(), revisadaPor: admin.id })
      .where(and(eq(solicitudesDocente.id, solicitudId), eq(solicitudesDocente.estado, "pendiente")))
      .returning({ userId: solicitudesDocente.userId });
    if (!solicitud) return false;
    if (decision === "aprobada") {
      // Solo sube a teacher a quien es student: nunca le quita el rol a una cuenta admin.
      const [cambiado] = await tx
        .update(users)
        .set({ role: "teacher", updatedAt: new Date() })
        .where(and(eq(users.id, solicitud.userId), eq(users.role, "student")))
        .returning({ id: users.id });
      if (cambiado) {
        await insertAuditLogEntry(tx, {
          actorId: admin.id,
          actorEmail: admin.email,
          action: "role_changed",
          targetType: "user",
          targetId: solicitud.userId,
          metadata: { rolAnterior: "student", rolNuevo: "teacher", solicitudId },
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        });
      }
    }
    return true;
  });
}
```

- [ ] **Step 4: Crear `apps/web/src/app/api/docentes/solicitud/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { estadoDocencia, solicitarDocencia } from "@/lib/docentes";
import { encolarSinFallar } from "@/lib/emails";
import { exigirUsuario } from "@/lib/permisos";

export const dynamic = "force-dynamic";

export async function GET() {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  return NextResponse.json({ estado: await estadoDocencia(getDb(), usuario) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  return NextResponse.json({ estado: await solicitarDocencia(getDb(), usuario, { encolar: encolarSinFallar }) });
}
```

- [ ] **Step 5: Correr los tests**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/docentes.test.ts src/app/api/docentes`
Expected: PASS (6 tests).

- [ ] **Step 6: Crear la sección del perfil**

`apps/web/src/components/comunidad/seccion-docencia.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";
import type { EstadoDocencia } from "@/lib/docentes";

export function SeccionDocencia({ estadoInicial }: { estadoInicial: EstadoDocencia }) {
  const [estado, setEstado] = useState(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  if (estado === "docente") {
    return (
      <p className="text-sm">
        Tienes acceso docente.{" "}
        <Link className="font-bold text-primary hover:underline" href="/profesor">Ir a tu panel docente</Link>
      </p>
    );
  }
  if (estado === "pendiente") {
    return <p role="status" className="text-sm font-bold">Tu solicitud de acceso docente está en revisión.</p>;
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        ¿Haces clases? Con acceso docente puedes crear clases, asignar casos y responder las preguntas de tus estudiantes.
      </p>
      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={enviando}
          onClick={async () => {
            setEnviando(true);
            const respuesta = await enviarJson("/api/docentes/solicitud", "POST");
            setEnviando(false);
            if (respuesta.ok && typeof respuesta.datos.estado === "string") setEstado(respuesta.datos.estado as EstadoDocencia);
            else setAviso("No pudimos enviar la solicitud. Intenta de nuevo.");
          }}
        >
          Pedir acceso docente
        </Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </div>
  );
}
```

En `apps/web/src/app/(dashboard)/perfil/page.tsx`:
- agregar a los imports:
```ts
import { SeccionDocencia } from "@/components/comunidad/seccion-docencia";
import { estadoDocencia } from "@/lib/docentes";
import { obtenerUsuarioActual } from "@/lib/sesion";
```
- después de `if (!perfil) redirect(...)`, agregar:
```ts
  const actual = await obtenerUsuarioActual();
  const docencia = actual ? await estadoDocencia(getDb(), actual) : "puede_solicitar";
```
- agregar la sección entre `Portafolio público` y `Descargar tus datos`:
```tsx
      <Seccion titulo="Docencia">
        <SeccionDocencia estadoInicial={docencia} />
      </Seccion>
```

- [ ] **Step 7: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS y `tsc` sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/docentes.ts apps/web/src/lib/docentes.test.ts apps/web/src/app/api/docentes apps/web/src/components/comunidad/seccion-docencia.tsx "apps/web/src/app/(dashboard)/perfil/page.tsx"
git commit -m "feat(comunidad): solicitudes de acceso docente

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Clases: servicio y API

**Files:**
- Create: `apps/web/src/lib/clases/codigo.ts`, `apps/web/src/lib/clases/servicio.ts`
- Test: `apps/web/src/lib/clases/codigo.test.ts`, `apps/web/src/lib/clases/servicio.test.ts`
- Modify: `apps/web/src/lib/rate-limit.ts`
- Create:
  - `apps/web/src/app/api/profesor/clases/route.ts`
  - `apps/web/src/app/api/profesor/clases/[id]/casos/[caso]/route.ts`
  - `apps/web/src/app/api/profesor/clases/[id]/estudiantes/[userId]/route.ts`
  - `apps/web/src/app/api/clases/unirse/route.ts`
- Test: `apps/web/src/app/api/profesor/clases/route.test.ts`, `apps/web/src/app/api/clases/unirse/route.test.ts`

**Interfaces:**
- Consumes:
  - `clases`, `claseCasos`, `claseInscripciones` (Task 1) y `rutas`, `rutaCasos`, `casos`, `misionProgreso`, `casoInscripciones`;
  - `exigirUsuario`, `exigirDocente` y `esUuid` (Task 1);
  - `enlacePanelDocente` y `enlaceMisClases` (Task 2);
  - `rutasParaPublicar()` (`@/lib/contenido`).
- Produces en `@/lib/clases/codigo`: `generarCodigo()` (6 caracteres sin 0, O, 1, I ni L) y `normalizarCodigo(valor)`.
- Produces tipos en `@/lib/clases/servicio`:
  - `type Clase`;
  - `type EstadoInscripcion = "pendiente" | "activa" | "retirada"`;
  - `type ResumenClase = { id; titulo; codigo; estado; ruta; pendientes; activas }`;
  - `type CasoDeClase = { slug; titulo; habilitado }`;
  - `type EstudianteDeClase = { userId; nombre; email; estado; casos: { slug; titulo; aprobadas; total; completo }[] }`;
  - `type ClaseDelEstudiante = { id; titulo; docente; estado; casos: { slug; titulo }[] }`.
- Produces funciones en `@/lib/clases/servicio`:
  - `crearClase(db, { profesorId, titulo, rutaSlug }): Promise<Clase | null>`, que copia los casos de la ruta como habilitados;
  - `clasesDelProfesor(db, profesorId): Promise<ResumenClase[]>`;
  - `claseDelProfesor(db, { profesorId, claseId }): Promise<Clase | null>`;
  - `casosDeClase(db, claseId): Promise<CasoDeClase[]>`;
  - `cambiarCasoHabilitado(db, { profesorId, claseId, casoSlug, habilitado }): Promise<boolean>`;
  - `unirseAClase(db, { userId, codigo }, { encolar })`, que devuelve `{ ok: true; estado; clase } | { ok: false; motivo: "codigo_invalido" | "es_tu_clase" }`;
  - `decidirInscripcion(db, { profesorId, claseId, userId, estado: "activa" | "retirada" }, { encolar }): Promise<boolean>`;
  - `rosterDeClase(db, { profesorId, claseId }): Promise<EstudianteDeClase[] | null>`;
  - `clasesDelEstudiante(db, userId): Promise<ClaseDelEstudiante[]>`.
- Produces la API:
  - `POST /api/profesor/clases` recibe `{ titulo, ruta }` y responde 201 `{ id, codigo }`, o 401, 403 o 400;
  - `PATCH /api/profesor/clases/[id]/casos/[caso]` recibe `{ habilitado }` y responde 200, o 401, 403, 400 o 404;
  - `PATCH /api/profesor/clases/[id]/estudiantes/[userId]` recibe `{ estado }` y responde 200, o 401, 403, 400 o 404;
  - `POST /api/clases/unirse` recibe `{ codigo }` y responde 200 `{ estado, clase }`, o 401, 429, 400 o 404.
- Límite nuevo: `clases-unirse`, 10 cada 15 minutos por persona.

- [ ] **Step 1: Escribir los tests que fallan**

`apps/web/src/lib/clases/codigo.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { generarCodigo, normalizarCodigo } from "./codigo";

describe("código de clase", () => {
  it("tiene 6 caracteres sin letras ni números que se confundan", () => {
    for (let vuelta = 0; vuelta < 200; vuelta++) expect(generarCodigo()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  });

  it("acepta el código escrito en minúsculas, con espacios o guiones", () => {
    expect(normalizarCodigo(" abc-234 ")).toBe("ABC234");
    expect(normalizarCodigo("ab c2 34")).toBe("ABC234");
  });
});
```

`apps/web/src/lib/clases/servicio.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { casoInscripciones, casos, claseInscripciones, misionProgreso, rutaCasos, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Encolar } from "@/lib/emails";
import {
  cambiarCasoHabilitado,
  casosDeClase,
  clasesDelEstudiante,
  clasesDelProfesor,
  crearClase,
  decidirInscripcion,
  rosterDeClase,
  unirseAClase,
} from "./servicio";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

async function escenario() {
  const [docente, otraDocente, ana] = await db
    .insert(users)
    .values([
      { email: "rosa@correo.cl", name: "Rosa", role: "teacher" },
      { email: "otra@correo.cl", name: "Otra", role: "teacher" },
      { email: "ana@correo.cl", name: "Ana" },
    ])
    .returning({ id: users.id });
  const [ruta] = await db.insert(rutas).values({ slug: "analista", titulo: "Analista", cargo: "Analista", descripcion: "Ruta" }).returning({ id: rutas.id });
  const [ventas, stock] = await db
    .insert(casos)
    .values([
      { slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }, { slug: "m2", titulo: "M2", tareas: ["t1"] }] },
      { slug: "stock", titulo: "Stock", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }] },
    ])
    .returning({ id: casos.id });
  await db.insert(rutaCasos).values([
    { rutaId: ruta.id, casoId: ventas.id, orden: 0 },
    { rutaId: ruta.id, casoId: stock.id, orden: 1 },
  ]);
  const clase = await crearClase(db, { profesorId: docente.id, titulo: "3°A", rutaSlug: "analista" });
  if (!clase) throw new Error("no se creó la clase");
  return { docenteId: docente.id, otraId: otraDocente.id, anaId: ana.id, clase, ventasId: ventas.id };
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("clases", () => {
  it("crear una clase copia los casos de la ruta, habilitados y en orden", async () => {
    const { docenteId, clase } = await escenario();
    expect(clase.codigo).toMatch(/^[A-Z2-9]{6}$/);
    expect(await casosDeClase(db, clase.id)).toEqual([
      { slug: "ventas", titulo: "Ventas", habilitado: true },
      { slug: "stock", titulo: "Stock", habilitado: true },
    ]);
    expect(await clasesDelProfesor(db, docenteId)).toEqual([
      { id: clase.id, titulo: "3°A", codigo: clase.codigo, estado: "activa", ruta: "Analista", pendientes: 0, activas: 0 },
    ]);
    expect(await crearClase(db, { profesorId: docenteId, titulo: "X", rutaSlug: "no-existe" })).toBeNull();
  });

  it("unirse con el código deja la inscripción pendiente, una sola vez, y avisa a la docente", async () => {
    const { anaId, clase } = await escenario();
    const codigoEscrito = `${clase.codigo.slice(0, 3).toLowerCase()}-${clase.codigo.slice(3)}`;
    expect(await unirseAClase(db, { userId: anaId, codigo: codigoEscrito }, { encolar })).toEqual({ ok: true, estado: "pendiente", clase: "3°A" });
    expect(await unirseAClase(db, { userId: anaId, codigo: clase.codigo }, { encolar })).toEqual({ ok: true, estado: "pendiente", clase: "3°A" });
    expect(await db.select().from(claseInscripciones)).toHaveLength(1);
    expect(enviados).toEqual([
      { tipo: "clase-solicitud", para: "rosa@correo.cl", nombre: "Rosa", alumno: "Ana (ana@correo.cl)", clase: "3°A", enlace: expect.stringContaining(`/profesor/clases/${clase.id}`) },
    ]);
  });

  it("un código que no existe o la propia clase no sirven", async () => {
    const { docenteId, clase } = await escenario();
    expect(await unirseAClase(db, { userId: docenteId, codigo: "ZZZZZZ" }, { encolar })).toEqual({ ok: false, motivo: "codigo_invalido" });
    expect(await unirseAClase(db, { userId: docenteId, codigo: clase.codigo }, { encolar })).toEqual({ ok: false, motivo: "es_tu_clase" });
  });

  it("solo la docente de la clase decide inscripciones y cambia casos", async () => {
    const { docenteId, otraId, anaId, clase } = await escenario();
    await unirseAClase(db, { userId: anaId, codigo: clase.codigo }, { encolar });
    enviados.length = 0;

    expect(await decidirInscripcion(db, { profesorId: otraId, claseId: clase.id, userId: anaId, estado: "activa" }, { encolar })).toBe(false);
    expect(await cambiarCasoHabilitado(db, { profesorId: otraId, claseId: clase.id, casoSlug: "stock", habilitado: false })).toBe(false);
    expect(await rosterDeClase(db, { profesorId: otraId, claseId: clase.id })).toBeNull();

    expect(await decidirInscripcion(db, { profesorId: docenteId, claseId: clase.id, userId: anaId, estado: "activa" }, { encolar })).toBe(true);
    expect(await decidirInscripcion(db, { profesorId: docenteId, claseId: clase.id, userId: anaId, estado: "activa" }, { encolar })).toBe(true);
    expect(enviados.map((email) => [email.tipo, email.para])).toEqual([["clase-decision", "ana@correo.cl"]]);
    expect(await cambiarCasoHabilitado(db, { profesorId: docenteId, claseId: clase.id, casoSlug: "stock", habilitado: false })).toBe(true);
    expect(await decidirInscripcion(db, { profesorId: docenteId, claseId: clase.id, userId: otraId, estado: "activa" }, { encolar })).toBe(false);
  });

  it("el roster muestra el avance de cada estudiante en los casos habilitados", async () => {
    const { docenteId, anaId, clase, ventasId } = await escenario();
    await unirseAClase(db, { userId: anaId, codigo: clase.codigo }, { encolar });
    await decidirInscripcion(db, { profesorId: docenteId, claseId: clase.id, userId: anaId, estado: "activa" }, { encolar });
    await cambiarCasoHabilitado(db, { profesorId: docenteId, claseId: clase.id, casoSlug: "stock", habilitado: false });
    await db.insert(misionProgreso).values({ userId: anaId, casoId: ventasId, mision: "m1", estado: "aprobada" });
    await db.insert(casoInscripciones).values({ userId: anaId, casoId: ventasId });

    expect(await rosterDeClase(db, { profesorId: docenteId, claseId: clase.id })).toEqual([
      {
        userId: anaId,
        nombre: "Ana",
        email: "ana@correo.cl",
        estado: "activa",
        casos: [{ slug: "ventas", titulo: "Ventas", aprobadas: 1, total: 2, completo: false }],
      },
    ]);
  });

  it("el estudiante ve sus clases y, solo si está activo, los casos habilitados", async () => {
    const { docenteId, anaId, clase } = await escenario();
    await unirseAClase(db, { userId: anaId, codigo: clase.codigo }, { encolar });
    expect(await clasesDelEstudiante(db, anaId)).toEqual([{ id: clase.id, titulo: "3°A", docente: "Rosa", estado: "pendiente", casos: [] }]);
    await decidirInscripcion(db, { profesorId: docenteId, claseId: clase.id, userId: anaId, estado: "activa" }, { encolar });
    expect((await clasesDelEstudiante(db, anaId))[0].casos.map((caso) => caso.slug).sort()).toEqual(["stock", "ventas"]);
  });
});
```

`apps/web/src/app/api/profesor/clases/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, claseInscripciones, rutaCasos, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");

const { POST } = await import("./route");
const casosRuta = await import("./[id]/casos/[caso]/route");
const estudiantesRuta = await import("./[id]/estudiantes/[userId]/route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function persona(email: string, rol: Rol) {
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

async function contenido() {
  const [ruta] = await db
    .insert(rutas)
    .values({ slug: "data-analyst", titulo: "Data Analyst", cargo: "Analista", descripcion: "Ruta" })
    .returning({ id: rutas.id });
  const [caso] = await db
    .insert(casos)
    .values({ slug: "demo-motor", titulo: "Demo", cargo: "A", empresa: "D", entregable: "R", misiones: [] })
    .returning({ id: casos.id });
  await db.insert(rutaCasos).values({ rutaId: ruta.id, casoId: caso.id, orden: 0 });
}

const json = (metodo: string, url: string, cuerpo: unknown) =>
  new Request(`http://localhost:3000${url}`, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
const crear = (cuerpo: unknown) => POST(json("POST", "/api/profesor/clases", cuerpo));

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("API de clases del docente", () => {
  it("sin sesión 401, una cuenta estudiante 403", async () => {
    expect((await crear({ titulo: "3°A", ruta: "data-analyst" })).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("ana@correo.cl", "student"));
    expect((await crear({ titulo: "3°A", ruta: "data-analyst" })).status).toBe(403);
  });

  it("una docente crea la clase con una ruta del catálogo y no con otra", async () => {
    await contenido();
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("rosa@correo.cl", "teacher"));
    expect((await crear({ titulo: "3°A", ruta: "no-existe" })).status).toBe(400);
    expect((await crear({ titulo: "", ruta: "data-analyst" })).status).toBe(400);
    const respuesta = await crear({ titulo: "3°A", ruta: "data-analyst" });
    expect(respuesta.status).toBe(201);
    expect(await respuesta.json()).toEqual({ id: expect.any(String), codigo: expect.stringMatching(/^[A-Z2-9]{6}$/) });
  });

  it("ids inválidos o de otra docente responden 404", async () => {
    await contenido();
    const rosa = await persona("rosa@correo.cl", "teacher");
    const ana = await persona("ana@correo.cl", "student");
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(rosa);
    const { id } = (await (await crear({ titulo: "3°A", ruta: "data-analyst" })).json()) as { id: string };
    await db.insert(claseInscripciones).values({ claseId: id, userId: ana.id });

    const habilitar = (claseId: string, caso: string) =>
      casosRuta.PATCH(json("PATCH", `/api/profesor/clases/${claseId}/casos/${caso}`, { habilitado: false }), { params: Promise.resolve({ id: claseId, caso }) });
    const decidir = (claseId: string, userId: string) =>
      estudiantesRuta.PATCH(json("PATCH", `/api/profesor/clases/${claseId}/estudiantes/${userId}`, { estado: "activa" }), {
        params: Promise.resolve({ id: claseId, userId }),
      });

    expect((await habilitar("no-es-uuid", "demo-motor")).status).toBe(404);
    expect((await decidir(id, "no-es-uuid")).status).toBe(404);
    expect((await habilitar(id, "demo-motor")).status).toBe(200);
    expect((await decidir(id, ana.id)).status).toBe(200);

    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("otra@correo.cl", "teacher"));
    expect((await habilitar(id, "demo-motor")).status).toBe(404);
    expect((await decidir(id, ana.id)).status).toBe(404);
  });
});
```

`apps/web/src/app/api/clases/unirse/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clases, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { POST } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const unirse = (codigo: unknown) =>
  POST(new Request("http://localhost:3000/api/clases/unirse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo }) }));

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("POST /api/clases/unirse", () => {
  it("responde 401 sin sesión, 404 con un código que no existe y 200 con uno válido", async () => {
    expect((await unirse("ABC234")).status).toBe(401);
    const [docente, ana] = await db
      .insert(users)
      .values([{ email: "rosa@correo.cl", role: "teacher" }, { email: `ana-${crypto.randomUUID()}@correo.cl` }])
      .returning({ id: users.id, email: users.email });
    const [ruta] = await db.insert(rutas).values({ slug: "r", titulo: "R", cargo: "A", descripcion: "R" }).returning({ id: rutas.id });
    await db.insert(clases).values({ profesorId: docente.id, rutaId: ruta.id, titulo: "3°A", codigo: "ABC234" });
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: ana.id, email: ana.email, nombre: null, rol: "student" });

    expect((await unirse(123)).status).toBe(400);
    expect((await unirse("ZZZZZZ")).status).toBe(404);
    const respuesta = await unirse("abc 234");
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ estado: "pendiente", clase: "3°A" });
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/clases src/app/api/profesor src/app/api/clases`
Expected: FAIL, porque no se pueden resolver `./codigo`, `./servicio` ni las rutas.

- [ ] **Step 3: Crear `apps/web/src/lib/clases/codigo.ts`**

```ts
import { randomInt } from "node:crypto";

// Sin 0/O, 1/I/L: el código se dicta en voz alta en la sala de clases.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LARGO = 6;

export function generarCodigo(): string {
  return Array.from({ length: LARGO }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}

export function normalizarCodigo(valor: string): string {
  return valor.toUpperCase().replace(/[\s-]/g, "");
}
```

- [ ] **Step 4: Crear `apps/web/src/lib/clases/servicio.ts`**

```ts
import { and, asc, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { casoInscripciones, casos, claseCasos, claseInscripciones, clases, misionProgreso, rutaCasos, rutas, users } from "@syntaxerror/db/schema";
import { enlaceMisClases, enlacePanelDocente } from "@/lib/cuenta/enlaces";
import type { Encolar } from "@/lib/emails";
import { generarCodigo, normalizarCodigo } from "./codigo";

export type Clase = typeof clases.$inferSelect;
export type EstadoInscripcion = "pendiente" | "activa" | "retirada";
export type ResumenClase = { id: string; titulo: string; codigo: string; estado: string; ruta: string; pendientes: number; activas: number };
export type CasoDeClase = { slug: string; titulo: string; habilitado: boolean };
export type AvanceCaso = { slug: string; titulo: string; aprobadas: number; total: number; completo: boolean };
export type EstudianteDeClase = { userId: string; nombre: string | null; email: string; estado: EstadoInscripcion; casos: AvanceCaso[] };
export type ClaseDelEstudiante = { id: string; titulo: string; docente: string; estado: EstadoInscripcion; casos: { slug: string; titulo: string }[] };
export type ResultadoUnirse = { ok: true; estado: EstadoInscripcion; clase: string } | { ok: false; motivo: "codigo_invalido" | "es_tu_clase" };

const describir = (persona: { nombre: string | null; email: string }) => (persona.nombre ? `${persona.nombre} (${persona.email})` : persona.email);

export async function crearClase(db: AppDb, { profesorId, titulo, rutaSlug }: { profesorId: string; titulo: string; rutaSlug: string }): Promise<Clase | null> {
  const [ruta] = await db.select({ id: rutas.id }).from(rutas).where(eq(rutas.slug, rutaSlug));
  if (!ruta) return null;
  return db.transaction(async (tx) => {
    let creada: Clase | undefined;
    for (let intento = 0; intento < 5 && !creada; intento++) {
      [creada] = await tx
        .insert(clases)
        .values({ profesorId, rutaId: ruta.id, titulo, codigo: generarCodigo() })
        .onConflictDoNothing({ target: clases.codigo })
        .returning();
    }
    if (!creada) throw new Error("No se pudo generar un código de clase único");
    const claseId = creada.id;
    const casosDeRuta = await tx.select({ casoId: rutaCasos.casoId }).from(rutaCasos).where(eq(rutaCasos.rutaId, ruta.id));
    if (casosDeRuta.length > 0) await tx.insert(claseCasos).values(casosDeRuta.map(({ casoId }) => ({ claseId, casoId })));
    return creada;
  });
}

export async function clasesDelProfesor(db: AppDb, profesorId: string): Promise<ResumenClase[]> {
  const filas = await db
    .select({ id: clases.id, titulo: clases.titulo, codigo: clases.codigo, estado: clases.estado, ruta: rutas.titulo })
    .from(clases)
    .innerJoin(rutas, eq(rutas.id, clases.rutaId))
    .where(eq(clases.profesorId, profesorId))
    .orderBy(desc(clases.creadaEn));
  if (filas.length === 0) return [];
  const conteos = await db
    .select({ claseId: claseInscripciones.claseId, estado: claseInscripciones.estado, total: count() })
    .from(claseInscripciones)
    .where(inArray(claseInscripciones.claseId, filas.map((fila) => fila.id)))
    .groupBy(claseInscripciones.claseId, claseInscripciones.estado);
  const contar = (claseId: string, estado: EstadoInscripcion) =>
    Number(conteos.find((conteo) => conteo.claseId === claseId && conteo.estado === estado)?.total ?? 0);
  return filas.map((fila) => ({ ...fila, pendientes: contar(fila.id, "pendiente"), activas: contar(fila.id, "activa") }));
}

export async function claseDelProfesor(db: AppDb, { profesorId, claseId }: { profesorId: string; claseId: string }): Promise<Clase | null> {
  const [clase] = await db.select().from(clases).where(and(eq(clases.id, claseId), eq(clases.profesorId, profesorId)));
  return clase ?? null;
}

export async function casosDeClase(db: AppDb, claseId: string): Promise<CasoDeClase[]> {
  return db
    .select({ slug: casos.slug, titulo: casos.titulo, habilitado: claseCasos.habilitado })
    .from(claseCasos)
    .innerJoin(casos, eq(casos.id, claseCasos.casoId))
    .innerJoin(clases, eq(clases.id, claseCasos.claseId))
    .leftJoin(rutaCasos, and(eq(rutaCasos.rutaId, clases.rutaId), eq(rutaCasos.casoId, claseCasos.casoId)))
    .where(eq(claseCasos.claseId, claseId))
    .orderBy(asc(rutaCasos.orden), asc(casos.titulo));
}

export async function cambiarCasoHabilitado(
  db: AppDb,
  { profesorId, claseId, casoSlug, habilitado }: { profesorId: string; claseId: string; casoSlug: string; habilitado: boolean }
): Promise<boolean> {
  if (!(await claseDelProfesor(db, { profesorId, claseId }))) return false;
  const [caso] = await db.select({ id: casos.id }).from(casos).where(eq(casos.slug, casoSlug));
  if (!caso) return false;
  const filas = await db
    .update(claseCasos)
    .set({ habilitado })
    .where(and(eq(claseCasos.claseId, claseId), eq(claseCasos.casoId, caso.id)))
    .returning({ casoId: claseCasos.casoId });
  return filas.length > 0;
}

export async function unirseAClase(db: AppDb, { userId, codigo }: { userId: string; codigo: string }, { encolar }: { encolar: Encolar }): Promise<ResultadoUnirse> {
  const [clase] = await db
    .select({ id: clases.id, titulo: clases.titulo, profesorId: clases.profesorId, email: users.email, nombre: users.name })
    .from(clases)
    .innerJoin(users, eq(users.id, clases.profesorId))
    .where(and(eq(clases.codigo, normalizarCodigo(codigo)), eq(clases.estado, "activa")));
  if (!clase) return { ok: false, motivo: "codigo_invalido" };
  if (clase.profesorId === userId) return { ok: false, motivo: "es_tu_clase" };

  const creadas = await db.insert(claseInscripciones).values({ claseId: clase.id, userId }).onConflictDoNothing().returning({ estado: claseInscripciones.estado });
  if (creadas.length > 0) {
    const [estudiante] = await db.select({ email: users.email, nombre: users.name }).from(users).where(eq(users.id, userId));
    await encolar({
      tipo: "clase-solicitud",
      para: clase.email,
      nombre: clase.nombre,
      alumno: estudiante ? describir(estudiante) : "Una persona",
      clase: clase.titulo,
      enlace: enlacePanelDocente(clase.id),
    });
    return { ok: true, estado: "pendiente", clase: clase.titulo };
  }
  const [actual] = await db
    .select({ estado: claseInscripciones.estado })
    .from(claseInscripciones)
    .where(and(eq(claseInscripciones.claseId, clase.id), eq(claseInscripciones.userId, userId)));
  return { ok: true, estado: actual.estado as EstadoInscripcion, clase: clase.titulo };
}

export async function decidirInscripcion(
  db: AppDb,
  { profesorId, claseId, userId, estado }: { profesorId: string; claseId: string; userId: string; estado: "activa" | "retirada" },
  { encolar }: { encolar: Encolar }
): Promise<boolean> {
  const clase = await claseDelProfesor(db, { profesorId, claseId });
  if (!clase) return false;
  const clave = and(eq(claseInscripciones.claseId, claseId), eq(claseInscripciones.userId, userId));
  const [inscripcion] = await db.select({ estado: claseInscripciones.estado }).from(claseInscripciones).where(clave);
  if (!inscripcion) return false;
  if (inscripcion.estado === estado) return true;

  // Solo cambia si nadie la cambió entremedio: así el email sale una vez.
  const cambiadas = await db
    .update(claseInscripciones)
    .set({ estado, decididaEn: new Date() })
    .where(and(clave, eq(claseInscripciones.estado, inscripcion.estado)))
    .returning({ userId: claseInscripciones.userId });
  if (cambiadas.length > 0) {
    const [estudiante] = await db.select({ email: users.email, nombre: users.name }).from(users).where(eq(users.id, userId));
    if (estudiante) {
      await encolar({ tipo: "clase-decision", para: estudiante.email, nombre: estudiante.nombre, clase: clase.titulo, aceptada: estado === "activa", enlace: enlaceMisClases() });
    }
  }
  return true;
}

export async function rosterDeClase(db: AppDb, { profesorId, claseId }: { profesorId: string; claseId: string }): Promise<EstudianteDeClase[] | null> {
  if (!(await claseDelProfesor(db, { profesorId, claseId }))) return null;
  const [inscritas, habilitados] = await Promise.all([
    db
      .select({ userId: claseInscripciones.userId, nombre: users.name, email: users.email, estado: claseInscripciones.estado })
      .from(claseInscripciones)
      .innerJoin(users, eq(users.id, claseInscripciones.userId))
      .where(eq(claseInscripciones.claseId, claseId))
      .orderBy(asc(claseInscripciones.solicitadaEn)),
    db
      .select({ id: casos.id, slug: casos.slug, titulo: casos.titulo, misiones: casos.misiones })
      .from(claseCasos)
      .innerJoin(casos, eq(casos.id, claseCasos.casoId))
      .where(and(eq(claseCasos.claseId, claseId), eq(claseCasos.habilitado, true))),
  ]);
  const personas = inscritas.map((fila) => fila.userId);
  const casoIds = habilitados.map((caso) => caso.id);
  const hayDatos = personas.length > 0 && casoIds.length > 0;
  const aprobadas = hayDatos
    ? await db
        .select({ userId: misionProgreso.userId, casoId: misionProgreso.casoId, mision: misionProgreso.mision })
        .from(misionProgreso)
        .where(and(inArray(misionProgreso.userId, personas), inArray(misionProgreso.casoId, casoIds), eq(misionProgreso.estado, "aprobada")))
    : [];
  const completos = hayDatos
    ? await db
        .select({ userId: casoInscripciones.userId, casoId: casoInscripciones.casoId })
        .from(casoInscripciones)
        .where(and(inArray(casoInscripciones.userId, personas), inArray(casoInscripciones.casoId, casoIds), isNotNull(casoInscripciones.completadoEn)))
    : [];

  return inscritas.map((fila) => ({
    ...fila,
    estado: fila.estado as EstadoInscripcion,
    casos: habilitados.map((caso) => ({
      slug: caso.slug,
      titulo: caso.titulo,
      total: caso.misiones.length,
      aprobadas: aprobadas.filter((a) => a.userId === fila.userId && a.casoId === caso.id && caso.misiones.some((m) => m.slug === a.mision)).length,
      completo: completos.some((c) => c.userId === fila.userId && c.casoId === caso.id),
    })),
  }));
}

export async function clasesDelEstudiante(db: AppDb, userId: string): Promise<ClaseDelEstudiante[]> {
  const filas = await db
    .select({ id: clases.id, titulo: clases.titulo, docente: users.name, estado: claseInscripciones.estado })
    .from(claseInscripciones)
    .innerJoin(clases, eq(clases.id, claseInscripciones.claseId))
    .innerJoin(users, eq(users.id, clases.profesorId))
    .where(eq(claseInscripciones.userId, userId))
    .orderBy(desc(claseInscripciones.solicitadaEn));
  const activas = filas.filter((fila) => fila.estado === "activa").map((fila) => fila.id);
  const casosActivos =
    activas.length > 0
      ? await db
          .select({ claseId: claseCasos.claseId, slug: casos.slug, titulo: casos.titulo })
          .from(claseCasos)
          .innerJoin(casos, eq(casos.id, claseCasos.casoId))
          .where(and(inArray(claseCasos.claseId, activas), eq(claseCasos.habilitado, true)))
      : [];
  return filas.map((fila) => ({
    id: fila.id,
    titulo: fila.titulo,
    docente: fila.docente ?? "Tu docente",
    estado: fila.estado as EstadoInscripcion,
    casos: casosActivos.filter((caso) => caso.claseId === fila.id).map(({ slug, titulo }) => ({ slug, titulo })),
  }));
}
```

- [ ] **Step 5: Agregar el límite en `apps/web/src/lib/rate-limit.ts`**

Agregar `| "clases-unirse"` al tipo `RateLimitKey`, y a `LIMITER_CONFIGS`:
```ts
  "clases-unirse": { points: 10, duration: 900 },
```

- [ ] **Step 6: Crear las rutas**

`apps/web/src/app/api/profesor/clases/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { crearClase } from "@/lib/clases/servicio";
import { rutasParaPublicar } from "@/lib/contenido";
import { exigirDocente } from "@/lib/permisos";

const esquema = z.object({ titulo: z.string().trim().min(1).max(120), ruta: z.string().max(100) });

export async function POST(request: Request) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  // Solo rutas que el catálogo muestra: un borrador no se asigna en producción.
  const disponibles = (await rutasParaPublicar()).map((ruta) => ruta.slug);
  if (!disponibles.includes(parsed.data.ruta)) return NextResponse.json({ error: "ruta_no_disponible" }, { status: 400 });
  const clase = await crearClase(getDb(), { profesorId: usuario.id, titulo: parsed.data.titulo, rutaSlug: parsed.data.ruta });
  if (!clase) return NextResponse.json({ error: "ruta_no_disponible" }, { status: 400 });
  return NextResponse.json({ id: clase.id, codigo: clase.codigo }, { status: 201 });
}
```

`apps/web/src/app/api/profesor/clases/[id]/casos/[caso]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { cambiarCasoHabilitado } from "@/lib/clases/servicio";
import { exigirDocente } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({ habilitado: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; caso: string }> }) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const { id, caso } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const cambiado = await cambiarCasoHabilitado(getDb(), { profesorId: usuario.id, claseId: id, casoSlug: caso, habilitado: parsed.data.habilitado });
  if (!cambiado) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

`apps/web/src/app/api/profesor/clases/[id]/estudiantes/[userId]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { decidirInscripcion } from "@/lib/clases/servicio";
import { encolarSinFallar } from "@/lib/emails";
import { exigirDocente } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({ estado: z.enum(["activa", "retirada"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const { id, userId } = await params;
  if (!esUuid(id) || !esUuid(userId)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const decidido = await decidirInscripcion(
    getDb(),
    { profesorId: usuario.id, claseId: id, userId, estado: parsed.data.estado },
    { encolar: encolarSinFallar }
  );
  if (!decidido) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

`apps/web/src/app/api/clases/unirse/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { unirseAClase } from "@/lib/clases/servicio";
import { encolarSinFallar } from "@/lib/emails";
import { exigirUsuario } from "@/lib/permisos";
import { checkRateLimit } from "@/lib/rate-limit";

const esquema = z.object({ codigo: z.string().min(1).max(20) });

export async function POST(request: Request) {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  const limite = await checkRateLimit("clases-unirse", usuario.id);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await unirseAClase(getDb(), { userId: usuario.id, codigo: parsed.data.codigo }, { encolar: encolarSinFallar });
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.motivo }, { status: resultado.motivo === "codigo_invalido" ? 404 : 400 });
  }
  return NextResponse.json({ estado: resultado.estado, clase: resultado.clase });
}
```

- [ ] **Step 7: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec vitest run src/lib/clases src/app/api/profesor src/app/api/clases && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS (12 tests: 2 del código, 6 del servicio, 3 de la API docente y 1 de unirse) y `tsc` sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/clases apps/web/src/lib/rate-limit.ts apps/web/src/app/api/profesor apps/web/src/app/api/clases
git commit -m "feat(comunidad): clases con casos asignados, codigo para unirse e inscripciones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 8: Clases: pantallas de docente y estudiante

**Files:**
- Create:
  - `apps/web/src/components/comunidad/clases/formulario-clase.tsx`
  - `apps/web/src/components/comunidad/clases/botones-inscripcion.tsx`
  - `apps/web/src/components/comunidad/clases/interruptor-caso.tsx`
  - `apps/web/src/components/comunidad/clases/formulario-unirse.tsx`
- Create:
  - `apps/web/src/app/(dashboard)/profesor/page.tsx`
  - `apps/web/src/app/(dashboard)/profesor/clases/[id]/page.tsx`
  - `apps/web/src/app/(dashboard)/dashboard/clases/page.tsx`

**Interfaces:**
- Consumes:
  - `clasesDelProfesor`, `claseDelProfesor`, `casosDeClase`, `rosterDeClase` y `clasesDelEstudiante` (Task 7);
  - la API de clases (Task 7);
  - `obtenerUsuarioActual`, `esDocente` y `esUuid` (Task 1);
  - `rutasParaPublicar()`.
- Produces las páginas:
  - `/profesor`: clases y formulario para crear una;
  - `/profesor/clases/[id]`: código, solicitudes, estudiantes con avance y casos;
  - `/dashboard/clases`: unirse con código y ver mis clases.
  - En `/profesor/clases/[id]`, el código lleva `data-testid="codigo-clase"`, que usa el e2e.
- Sin sesión, las tres páginas llevan al login. A quien no es docente, las páginas de `/profesor` le responden 404.

- [ ] **Step 1: Crear los componentes de cliente**

`apps/web/src/components/comunidad/clases/formulario-clase.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioClase({ rutas }: { rutas: { slug: string; titulo: string }[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [ruta, setRuta] = useState(rutas[0]?.slug ?? "");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson("/api/profesor/clases", "POST", { titulo, ruta });
    setEnviando(false);
    if (respuesta.ok && typeof respuesta.datos.id === "string") {
      router.push(`/profesor/clases/${respuesta.datos.id}`);
      return;
    }
    setAviso("No pudimos crear la clase. Revisa el nombre y la ruta.");
  }

  if (rutas.length === 0) return <p className="text-sm text-muted-foreground">Todavía no hay rutas publicadas para asignar.</p>;

  return (
    <form className="grid gap-3" onSubmit={crear}>
      <Label>
        Nombre de la clase
        <Input name="titulo" value={titulo} onChange={(evento) => setTitulo(evento.target.value)} required maxLength={120} placeholder="Por ejemplo: 4°B Analítica 2026" />
      </Label>
      <Label>
        Ruta
        <select
          name="ruta"
          value={ruta}
          onChange={(evento) => setRuta(evento.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground"
        >
          {rutas.map((opcion) => (
            <option key={opcion.slug} value={opcion.slug}>{opcion.titulo}</option>
          ))}
        </select>
      </Label>
      <div>
        <Button type="submit" disabled={enviando}>Crear clase</Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
```

`apps/web/src/components/comunidad/clases/botones-inscripcion.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

type Estado = "pendiente" | "activa" | "retirada";

export function BotonesInscripcion({ claseId, userId, estado, nombre }: { claseId: string; userId: string; estado: Estado; nombre: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function decidir(nuevo: "activa" | "retirada") {
    setEnviando(true);
    const respuesta = await enviarJson(`/api/profesor/clases/${claseId}/estudiantes/${userId}`, "PATCH", { estado: nuevo });
    setEnviando(false);
    if (respuesta.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {estado !== "activa" ? (
        <Button type="button" size="sm" disabled={enviando} onClick={() => decidir("activa")} aria-label={`Aceptar a ${nombre}`}>
          {estado === "pendiente" ? "Aceptar" : "Volver a aceptar"}
        </Button>
      ) : null}
      {estado !== "retirada" ? (
        <Button type="button" size="sm" variant="ghost" disabled={enviando} onClick={() => decidir("retirada")} aria-label={`${estado === "pendiente" ? "Rechazar" : "Retirar"} a ${nombre}`}>
          {estado === "pendiente" ? "Rechazar" : "Retirar de la clase"}
        </Button>
      ) : null}
    </div>
  );
}
```

`apps/web/src/components/comunidad/clases/interruptor-caso.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviarJson } from "@/lib/cuenta/cliente";

export function InterruptorCaso({ claseId, caso, titulo, habilitado }: { claseId: string; caso: string; titulo: string; habilitado: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={habilitado}
        disabled={enviando}
        onChange={async (evento) => {
          setEnviando(true);
          const respuesta = await enviarJson(`/api/profesor/clases/${claseId}/casos/${caso}`, "PATCH", { habilitado: evento.target.checked });
          setEnviando(false);
          if (respuesta.ok) router.refresh();
        }}
      />
      {titulo}
    </label>
  );
}
```

`apps/web/src/components/comunidad/clases/formulario-unirse.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

const MENSAJES_ESTADO: Record<string, (clase: string) => string> = {
  pendiente: (clase) => `Tu solicitud para entrar a «${clase}» quedó enviada. Espera que tu docente la acepte.`,
  activa: (clase) => `Ya eres parte de «${clase}».`,
  retirada: (clase) => `Tu docente cerró tu inscripción en «${clase}».`,
};

export function FormularioUnirse() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function unirse(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/clases/unirse", "POST", { codigo });
    setEnviando(false);
    const { estado, clase } = respuesta.datos as { estado?: string; clase?: string };
    if (respuesta.ok && estado && clase) {
      setAviso(MENSAJES_ESTADO[estado]?.(clase) ?? null);
      setCodigo("");
      router.refresh();
    } else if (respuesta.status === 404) setAviso("No encontramos una clase con ese código.");
    else if (respuesta.error === "es_tu_clase") setAviso("Esa clase es tuya: comparte el código con tus estudiantes.");
    else if (respuesta.status === 429) setAviso("Probaste muchos códigos seguidos. Espera unos minutos.");
    else setAviso("No pudimos unirte a la clase. Intenta de nuevo.");
  }

  return (
    <form className="grid gap-3" onSubmit={unirse}>
      <Label>
        Código de la clase
        <Input name="codigo" value={codigo} onChange={(evento) => setCodigo(evento.target.value)} required maxLength={20} autoComplete="off" className="font-mono uppercase" />
      </Label>
      <div>
        <Button type="submit" disabled={enviando}>Unirme</Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
```

- [ ] **Step 2: Crear `apps/web/src/app/(dashboard)/profesor/page.tsx`**

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { FormularioClase } from "@/components/comunidad/clases/formulario-clase";
import { clasesDelProfesor } from "@/lib/clases/servicio";
import { rutasParaPublicar } from "@/lib/contenido";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const metadata = { title: "Panel docente" };

export default async function ProfesorPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?callbackUrl=/profesor");
  if (!esDocente(usuario)) notFound();
  const [clases, rutas] = await Promise.all([clasesDelProfesor(getDb(), usuario.id), rutasParaPublicar()]);

  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">{"> sudo -u docente"}</p>
        <h1 className="text-3xl font-black">Panel docente</h1>
        <p className="leading-7 text-muted-foreground">
          Crea clases, comparte su código y sigue el avance de tus estudiantes.{" "}
          <Link className="font-bold text-primary hover:underline" href="/profesor/preguntas">Ver las preguntas de tus estudiantes</Link>
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus clases</h2>
        {clases.length === 0 ? (
          <p className="text-muted-foreground">Todavía no creas ninguna clase.</p>
        ) : (
          <ul className="grid gap-3">
            {clases.map((clase) => (
              <li key={clase.id}>
                <Link href={`/profesor/clases/${clase.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-primary">
                  <span>
                    <span className="block font-bold">{clase.titulo}</span>
                    <span className="block text-sm text-muted-foreground">{`${clase.ruta} · código ${clase.codigo}`}</span>
                  </span>
                  <span className="badge">{`${clase.activas} estudiantes · ${clase.pendientes} por aceptar`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Crear una clase</h2>
        <FormularioClase rutas={rutas.map((ruta) => ({ slug: ruta.slug, titulo: ruta.titulo }))} />
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Crear `apps/web/src/app/(dashboard)/profesor/clases/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { BotonesInscripcion } from "@/components/comunidad/clases/botones-inscripcion";
import { InterruptorCaso } from "@/components/comunidad/clases/interruptor-caso";
import { casosDeClase, claseDelProfesor, rosterDeClase } from "@/lib/clases/servicio";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";
import { esUuid } from "@/lib/uuid";

export const metadata = { title: "Clase" };

export default async function ClasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect(`/login?callbackUrl=${encodeURIComponent(`/profesor/clases/${id}`)}`);
  if (!esDocente(usuario) || !esUuid(id)) notFound();
  const db = getDb();
  const clase = await claseDelProfesor(db, { profesorId: usuario.id, claseId: id });
  if (!clase) notFound();
  const [casos, roster] = await Promise.all([casosDeClase(db, id), rosterDeClase(db, { profesorId: usuario.id, claseId: id })]);
  const estudiantes = roster ?? [];
  const pendientes = estudiantes.filter((persona) => persona.estado === "pendiente");
  const activas = estudiantes.filter((persona) => persona.estado === "activa");
  const retiradas = estudiantes.filter((persona) => persona.estado === "retirada");

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6">
      <nav className="text-sm"><Link className="font-bold text-primary hover:underline" href="/profesor">← Panel docente</Link></nav>
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">{"> clase"}</p>
        <h1 className="text-3xl font-black">{clase.titulo}</h1>
      </header>

      <section className="card grid gap-2 p-5">
        <h2 className="text-sm font-bold text-muted-foreground">Código para unirse</h2>
        <p data-testid="codigo-clase" className="font-mono text-4xl font-black tracking-widest">{clase.codigo}</p>
        <p className="text-sm text-muted-foreground">Tus estudiantes lo escriben en su panel, en «Tus clases». Tú aceptas cada solicitud.</p>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-black">Solicitudes por aceptar</h2>
        {pendientes.length === 0 ? (
          <p className="text-muted-foreground">No hay solicitudes pendientes.</p>
        ) : (
          <ul className="grid gap-2">
            {pendientes.map((persona) => (
              <li key={persona.userId} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <span>
                  <span className="block font-bold">{persona.nombre ?? persona.email}</span>
                  <span className="block text-sm text-muted-foreground">{persona.email}</span>
                </span>
                <BotonesInscripcion claseId={id} userId={persona.userId} estado="pendiente" nombre={persona.nombre ?? persona.email} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-black">Estudiantes</h2>
        {activas.length === 0 ? (
          <p className="text-muted-foreground">Cuando aceptes solicitudes, aquí verás el avance de cada estudiante.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2">Estudiante</th>
                  {casos.filter((caso) => caso.habilitado).map((caso) => (
                    <th key={caso.slug} className="p-2">{caso.titulo}</th>
                  ))}
                  <th className="p-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {activas.map((persona) => (
                  <tr key={persona.userId} className="border-b border-border">
                    <td className="p-2">
                      <span className="block font-bold">{persona.nombre ?? persona.email}</span>
                      <span className="block text-xs text-muted-foreground">{persona.email}</span>
                    </td>
                    {persona.casos.map((avance) => (
                      <td key={avance.slug} className="p-2">{avance.completo ? "Completo" : `${avance.aprobadas}/${avance.total} misiones`}</td>
                    ))}
                    <td className="p-2">
                      <BotonesInscripcion claseId={id} userId={persona.userId} estado="activa" nombre={persona.nombre ?? persona.email} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Casos de la clase</h2>
        <p className="text-sm text-muted-foreground">Las preguntas de tus estudiantes sobre los casos habilitados te llegan a ti.</p>
        <div className="grid gap-2">
          {casos.map((caso) => (
            <InterruptorCaso key={caso.slug} claseId={id} caso={caso.slug} titulo={caso.titulo} habilitado={caso.habilitado} />
          ))}
        </div>
      </section>

      {retiradas.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-black">Fuera de la clase</h2>
          <ul className="grid gap-2">
            {retiradas.map((persona) => (
              <li key={persona.userId} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>{persona.nombre ?? persona.email}</span>
                <BotonesInscripcion claseId={id} userId={persona.userId} estado="retirada" nombre={persona.nombre ?? persona.email} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
```

- [ ] **Step 4: Crear `apps/web/src/app/(dashboard)/dashboard/clases/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { FormularioUnirse } from "@/components/comunidad/clases/formulario-unirse";
import { clasesDelEstudiante } from "@/lib/clases/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export const metadata = { title: "Tus clases" };

const ETIQUETAS = { pendiente: "Por aceptar", activa: "Activa", retirada: "Cerrada" } as const;

export default async function ClasesPage() {
  const userId = await obtenerUsuarioId();
  if (!userId) redirect("/login?callbackUrl=/dashboard/clases");
  const clases = await clasesDelEstudiante(getDb(), userId);

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">{"> git clone clase"}</p>
        <h1 className="text-3xl font-black">Tus clases</h1>
        <p className="leading-7 text-muted-foreground">Si tu docente te dio un código, escríbelo aquí. Tus preguntas sobre los casos de la clase le llegarán a tu docente.</p>
      </header>
      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Unirme a una clase</h2>
        <FormularioUnirse />
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Mis clases</h2>
        {clases.length === 0 ? (
          <p className="text-muted-foreground">Todavía no estás en ninguna clase.</p>
        ) : (
          <ul className="grid gap-3">
            {clases.map((clase) => (
              <li key={clase.id} className="card grid gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="block font-bold">{clase.titulo}</span>
                    <span className="block text-sm text-muted-foreground">{`Docente: ${clase.docente}`}</span>
                  </span>
                  <span className="badge">{ETIQUETAS[clase.estado]}</span>
                </div>
                {clase.casos.length > 0 ? (
                  <ul className="flex flex-wrap gap-3 text-sm">
                    {clase.casos.map((caso) => (
                      <li key={caso.slug}>
                        <Link className="font-bold text-primary hover:underline" href={`/casos/${caso.slug}`}>{caso.titulo}</Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Typecheck y build**

Run: `docker compose run --rm tools sh -c "cd apps/web && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected:
- `tsc` sin errores;
- el build termina;
- en la tabla de rutas, `/profesor`, `/profesor/clases/[id]` y `/dashboard/clases` aparecen como dinámicas (`ƒ`);
- `/casos/[caso]` y `/casos/[caso]/[mision]` siguen como estáticas (`●`).

- [ ] **Step 6: Probar en el navegador**

Con `docker compose up -d --build`:
1. Entrar como `admin@local.test` (clave `admin123456`) y abrir `http://localhost:3000/profesor`.
2. Crear la clase «Prueba» con la ruta Data Analyst y anotar el código.
3. En una ventana privada, con una cuenta nueva, ir a `/dashboard/clases` y escribir el código en minúsculas. Aparece `Tu solicitud para entrar a «Prueba» quedó enviada…`, y en Mailpit llega `Pidieron entrar a tu clase`.
4. Como admin, recargar la clase y pulsar `Aceptar`. En la ventana privada, `/dashboard/clases` muestra `Activa` y el caso `demo-motor`.
5. Desmarcar el caso en `Casos de la clase` y verificar que desaparece de la vista del estudiante.
6. Con una cuenta estudiante, `/profesor` responde 404.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/comunidad/clases "apps/web/src/app/(dashboard)/profesor" "apps/web/src/app/(dashboard)/dashboard/clases"
git commit -m "feat(comunidad): panel docente de clases y union con codigo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Preguntas a docentes

**Files:**
- Create: `apps/web/src/lib/preguntas-profesor.ts`
- Test: `apps/web/src/lib/preguntas-profesor.test.ts`
- Modify: `apps/web/src/lib/rate-limit.ts`
- Create: `apps/web/src/app/api/preguntas-profesor/route.ts`, `apps/web/src/app/api/profesor/preguntas/[id]/respuesta/route.ts`
- Test: `apps/web/src/app/api/preguntas-profesor/route.test.ts`, `apps/web/src/app/api/preguntas-profesor/redis-caido.test.ts`
- Create:
  - `apps/web/src/components/mision/pregunta-docente.tsx`
  - `apps/web/src/components/comunidad/formulario-respuesta.tsx`
  - `apps/web/src/components/comunidad/lista-preguntas.tsx`
  - `apps/web/src/app/(dashboard)/dashboard/preguntas/page.tsx`
  - `apps/web/src/app/(dashboard)/profesor/preguntas/page.tsx`
- Modify: `apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx`

**Interfaces:**
- Consumes:
  - `preguntasProfesor`, `clases`, `claseCasos` y `claseInscripciones` (Task 1);
  - `listarAdmins`, `exigirUsuario`, `exigirDocente` y `esUuid` (Task 1);
  - `salaUsuario`, `EVENTO_PREGUNTA_NUEVA`, `EVENTO_PREGUNTA_RESPONDIDA`, `avisarSinFallar` y `RefrescarConAvisos` (Task 2);
  - `enlacePreguntasDocente` y `enlaceMisPreguntas` (Task 2).
- Produces tipos en `@/lib/preguntas-profesor`:
  - `type FilaPregunta = { id; estudiante; caso: { slug; titulo }; mision: { slug; titulo }; texto; respuesta; estado; creadaEn; respondidaEn; asignada }`. `asignada` es `false` si la pregunta está en el grupo de administración.
  - `type DependenciasPregunta = { encolar: Encolar; avisar: Avisar }`.
- Produces funciones en `@/lib/preguntas-profesor`:
  - `resolverDocente(db, { alumnoId, casoId }): Promise<{ claseId; profesorId }>`;
  - `crearPreguntaProfesor(db, { alumno: Persona, casoSlug, mision, texto }, deps)`, que devuelve `{ ok: true; id } | { ok: false; motivo: "mision_no_existe" }`;
  - `puedeResponder(pregunta: { profesorId }, actor: { id; rol }): boolean`;
  - `responderPregunta(db, { preguntaId, respuesta, actor: UsuarioActual }, { ...deps, meta })`, que devuelve `{ ok: true } | { ok: false; motivo: "no_existe" | "prohibido" }`;
  - `preguntasDelEstudiante(db, alumnoId)` y `preguntasParaDocente(db, actor)`.
- Produces la API:
  - `POST /api/preguntas-profesor` recibe `{ caso, mision, texto }` y responde 201 `{ id }`, o 401, 429, 400 o 404;
  - `POST /api/profesor/preguntas/[id]/respuesta` recibe `{ respuesta }` y responde 200, o 401, 403, 400 o 404.
- Produces las páginas `/dashboard/preguntas` y `/profesor/preguntas`, y el panel `Preguntar a un docente` en cada misión.
- Límite nuevo: `preguntas-profesor`, 5 por hora por persona.

- [ ] **Step 1: Escribir los tests que fallan**

`apps/web/src/lib/preguntas-profesor.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoAviso } from "@syntaxerror/queue/avisos";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { EVENTO_PREGUNTA_NUEVA, EVENTO_PREGUNTA_RESPONDIDA } from "@syntaxerror/queue/eventos";
import { auditLog, casos, claseCasos, claseInscripciones, clases, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Rol } from "@/lib/roles";
import { crearPreguntaProfesor, preguntasDelEstudiante, preguntasParaDocente, responderPregunta } from "./preguntas-profesor";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const avisos: TrabajoAviso[] = [];
const deps = {
  encolar: async (trabajo: TrabajoEmail) => void enviados.push(trabajo),
  avisar: async (trabajo: TrabajoAviso) => void avisos.push(trabajo),
};

async function persona(email: string, rol: Rol, nombre: string | null = null) {
  const [fila] = await db.insert(users).values({ email, name: nombre, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre, rol };
}

async function escenario() {
  const ana = await persona("ana@correo.cl", "student", "Ana");
  const rosa = await persona("rosa@correo.cl", "teacher", "Rosa");
  const otra = await persona("otra@correo.cl", "teacher");
  const admin = await persona("admin@correo.cl", "admin", "Admin");
  const [caso] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "Clientes", tareas: ["t1"] }] })
    .returning({ id: casos.id });
  const [ruta] = await db.insert(rutas).values({ slug: "r", titulo: "R", cargo: "A", descripcion: "R" }).returning({ id: rutas.id });
  const [clase] = await db.insert(clases).values({ profesorId: rosa.id, rutaId: ruta.id, titulo: "3°A", codigo: "ABC234" }).returning({ id: clases.id });
  await db.insert(claseCasos).values({ claseId: clase.id, casoId: caso.id });
  return { ana, rosa, otra, admin, casoId: caso.id, claseId: clase.id };
}

const preguntar = (alumno: { id: string; email: string; nombre: string | null }, mision = "m1") =>
  crearPreguntaProfesor(db, { alumno, casoSlug: "ventas", mision, texto: "¿Uso WHERE o HAVING?" }, deps);

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
  avisos.length = 0;
});
afterAll(() => close());

describe("preguntas a docentes", () => {
  it("sin clase, la pregunta va a administración por email y en vivo", async () => {
    const { ana, admin } = await escenario();
    const creada = await preguntar(ana);
    expect(creada.ok).toBe(true);
    expect(enviados).toEqual([
      {
        tipo: "pregunta-profesor-nueva",
        para: "admin@correo.cl",
        nombre: "Admin",
        alumno: "Ana (ana@correo.cl)",
        caso: "Ventas",
        mision: "Clientes",
        pregunta: "¿Uso WHERE o HAVING?",
        enlace: expect.stringContaining("/profesor/preguntas"),
      },
    ]);
    expect(avisos).toEqual([{ salas: [`usuario:${admin.id}`], evento: EVENTO_PREGUNTA_NUEVA, datos: { preguntaId: creada.ok ? creada.id : "" } }]);
    expect((await preguntasParaDocente(db, admin)).map((fila) => fila.asignada)).toEqual([false]);
  });

  it("con una clase activa que tiene el caso habilitado, la pregunta va a su docente", async () => {
    const { ana, rosa, otra, claseId } = await escenario();
    await db.insert(claseInscripciones).values({ claseId, userId: ana.id, estado: "activa" });
    await preguntar(ana);
    expect(enviados.map((email) => email.para)).toEqual(["rosa@correo.cl"]);
    expect(avisos[0].salas).toEqual([`usuario:${rosa.id}`]);
    expect(await preguntasParaDocente(db, rosa)).toHaveLength(1);
    expect(await preguntasParaDocente(db, otra)).toEqual([]);
  });

  it("con la inscripción pendiente o el caso deshabilitado, va a administración", async () => {
    const { ana, claseId } = await escenario();
    await db.insert(claseInscripciones).values({ claseId, userId: ana.id, estado: "pendiente" });
    await preguntar(ana);
    expect(enviados.map((email) => email.para)).toEqual(["admin@correo.cl"]);
  });

  it("una misión que no es del caso no crea nada", async () => {
    const { ana } = await escenario();
    expect(await preguntar(ana, "m9")).toEqual({ ok: false, motivo: "mision_no_existe" });
    expect(await preguntasDelEstudiante(db, ana.id)).toEqual([]);
  });

  it("responde la docente asignada; otra docente no puede; la segunda respuesta no pisa la primera", async () => {
    const { ana, rosa, otra, claseId } = await escenario();
    await db.insert(claseInscripciones).values({ claseId, userId: ana.id, estado: "activa" });
    const creada = await preguntar(ana);
    if (!creada.ok) throw new Error("no se creó");
    enviados.length = 0;
    avisos.length = 0;
    const responder = (actor: typeof rosa, respuesta: string) => responderPregunta(db, { preguntaId: creada.id, respuesta, actor }, { ...deps, meta: SIN_META });

    expect(await responder(otra, "Otra respuesta")).toEqual({ ok: false, motivo: "prohibido" });
    expect(await responder(rosa, "HAVING filtra grupos.")).toEqual({ ok: true });
    expect(await responder(rosa, "Cambio de opinión")).toEqual({ ok: false, motivo: "no_existe" });

    const [fila] = await preguntasDelEstudiante(db, ana.id);
    expect(fila).toMatchObject({ estado: "respondida", respuesta: "HAVING filtra grupos.", mision: { slug: "m1", titulo: "Clientes" } });
    expect(enviados).toEqual([
      {
        tipo: "pregunta-profesor-respondida",
        para: "ana@correo.cl",
        nombre: "Ana",
        caso: "Ventas",
        mision: "Clientes",
        pregunta: "¿Uso WHERE o HAVING?",
        respuesta: "HAVING filtra grupos.",
        enlace: expect.stringContaining("/dashboard/preguntas"),
      },
    ]);
    expect(avisos).toEqual([{ salas: [`usuario:${ana.id}`], evento: EVENTO_PREGUNTA_RESPONDIDA, datos: { preguntaId: creada.id } }]);
    expect((await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action)).toEqual(["teacher_question_answered"]);
  });

  it("administración puede responder cualquier pregunta", async () => {
    const { ana, admin } = await escenario();
    const creada = await preguntar(ana);
    if (!creada.ok) throw new Error("no se creó");
    expect(await responderPregunta(db, { preguntaId: creada.id, respuesta: "Usa HAVING.", actor: admin }, { ...deps, meta: SIN_META })).toEqual({ ok: true });
  });
});
```

`apps/web/src/app/api/preguntas-profesor/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, preguntasProfesor, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
vi.mock("@/lib/avisos", () => ({ avisarSinFallar: vi.fn(async () => {}) }));

const preguntas = await import("./route");
const respuesta = await import("../profesor/preguntas/[id]/respuesta/route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function persona(rol: Rol) {
  const email = `${rol}-${crypto.randomUUID()}@correo.cl`;
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

const json = (url: string, cuerpo: unknown) =>
  new Request(`http://localhost:3000${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
const preguntar = (cuerpo: unknown) => preguntas.POST(json("/api/preguntas-profesor", cuerpo));
const responder = (id: string, cuerpo: unknown) =>
  respuesta.POST(json(`/api/profesor/preguntas/${id}/respuesta`, cuerpo), { params: Promise.resolve({ id }) });
const valida = { caso: "ventas", mision: "m1", texto: "¿Cómo agrupo por mes?" };

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
  await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }] });
});
afterAll(() => close());

describe("API de preguntas a docentes", () => {
  it("preguntar: 401 sin sesión, 400 inválida, 404 misión ajena, 201 y 429 desde la sexta en una hora", async () => {
    expect((await preguntar(valida)).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("student"));
    expect((await preguntar({ ...valida, texto: "?" })).status).toBe(400);
    expect((await preguntar({ ...valida, mision: "m9" })).status).toBe(404);
    for (let vez = 0; vez < 3; vez++) expect((await preguntar(valida)).status).toBe(201);
    expect((await preguntar(valida)).status).toBe(429);
  });

  it("responder: 403 a estudiantes, 404 a ids inválidos o respondidos, 200 a administración", async () => {
    const alumna = await persona("student");
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(alumna);
    const { id } = (await (await preguntar(valida)).json()) as { id: string };

    expect((await responder(id, { respuesta: "Hola" })).status).toBe(403);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("admin"));
    expect((await responder("no-es-uuid", { respuesta: "Hola" })).status).toBe(404);
    expect((await responder(id, { respuesta: "" })).status).toBe(400);
    expect((await responder(id, { respuesta: "Usa date_trunc." })).status).toBe(200);
    expect((await responder(id, { respuesta: "Otra vez" })).status).toBe(404);
    const [fila] = await db.select().from(preguntasProfesor);
    expect(fila).toMatchObject({ estado: "respondida", respuesta: "Usa date_trunc." });
  });

  it("una docente sin la pregunta asignada recibe 403", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("student"));
    const { id } = (await (await preguntar(valida)).json()) as { id: string };
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("teacher"));
    expect((await responder(id, { respuesta: "Hola" })).status).toBe(403);
  });
});
```

En el primer test, el límite de 5 por hora cuenta también las dos requests rechazadas por la validación y la misión ajena: la request se cuenta antes de validar. Por eso hay 3 respuestas 201 y la sexta request responde 429.

`apps/web/src/app/api/preguntas-profesor/redis-caido.test.ts`:
```ts
import { afterAll, describe, expect, it, vi } from "vitest";
import { casos, preguntasProfesor, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

// Sin mocks de emails ni avisos: se usan las colas reales contra un Redis que no existe.
process.env.REDIS_URL = "redis://127.0.0.1:6390";
vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const preguntas = await import("./route");
const respuesta = await import("../profesor/preguntas/[id]/respuesta/route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

afterAll(() => close());

const json = (url: string, cuerpo: unknown) =>
  new Request(`http://localhost:3000${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });

describe("preguntas a docentes con Redis caído", () => {
  it("preguntar y responder funcionan aunque no se puedan encolar emails ni avisos", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await truncateAll(db);
    const [alumna, admin] = await db
      .insert(users)
      .values([{ email: "ana@correo.cl" }, { email: "admin@correo.cl", role: "admin" }])
      .returning({ id: users.id });
    await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }] });

    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: alumna.id, email: "ana@correo.cl", nombre: null, rol: "student" });
    const creada = await preguntas.POST(json("/api/preguntas-profesor", { caso: "ventas", mision: "m1", texto: "¿Cómo agrupo?" }));
    expect(creada.status).toBe(201);
    const { id } = (await creada.json()) as { id: string };

    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: admin.id, email: "admin@correo.cl", nombre: null, rol: "admin" });
    expect((await respuesta.POST(json(`/api/profesor/preguntas/${id}/respuesta`, { respuesta: "Con GROUP BY." }), { params: Promise.resolve({ id }) })).status).toBe(200);
    expect(await db.select({ estado: preguntasProfesor.estado }).from(preguntasProfesor)).toEqual([{ estado: "respondida" }]);
  }, 30_000);
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/preguntas-profesor.test.ts src/app/api/preguntas-profesor`
Expected: FAIL, porque no se pueden resolver `./preguntas-profesor` ni las rutas.

- [ ] **Step 3: Crear `apps/web/src/lib/preguntas-profesor.ts`**

```ts
import { and, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { casos, claseCasos, claseInscripciones, clases, preguntasProfesor, users, type MisionResumen } from "@syntaxerror/db/schema";
import { EVENTO_PREGUNTA_NUEVA, EVENTO_PREGUNTA_RESPONDIDA, salaUsuario } from "@syntaxerror/queue/eventos";
import type { Avisar } from "@/lib/avisos";
import { enlaceMisPreguntas, enlacePreguntasDocente } from "@/lib/cuenta/enlaces";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { listarAdmins, type Persona, type Rol } from "@/lib/roles";
import type { UsuarioActual } from "@/lib/sesion";

export type DependenciasPregunta = { encolar: Encolar; avisar: Avisar };
export type FilaPregunta = {
  id: string;
  estudiante: string;
  caso: { slug: string; titulo: string };
  mision: { slug: string; titulo: string };
  texto: string;
  respuesta: string | null;
  estado: "pendiente" | "respondida";
  creadaEn: Date;
  respondidaEn: Date | null;
  asignada: boolean;
};

const describir = (persona: { nombre: string | null; email: string }) => (persona.nombre ? `${persona.nombre} (${persona.email})` : persona.email);
const tituloMision = (misiones: MisionResumen[], slug: string) => misiones.find((mision) => mision.slug === slug)?.titulo ?? slug;

// La pregunta la toma el docente de una clase activa del estudiante que tenga ese caso habilitado.
export async function resolverDocente(db: AppDb, { alumnoId, casoId }: { alumnoId: string; casoId: string }): Promise<{ claseId: string | null; profesorId: string | null }> {
  const [fila] = await db
    .select({ claseId: clases.id, profesorId: clases.profesorId })
    .from(claseInscripciones)
    .innerJoin(clases, eq(clases.id, claseInscripciones.claseId))
    .innerJoin(claseCasos, and(eq(claseCasos.claseId, clases.id), eq(claseCasos.casoId, casoId), eq(claseCasos.habilitado, true)))
    .where(and(eq(claseInscripciones.userId, alumnoId), eq(claseInscripciones.estado, "activa"), eq(clases.estado, "activa")))
    .orderBy(desc(claseInscripciones.decididaEn))
    .limit(1);
  return fila ?? { claseId: null, profesorId: null };
}

export async function crearPreguntaProfesor(
  db: AppDb,
  { alumno, casoSlug, mision, texto }: { alumno: Persona; casoSlug: string; mision: string; texto: string },
  { encolar, avisar }: DependenciasPregunta
): Promise<{ ok: true; id: string } | { ok: false; motivo: "mision_no_existe" }> {
  const [caso] = await db.select({ id: casos.id, titulo: casos.titulo, misiones: casos.misiones }).from(casos).where(eq(casos.slug, casoSlug));
  if (!caso || !caso.misiones.some((candidata) => candidata.slug === mision)) return { ok: false, motivo: "mision_no_existe" };

  const destino = await resolverDocente(db, { alumnoId: alumno.id, casoId: caso.id });
  const [creada] = await db
    .insert(preguntasProfesor)
    .values({ alumnoId: alumno.id, casoId: caso.id, mision, texto, ...destino })
    .returning({ id: preguntasProfesor.id });

  let destinatarios: Persona[] = [];
  if (destino.profesorId) {
    destinatarios = await db.select({ id: users.id, email: users.email, nombre: users.name }).from(users).where(eq(users.id, destino.profesorId));
  } else {
    destinatarios = await listarAdmins(db);
  }
  for (const persona of destinatarios) {
    await encolar({
      tipo: "pregunta-profesor-nueva",
      para: persona.email,
      nombre: persona.nombre,
      alumno: describir(alumno),
      caso: caso.titulo,
      mision: tituloMision(caso.misiones, mision),
      pregunta: texto,
      enlace: enlacePreguntasDocente(),
    });
  }
  await avisar({ salas: destinatarios.map((persona) => salaUsuario(persona.id)), evento: EVENTO_PREGUNTA_NUEVA, datos: { preguntaId: creada.id } });
  return { ok: true, id: creada.id };
}

// Responde el docente asignado. Administración puede responder cualquiera, incluidas las sin docente.
export function puedeResponder(pregunta: { profesorId: string | null }, actor: { id: string; rol: Rol }): boolean {
  return actor.rol === "admin" || (pregunta.profesorId !== null && pregunta.profesorId === actor.id);
}

export async function responderPregunta(
  db: AppDb,
  { preguntaId, respuesta, actor }: { preguntaId: string; respuesta: string; actor: UsuarioActual },
  { encolar, avisar, meta }: DependenciasPregunta & { meta: MetaRequest }
): Promise<{ ok: true } | { ok: false; motivo: "no_existe" | "prohibido" }> {
  const [pregunta] = await db
    .select({
      alumnoId: preguntasProfesor.alumnoId,
      profesorId: preguntasProfesor.profesorId,
      estado: preguntasProfesor.estado,
      texto: preguntasProfesor.texto,
      mision: preguntasProfesor.mision,
      casoTitulo: casos.titulo,
      misiones: casos.misiones,
      email: users.email,
      nombre: users.name,
    })
    .from(preguntasProfesor)
    .innerJoin(casos, eq(casos.id, preguntasProfesor.casoId))
    .innerJoin(users, eq(users.id, preguntasProfesor.alumnoId))
    .where(eq(preguntasProfesor.id, preguntaId));
  if (!pregunta || pregunta.estado !== "pendiente") return { ok: false, motivo: "no_existe" };
  if (!puedeResponder(pregunta, actor)) return { ok: false, motivo: "prohibido" };

  // Se vuelve a exigir "pendiente" al actualizar: de dos respuestas simultáneas, solo una queda.
  const respondidas = await db
    .update(preguntasProfesor)
    .set({ respuesta, estado: "respondida", respondidaEn: new Date(), respondidaPor: actor.id })
    .where(and(eq(preguntasProfesor.id, preguntaId), eq(preguntasProfesor.estado, "pendiente")))
    .returning({ id: preguntasProfesor.id });
  if (respondidas.length === 0) return { ok: false, motivo: "no_existe" };

  await insertAuditLogEntry(db, {
    actorId: actor.id,
    actorEmail: actor.email,
    action: "teacher_question_answered",
    targetType: "teacher_question",
    targetId: preguntaId,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  await encolar({
    tipo: "pregunta-profesor-respondida",
    para: pregunta.email,
    nombre: pregunta.nombre,
    caso: pregunta.casoTitulo,
    mision: tituloMision(pregunta.misiones, pregunta.mision),
    pregunta: pregunta.texto,
    respuesta,
    enlace: enlaceMisPreguntas(),
  });
  await avisar({ salas: [salaUsuario(pregunta.alumnoId)], evento: EVENTO_PREGUNTA_RESPONDIDA, datos: { preguntaId } });
  return { ok: true };
}

async function listar(db: AppDb, filtro: SQL | undefined): Promise<FilaPregunta[]> {
  const filas = await db
    .select({
      id: preguntasProfesor.id,
      nombre: users.name,
      email: users.email,
      casoSlug: casos.slug,
      casoTitulo: casos.titulo,
      misiones: casos.misiones,
      mision: preguntasProfesor.mision,
      texto: preguntasProfesor.texto,
      respuesta: preguntasProfesor.respuesta,
      estado: preguntasProfesor.estado,
      creadaEn: preguntasProfesor.creadaEn,
      respondidaEn: preguntasProfesor.respondidaEn,
      profesorId: preguntasProfesor.profesorId,
    })
    .from(preguntasProfesor)
    .innerJoin(users, eq(users.id, preguntasProfesor.alumnoId))
    .innerJoin(casos, eq(casos.id, preguntasProfesor.casoId))
    .where(filtro)
    .orderBy(sql`case when ${preguntasProfesor.estado} = 'pendiente' then 0 else 1 end`, desc(preguntasProfesor.creadaEn))
    .limit(100);
  return filas.map((fila) => ({
    id: fila.id,
    estudiante: fila.nombre ?? fila.email,
    caso: { slug: fila.casoSlug, titulo: fila.casoTitulo },
    mision: { slug: fila.mision, titulo: tituloMision(fila.misiones, fila.mision) },
    texto: fila.texto,
    respuesta: fila.respuesta,
    estado: fila.estado === "respondida" ? "respondida" : "pendiente",
    creadaEn: fila.creadaEn,
    respondidaEn: fila.respondidaEn,
    asignada: fila.profesorId !== null,
  }));
}

export function preguntasDelEstudiante(db: AppDb, alumnoId: string): Promise<FilaPregunta[]> {
  return listar(db, eq(preguntasProfesor.alumnoId, alumnoId));
}

export function preguntasParaDocente(db: AppDb, actor: { id: string; rol: Rol }): Promise<FilaPregunta[]> {
  const propias = eq(preguntasProfesor.profesorId, actor.id);
  return listar(db, actor.rol === "admin" ? or(propias, isNull(preguntasProfesor.profesorId)) : propias);
}
```

- [ ] **Step 4: Agregar el límite en `apps/web/src/lib/rate-limit.ts`**

Agregar `| "preguntas-profesor"` al tipo `RateLimitKey`, y a `LIMITER_CONFIGS`:
```ts
  "preguntas-profesor": { points: 5, duration: 3600 },
```

- [ ] **Step 5: Crear las rutas**

`apps/web/src/app/api/preguntas-profesor/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { avisarSinFallar } from "@/lib/avisos";
import { encolarSinFallar } from "@/lib/emails";
import { exigirUsuario } from "@/lib/permisos";
import { crearPreguntaProfesor } from "@/lib/preguntas-profesor";
import { checkRateLimit } from "@/lib/rate-limit";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const esquema = z.object({ caso: slug, mision: slug, texto: z.string().trim().min(5).max(2000) });

export async function POST(request: Request) {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  const limite = await checkRateLimit("preguntas-profesor", usuario.id);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await crearPreguntaProfesor(
    getDb(),
    { alumno: usuario, casoSlug: parsed.data.caso, mision: parsed.data.mision, texto: parsed.data.texto },
    { encolar: encolarSinFallar, avisar: avisarSinFallar }
  );
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: 404 });
  return NextResponse.json({ id: resultado.id }, { status: 201 });
}
```

`apps/web/src/app/api/profesor/preguntas/[id]/respuesta/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { avisarSinFallar } from "@/lib/avisos";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { encolarSinFallar } from "@/lib/emails";
import { exigirDocente } from "@/lib/permisos";
import { responderPregunta } from "@/lib/preguntas-profesor";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({ respuesta: z.string().trim().min(1).max(4000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await responderPregunta(
    getDb(),
    { preguntaId: id, respuesta: parsed.data.respuesta, actor: usuario },
    { encolar: encolarSinFallar, avisar: avisarSinFallar, meta: metaDeRequest(request) }
  );
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: resultado.motivo === "prohibido" ? 403 : 404 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Correr los tests**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/preguntas-profesor.test.ts src/app/api/preguntas-profesor`
Expected: PASS (10 tests: 6 del servicio, 3 de la API y 1 con Redis caído). El de Redis caído tarda algunos segundos: espera la conexión antes de dejar pasar.

- [ ] **Step 7: Crear el panel de la misión, `apps/web/src/components/mision/pregunta-docente.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

export function PreguntaDocente({ caso, mision }: { caso: string; mision: string }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<"escribiendo" | "enviada" | "sin_sesion">("escribiendo");
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson("/api/preguntas-profesor", "POST", { caso, mision, texto });
    setEnviando(false);
    if (respuesta.ok) {
      setEstado("enviada");
      setTexto("");
    } else if (respuesta.status === 401) setEstado("sin_sesion");
    else if (respuesta.status === 429) setAviso("Ya enviaste varias preguntas esta hora. Intenta más tarde.");
    else if (respuesta.status === 400) setAviso("Escribe tu pregunta con al menos 5 caracteres.");
    else setAviso("No pudimos enviar tu pregunta. Intenta de nuevo.");
  }

  if (!abierto) {
    return (
      <div>
        <Button type="button" variant="secondary" onClick={() => setAbierto(true)}>
          Preguntar a un docente
        </Button>
      </div>
    );
  }

  return (
    <section className="card grid gap-4 p-5" aria-label="Pregunta a un docente">
      <header className="flex items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-primary">{"> docente"}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>Cerrar</Button>
      </header>
      <p className="text-sm text-muted-foreground">
        Una persona del equipo docente lee tu pregunta y te responde. Si estás en una clase con este caso, le llega a tu docente.
      </p>
      {estado === "sin_sesion" ? (
        <p className="text-sm">
          <Link className="font-bold text-primary hover:underline" href={`/login?callbackUrl=${encodeURIComponent(`/casos/${caso}/${mision}`)}`}>
            Entra para preguntarle a un docente
          </Link>
        </p>
      ) : estado === "enviada" ? (
        <p role="status" className="text-sm font-bold">
          Tu pregunta quedó enviada. Te avisaremos por email cuando tenga respuesta.{" "}
          <Link className="text-primary hover:underline" href="/dashboard/preguntas">Ver tus preguntas</Link>
        </p>
      ) : (
        <form className="grid gap-3" onSubmit={enviar}>
          <label className="grid gap-2 text-sm font-bold">
            Tu pregunta para el equipo docente
            <textarea
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              rows={4}
              minLength={5}
              maxLength={2000}
              required
              className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
            />
          </label>
          <div>
            <Button type="submit" disabled={enviando}>Enviar al docente</Button>
          </div>
          {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
        </form>
      )}
    </section>
  );
}
```

En `apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx`:
- agregar `import { PreguntaDocente } from "@/components/mision/pregunta-docente";`;
- justo después de `<Tutor caso={caso.slug} mision={mision.slug} />`, agregar:
```tsx
      <PreguntaDocente caso={caso.slug} mision={mision.slug} />
```

- [ ] **Step 8: Crear las listas y las páginas**

`apps/web/src/components/comunidad/formulario-respuesta.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioRespuesta({ preguntaId }: { preguntaId: string }) {
  const router = useRouter();
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const resultado = await enviarJson(`/api/profesor/preguntas/${preguntaId}/respuesta`, "POST", { respuesta });
    setEnviando(false);
    if (resultado.ok || resultado.status === 404) {
      if (resultado.status === 404) setAviso("Esta pregunta ya fue respondida.");
      router.refresh();
      return;
    }
    setAviso("No pudimos enviar la respuesta. Intenta de nuevo.");
  }

  return (
    <form className="grid gap-2" onSubmit={enviar}>
      <label className="grid gap-2 text-sm font-bold">
        Tu respuesta
        <textarea
          value={respuesta}
          onChange={(evento) => setRespuesta(evento.target.value)}
          rows={3}
          maxLength={4000}
          required
          className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
        />
      </label>
      <div>
        <Button type="submit" size="sm" disabled={enviando}>Enviar respuesta</Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
```

`apps/web/src/components/comunidad/lista-preguntas.tsx` (componente de servidor):
```tsx
import Link from "next/link";
import type { FilaPregunta } from "@/lib/preguntas-profesor";
import { FormularioRespuesta } from "./formulario-respuesta";

const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });

export function ListaPreguntas({ preguntas, modo }: { preguntas: FilaPregunta[]; modo: "estudiante" | "docente" }) {
  return (
    <ul className="grid gap-3">
      {preguntas.map((pregunta) => (
        <li key={pregunta.id} className={pregunta.estado === "pendiente" ? "card grid gap-3 border-primary p-4" : "card grid gap-3 p-4"}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link className="font-bold text-primary hover:underline" href={`/casos/${pregunta.caso.slug}/${pregunta.mision.slug}`}>
              {`${pregunta.caso.titulo} · ${pregunta.mision.titulo}`}
            </Link>
            <span className="badge">{pregunta.estado === "pendiente" ? "Pendiente" : "Respondida"}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {modo === "docente" ? `${pregunta.estudiante} · ` : ""}
            {fecha(pregunta.creadaEn)}
            {modo === "docente" && !pregunta.asignada ? " · sin docente asignado" : ""}
          </p>
          <p className="whitespace-pre-wrap leading-7">{pregunta.texto}</p>
          {pregunta.respuesta ? (
            <div className="grid gap-1 rounded-md border border-primary/30 p-3">
              <p className="text-xs font-bold text-primary">Respuesta</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{pregunta.respuesta}</p>
            </div>
          ) : modo === "docente" ? (
            <FormularioRespuesta preguntaId={pregunta.id} />
          ) : (
            <p className="text-sm text-muted-foreground">Todavía sin respuesta. Te avisaremos por email.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
```

`apps/web/src/app/(dashboard)/dashboard/preguntas/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { EVENTO_PREGUNTA_RESPONDIDA } from "@syntaxerror/queue/eventos";
import { RefrescarConAvisos } from "@/components/avisos/refrescar-con-avisos";
import { ListaPreguntas } from "@/components/comunidad/lista-preguntas";
import { preguntasDelEstudiante } from "@/lib/preguntas-profesor";
import { obtenerUsuarioId } from "@/lib/sesion";

export const metadata = { title: "Tus preguntas" };

export default async function MisPreguntasPage() {
  const userId = await obtenerUsuarioId();
  if (!userId) redirect("/login?callbackUrl=/dashboard/preguntas");
  const preguntas = await preguntasDelEstudiante(getDb(), userId);
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <RefrescarConAvisos eventos={[EVENTO_PREGUNTA_RESPONDIDA]} />
      <p className="font-mono text-sm font-bold text-primary">{"> git log --preguntas"}</p>
      <h1 className="text-3xl font-black">Tus preguntas</h1>
      {preguntas.length === 0 ? (
        <p className="text-muted-foreground">Todavía no preguntas nada. En cada misión puedes preguntarle a un docente.</p>
      ) : (
        <ListaPreguntas preguntas={preguntas} modo="estudiante" />
      )}
    </main>
  );
}
```

`apps/web/src/app/(dashboard)/profesor/preguntas/page.tsx`:
```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { EVENTO_PREGUNTA_NUEVA } from "@syntaxerror/queue/eventos";
import { RefrescarConAvisos } from "@/components/avisos/refrescar-con-avisos";
import { ListaPreguntas } from "@/components/comunidad/lista-preguntas";
import { preguntasParaDocente } from "@/lib/preguntas-profesor";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const metadata = { title: "Preguntas de estudiantes" };

export default async function PreguntasDocentePage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?callbackUrl=/profesor/preguntas");
  if (!esDocente(usuario)) notFound();
  const preguntas = await preguntasParaDocente(getDb(), usuario);
  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-12 sm:px-6">
      <RefrescarConAvisos eventos={[EVENTO_PREGUNTA_NUEVA]} />
      <nav className="text-sm"><Link className="font-bold text-primary hover:underline" href="/profesor">← Panel docente</Link></nav>
      <p className="font-mono text-sm font-bold text-primary">{"> git pull origin preguntas"}</p>
      <h1 className="text-3xl font-black">Preguntas de estudiantes</h1>
      <p className="leading-7 text-muted-foreground">
        {usuario.rol === "admin"
          ? "Ves las preguntas de tus clases y las de estudiantes sin docente asignado."
          : "Ves las preguntas de estudiantes de tus clases sobre los casos habilitados."}
      </p>
      {preguntas.length === 0 ? <p className="text-muted-foreground">No hay preguntas por ahora.</p> : <ListaPreguntas preguntas={preguntas} modo="docente" />}
    </main>
  );
}
```

- [ ] **Step 9: Correr los tests, el typecheck y el build**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected:
- PASS y `tsc` sin errores;
- en el build, `/casos/[caso]/[mision]` sigue estática (`●`);
- `/dashboard/preguntas` y `/profesor/preguntas` son dinámicas (`ƒ`).

- [ ] **Step 10: Probar en el navegador, con el aviso en vivo**

Con `docker compose up -d --build`:
1. En una ventana, entrar como `admin@local.test` y abrir `/profesor/preguntas`.
2. En una ventana privada, con una cuenta nueva sin clase, abrir una misión, pulsar `Preguntar a un docente` y enviar una pregunta.
3. Sin recargar, la pregunta aparece en la ventana del admin; en Mailpit llega `Tienes una pregunta nueva`.
4. Responderla. En la ventana privada, `/dashboard/preguntas` pasa a `Respondida` sin recargar, y llega `Respondieron tu pregunta`.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/lib/preguntas-profesor.ts apps/web/src/lib/preguntas-profesor.test.ts apps/web/src/lib/rate-limit.ts apps/web/src/app/api/preguntas-profesor apps/web/src/app/api/profesor/preguntas apps/web/src/components/mision/pregunta-docente.tsx apps/web/src/components/comunidad/formulario-respuesta.tsx apps/web/src/components/comunidad/lista-preguntas.tsx "apps/web/src/app/(dashboard)/dashboard/preguntas" "apps/web/src/app/(dashboard)/profesor/preguntas" "apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx"
git commit -m "feat(comunidad): preguntas a docentes con aviso en vivo y por email

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: Navegación, datos exportables, e2e y README

**Files:**
- Modify: `apps/web/src/components/site-header.tsx`, `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- Modify: `apps/web/src/lib/cuenta/perfil.ts`, `apps/web/src/lib/cuenta/perfil.test.ts`
- Modify: `e2e/tests/fixtures.ts`, `e2e/tests/misiones.spec.ts`
- Create: `e2e/tests/comunidad.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: todo lo anterior, y el admin de desarrollo que crea `db-setup` (`admin@local.test`, clave `admin123456`).
- Produces:
  - en el encabezado, los enlaces `Mensajes` (con el número de mensajes sin leer) y `Docencia` (solo docentes);
  - en el panel, los accesos a preguntas, clases y mensajes;
  - `exportarDatos` incluye `puntos`, `preguntasDocentes`, `resenas`, `reportes`, `mensajes`, `clases` y `solicitudesDocente`;
  - en `e2e/tests/fixtures.ts`, el fixture `nuevaPagina()`: otra sesión de navegador con su propia IP, para actuar como docente en el mismo test.

- [ ] **Step 1: Escribir el test que falla de la exportación**

Agregar a `apps/web/src/lib/cuenta/perfil.test.ts`. En el import de `@syntaxerror/db/schema`, agregar `claseInscripciones`, `clases`, `mensajes`, `preguntasProfesor`, `reportes`, `resenasCaso`, `solicitudesDocente` y `transaccionesPuntos`.

Luego, dentro de `describe("exportarDatos", ...)`, agregar:
```ts
  it("incluye los datos de comunidad", async () => {
    const id = await alumna();
    const [docente] = await db.insert(users).values({ email: "rosa@correo.cl", role: "teacher" }).returning({ id: users.id });
    const [ruta] = await db
      .insert(rutas)
      .values({ slug: "analista", titulo: "Analista", cargo: "Analista", descripcion: "Ruta" })
      .returning({ id: rutas.id });
    const [caso] = await db
      .insert(casos)
      .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
      .returning({ id: casos.id });
    const [clase] = await db.insert(clases).values({ profesorId: docente.id, rutaId: ruta.id, titulo: "3°A", codigo: "ABC234" }).returning({ id: clases.id });
    await db.insert(claseInscripciones).values({ claseId: clase.id, userId: id, estado: "activa" });
    await db.insert(transaccionesPuntos).values({ userId: id, casoId: caso.id, clave: "m1", motivo: "mision_aprobada", cantidad: 10 });
    await db.insert(preguntasProfesor).values({ alumnoId: id, casoId: caso.id, mision: "m1", texto: "¿Cómo filtro?" });
    await db.insert(resenasCaso).values({ userId: id, casoId: caso.id, estrellas: 5, comentario: "Muy bueno", estadoComentario: "pendiente" });
    await db.insert(reportes).values({ userId: id, tipo: "error", descripcion: "No carga la tabla", pagina: "/casos/ventas" });
    await db.insert(mensajes).values({ userId: id, asunto: "Hola", cuerpo: "Gracias por tu reporte" });
    await db.insert(solicitudesDocente).values({ userId: id });

    const datos = await exportarDatos(db, id, SIN_META);
    expect(datos?.puntos).toEqual([{ caso: "ventas", motivo: "mision_aprobada", cantidad: 10, creadoEn: expect.any(Date) }]);
    expect(datos?.preguntasDocentes).toEqual([
      { caso: "ventas", mision: "m1", texto: "¿Cómo filtro?", respuesta: null, estado: "pendiente", creadaEn: expect.any(Date) },
    ]);
    expect(datos?.resenas).toEqual([{ caso: "ventas", estrellas: 5, comentario: "Muy bueno", creadaEn: expect.any(Date) }]);
    expect(datos?.reportes).toEqual([
      { tipo: "error", descripcion: "No carga la tabla", pagina: "/casos/ventas", estado: "pendiente", creadoEn: expect.any(Date) },
    ]);
    expect(datos?.mensajes).toEqual([{ asunto: "Hola", cuerpo: "Gracias por tu reporte", leidoEn: null, creadoEn: expect.any(Date) }]);
    expect(datos?.clases).toEqual([{ clase: "3°A", estado: "activa", solicitadaEn: expect.any(Date) }]);
    expect(datos?.solicitudesDocente).toEqual([{ estado: "pendiente", creadaEn: expect.any(Date) }]);
  });
```

- [ ] **Step 2: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/cuenta/perfil.test.ts`
Expected: FAIL, porque `datos.puntos` es `undefined`.

- [ ] **Step 3: Ampliar `exportarDatos` en `apps/web/src/lib/cuenta/perfil.ts`**

Agregar al import de `@syntaxerror/db/schema`: `claseInscripciones`, `clases`, `mensajes`, `preguntasProfesor`, `reportes`, `resenasCaso`, `solicitudesDocente` y `transaccionesPuntos`.

Agregar al final del tipo `DatosExportados`, después de `certificados: ...;`:
```ts
  puntos: { caso: string; motivo: string; cantidad: number; creadoEn: Date }[];
  preguntasDocentes: { caso: string; mision: string; texto: string; respuesta: string | null; estado: string; creadaEn: Date }[];
  resenas: { caso: string; estrellas: number; comentario: string | null; creadaEn: Date }[];
  reportes: { tipo: string; descripcion: string; pagina: string; estado: string; creadoEn: Date }[];
  mensajes: { asunto: string; cuerpo: string; leidoEn: Date | null; creadoEn: Date }[];
  clases: { clase: string; estado: string; solicitadaEn: Date }[];
  solicitudesDocente: { estado: string; creadaEn: Date }[];
```

En `exportarDatos`, después del `Promise.all` existente y antes de `await auditar(...)`, agregar:
```ts
  const [puntos, preguntasDocentes, resenas, susReportes, susMensajes, susClases, solicitudes] = await Promise.all([
    db
      .select({ caso: casos.slug, motivo: transaccionesPuntos.motivo, cantidad: transaccionesPuntos.cantidad, creadoEn: transaccionesPuntos.creadoEn })
      .from(transaccionesPuntos)
      .innerJoin(casos, eq(casos.id, transaccionesPuntos.casoId))
      .where(eq(transaccionesPuntos.userId, userId)),
    db
      .select({
        caso: casos.slug,
        mision: preguntasProfesor.mision,
        texto: preguntasProfesor.texto,
        respuesta: preguntasProfesor.respuesta,
        estado: preguntasProfesor.estado,
        creadaEn: preguntasProfesor.creadaEn,
      })
      .from(preguntasProfesor)
      .innerJoin(casos, eq(casos.id, preguntasProfesor.casoId))
      .where(eq(preguntasProfesor.alumnoId, userId)),
    db
      .select({ caso: casos.slug, estrellas: resenasCaso.estrellas, comentario: resenasCaso.comentario, creadaEn: resenasCaso.creadaEn })
      .from(resenasCaso)
      .innerJoin(casos, eq(casos.id, resenasCaso.casoId))
      .where(eq(resenasCaso.userId, userId)),
    db
      .select({ tipo: reportes.tipo, descripcion: reportes.descripcion, pagina: reportes.pagina, estado: reportes.estado, creadoEn: reportes.creadoEn })
      .from(reportes)
      .where(eq(reportes.userId, userId)),
    db
      .select({ asunto: mensajes.asunto, cuerpo: mensajes.cuerpo, leidoEn: mensajes.leidoEn, creadoEn: mensajes.creadoEn })
      .from(mensajes)
      .where(eq(mensajes.userId, userId)),
    db
      .select({ clase: clases.titulo, estado: claseInscripciones.estado, solicitadaEn: claseInscripciones.solicitadaEn })
      .from(claseInscripciones)
      .innerJoin(clases, eq(clases.id, claseInscripciones.claseId))
      .where(eq(claseInscripciones.userId, userId)),
    db
      .select({ estado: solicitudesDocente.estado, creadaEn: solicitudesDocente.creadaEn })
      .from(solicitudesDocente)
      .where(eq(solicitudesDocente.userId, userId)),
  ]);
```

En el objeto que devuelve, después de `certificados: susCertificados,`, agregar:
```ts
    puntos,
    preguntasDocentes,
    resenas,
    reportes: susReportes,
    mensajes: susMensajes,
    clases: susClases,
    solicitudesDocente: solicitudes,
```

- [ ] **Step 4: Verificar que pasa**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/cuenta/perfil.test.ts`
Expected: PASS (el test nuevo y los anteriores).

- [ ] **Step 5: Enlaces en el encabezado, `apps/web/src/components/site-header.tsx`**

Agregar a los imports:
```ts
import { getDb } from "@syntaxerror/db/client";
import { GraduationCap, Mail } from "lucide-react";
import { contarNoLeidos } from "@/lib/mensajes";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";
```
Fusiona el import de `lucide-react` con el existente, que quedaría así: `import { GraduationCap, LayoutDashboard, Mail, Settings, UserRound } from "lucide-react";`.

Después de `const user = session?.user;`, agregar:
```ts
  // Rol y mensajes se leen desde la base: el JWT no se entera de un cambio de rol.
  const actual = user ? await obtenerUsuarioActual() : null;
  const noLeidos = actual ? await contarNoLeidos(getDb(), actual.id) : 0;
```

Reemplazar el bloque `<nav ...>...</nav>` por:
```tsx
          <nav className="flex items-center gap-1" aria-label="Principal">
            <Link className="nav-link" href="/dashboard">
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link className="nav-link" href="/dashboard/mensajes" aria-label={noLeidos > 0 ? `Mensajes, ${noLeidos} sin leer` : "Mensajes"}>
              <Mail size={16} />
              <span className="hidden sm:inline">Mensajes</span>
              {noLeidos > 0 ? <span className="badge">{noLeidos}</span> : null}
            </Link>
            {actual && esDocente(actual) ? (
              <Link className="nav-link" href="/profesor">
                <GraduationCap size={16} />
                <span className="hidden sm:inline">Docencia</span>
              </Link>
            ) : null}
          </nav>
```

Reemplazar la condición `{user.role === "admin" ? (` del menú por `{actual?.rol === "admin" ? (`.

- [ ] **Step 6: Accesos en el panel, `apps/web/src/app/(dashboard)/dashboard/page.tsx`**

Justo después de la sección `Tu nivel` (Task 3), agregar:
```tsx
      <nav className="flex flex-wrap gap-3 text-sm font-bold" aria-label="Comunidad">
        <Link className="text-primary hover:underline" href="/dashboard/preguntas">Tus preguntas a docentes</Link>
        <Link className="text-primary hover:underline" href="/dashboard/clases">Tus clases</Link>
        <Link className="text-primary hover:underline" href="/dashboard/mensajes">Tus mensajes</Link>
      </nav>
```

- [ ] **Step 7: Agregar el fixture `nuevaPagina` a `e2e/tests/fixtures.ts`**

Reemplazar el archivo por:
```ts
import { test as base, type BrowserContext, type Page } from "@playwright/test";

function ipAleatoria(): string {
  const octeto = () => Math.floor(Math.random() * 250) + 1;
  return `10.${octeto()}.${octeto()}.${octeto()}`;
}

// Solo las requests a la app llevan la IP: agregarla a todo (extraHTTPHeaders) rompe el CDN de Pyodide por CORS.
async function conIp(context: BrowserContext, ip: string): Promise<void> {
  await context.route("http://localhost:3000/**", (route) => route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } }));
}

export const test = base.extend<{ ip: string; nuevaPagina: () => Promise<Page> }>({
  ip: async ({}, use) => {
    await use(ipAleatoria());
  },
  context: async ({ context, ip }, use) => {
    await conIp(context, ip);
    await use(context);
  },
  // Otra sesión de navegador en el mismo test, por ejemplo la del docente que responde.
  nuevaPagina: async ({ browser }, use) => {
    const contextos: BrowserContext[] = [];
    await use(async () => {
      const contexto = await browser.newContext({ baseURL: "http://localhost:3000" });
      await conIp(contexto, ipAleatoria());
      contextos.push(contexto);
      return contexto.newPage();
    });
    for (const contexto of contextos) await contexto.close();
  },
});

export { expect, type Page } from "@playwright/test";
```

- [ ] **Step 8: Escribir `e2e/tests/comunidad.spec.ts`**

```ts
import { expect, test, type Page } from "./fixtures";

const MISION_SQL = "/casos/demo-motor/01-clientes-de-regiones";
const CONSULTA_CORRECTA = "SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago';";

async function registrarse(page: Page, nombre: string) {
  await page.goto("/registro");
  await page.locator('input[name="name"]').fill(nombre);
  await page.locator('input[name="email"]').fill(`comunidad-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// El admin de desarrollo lo crea db-setup (SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD).
async function entrarComoAdmin(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@local.test");
  await page.locator('input[name="password"]').fill("admin123456");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("una decisión acertada y una misión aprobada suman puntos en el panel", async ({ page }) => {
  await registrarse(page, "Camila Rojas");
  await page.goto(MISION_SQL);
  await page.getByRole("button", { name: /Le pregunto qué significa activo/ }).click();
  await expect(page.getByText("+5 puntos")).toBeVisible();

  await page.getByLabel("Consulta SQL").fill(CONSULTA_CORRECTA);
  const reportado = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;

  await page.goto("/dashboard");
  await expect(page.getByText("15 puntos")).toBeVisible();
});

test("un reporte se envía con la página desde donde se abrió", async ({ page }) => {
  await registrarse(page, "Tomás Vera");
  await page.goto(MISION_SQL);
  await page.getByRole("link", { name: "Reportar un problema" }).click();
  await expect(page).toHaveURL(/\/reportar\?pagina=%2Fcasos%2Fdemo-motor%2F01-clientes-de-regiones/);
  await expect(page.getByText("Página: /casos/demo-motor/01-clientes-de-regiones")).toBeVisible();
  await page.getByLabel("Un error").check();
  await page.getByLabel("Descripción").fill("La tabla de clientes no se ve completa en el celular.");
  await page.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(page.getByText("Gracias. Lo vamos a revisar.")).toBeVisible();
});

test("una pregunta sin clase la responde administración y quien preguntó ve la respuesta", async ({ page, nuevaPagina }) => {
  await registrarse(page, "Ignacio Soto");
  await page.goto(MISION_SQL);
  await page.getByRole("button", { name: "Preguntar a un docente" }).click();
  const texto = `¿Puedo usar NOT IN para excluir Santiago? (${Date.now()})`;
  await page.getByLabel("Tu pregunta para el equipo docente").fill(texto);
  await page.getByRole("button", { name: "Enviar al docente" }).click();
  await expect(page.getByText("Tu pregunta quedó enviada.", { exact: false })).toBeVisible();

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/profesor/preguntas");
  const tarjeta = admin.locator("li", { hasText: texto });
  await tarjeta.getByLabel("Tu respuesta").fill("Sí: WHERE ciudad NOT IN ('Santiago') también funciona.");
  await tarjeta.getByRole("button", { name: "Enviar respuesta" }).click();
  await expect(tarjeta.getByText("Respondida")).toBeVisible();

  await page.goto("/dashboard/preguntas");
  await expect(page.getByText("Sí: WHERE ciudad NOT IN ('Santiago') también funciona.")).toBeVisible();
});

test("una clase: el docente la crea, la estudiante se une con el código y queda aceptada", async ({ page, nuevaPagina }) => {
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/profesor");
  const titulo = `Clase e2e ${Date.now()}`;
  await admin.getByLabel("Nombre de la clase").fill(titulo);
  await admin.getByRole("button", { name: "Crear clase" }).click();
  await expect(admin).toHaveURL(/\/profesor\/clases\//);
  const codigo = ((await admin.getByTestId("codigo-clase").textContent()) ?? "").trim();
  expect(codigo).toMatch(/^[A-Z2-9]{6}$/);

  await registrarse(page, "Martina Fuentes");
  await page.goto("/dashboard/clases");
  await page.getByLabel("Código de la clase").fill("ZZZZZZ");
  await page.getByRole("button", { name: "Unirme" }).click();
  await expect(page.getByText("No encontramos una clase con ese código.")).toBeVisible();
  await page.getByLabel("Código de la clase").fill(codigo.toLowerCase());
  await page.getByRole("button", { name: "Unirme" }).click();
  await expect(page.getByText(`Tu solicitud para entrar a «${titulo}» quedó enviada.`, { exact: false })).toBeVisible();
  await expect(page.getByText("Por aceptar")).toBeVisible();

  await admin.reload();
  await admin.getByRole("button", { name: "Aceptar a Martina Fuentes" }).click();
  await expect(admin.getByRole("button", { name: "Retirar a Martina Fuentes" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Activa", { exact: true })).toBeVisible();
  await expect(page.locator('a[href="/casos/demo-motor"]')).toBeVisible();
});
```

- [ ] **Step 9: Reseña al completar el caso, `e2e/tests/misiones.spec.ts`**

Al final del test `con sesión: aprueba las tres misiones y completa el caso con su entregable`, después de `await expect(page.getByText("Caso completo", { exact: true })).toBeVisible();`, agregar:
```ts
  await page.reload();
  await page.getByLabel("5 estrellas").check();
  await page.getByLabel("Comentario (opcional)").fill("Muy práctico para aprender SQL.");
  await page.getByRole("button", { name: "Publicar reseña" }).click();
  await expect(page.getByText("Gracias. Tu comentario se publicará cuando lo revisemos.")).toBeVisible();
```

- [ ] **Step 10: Documentar en `README.md`**

Agregar al final:
~~~markdown
## Comunidad

- **Puntos y niveles:**
  - 10 por misión aprobada, 50 por caso completo y 5 por acertar una decisión en la primera respuesta;
  - cada logro suma una sola vez;
  - se sube de nivel cada 100 puntos.
- **Preguntas a docentes:**
  - En cada misión, `Preguntar a un docente` envía la pregunta al docente de la clase del estudiante, si tiene ese caso habilitado. Si no, va a administración.
  - Aviso por email (cola `emails`) y en vivo por socket.io (cola `avisos`, sala `usuario:<id>`).
- **Clases:**
  - Un docente crea la clase desde `/profesor` con una ruta del catálogo y comparte el código de 6 caracteres.
  - Cada estudiante se une en `/dashboard/clases` y el docente acepta cada solicitud.
- **Acceso docente:**
  - Se pide desde `/perfil` y lo aprueba administración: la pantalla llega en la Fase 3c2.
  - En local, `admin@local.test` (clave `admin123456`) ya es admin y puede usar todo lo docente.
- **Reseñas:** quien completa un caso puede dejar de 1 a 5 estrellas y un comentario. El comentario queda oculto hasta que administración lo aprueba.
- **Reportes y mensajes:**
  - `Reportar un problema`, en el pie de página, guarda la página desde donde se envió y avisa a administración por email.
  - Los mensajes internos se leen en `/dashboard/mensajes`.
- **Permisos:** el rol se lee desde la base en cada request, no desde la sesión: un cambio de rol rige al instante y una cuenta eliminada pierde el acceso aunque tenga la sesión abierta en otro dispositivo.
~~~

- [ ] **Step 11: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes (`ia`, `queue`, `engines`, `content`, `db`, `ui`, `web` y `worker`).

Run: `docker compose up -d --build && npm run test:e2e`
Expected: `17 passed` (los 13 anteriores y los 4 de comunidad; la reseña va dentro de un test existente de misiones).

Run: `npm run test:e2e`
Expected: otra vez `17 passed`. La base de desarrollo conserva los datos de la primera corrida y los tests no dependen de eso.

Run: `docker compose down && npm run test:e2e:prod`
Expected: `17 passed` contra el build de producción.

Run: `for p in /casos/demo-motor /casos/demo-motor/01-clientes-de-regiones; do curl -s -o /dev/null localhost:3000$p; curl -s -D - -o /dev/null localhost:3000$p | grep -i x-nextjs-cache; done`
Expected: `x-nextjs-cache: HIT` dos veces. El caso y la misión siguen estáticos con las reseñas, los puntos y la pregunta a docentes.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml down`

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/components/site-header.tsx "apps/web/src/app/(dashboard)/dashboard/page.tsx" apps/web/src/lib/cuenta/perfil.ts apps/web/src/lib/cuenta/perfil.test.ts e2e README.md
git commit -m "test(e2e): comunidad con puntos, reportes, preguntas a docentes y clases

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué queda para la Fase 3c2 (Admin)

Estas funciones ya existen con tests; en la 3c2 les falta la pantalla de administración:
- `decidirSolicitud` (acceso docente);
- `moderarComentario` (reseñas);
- `crearMensaje`, para responder un reporte y marcarlo resuelto.

La 3c2 también suma:
- la vista de administración de todas las preguntas y de la caché del tutor;
- las métricas por misión y la bitácora;
- la gestión de usuarios y casos.
