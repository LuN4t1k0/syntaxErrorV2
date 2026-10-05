# Fase 8b: Probadores y orden libre. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la administración pueda liberar el orden de las rutas:
- a **probadores** elegidos, para que prueben antes que el resto;
- o a **todos** los estudiantes, con un interruptor general.

Quien tiene el orden libre hace las rutas en el orden que quiera, sin esperar la misión ni el caso anterior.

**Architecture:**
- **Decisiones del 2026-10-05:**
  - las dos cosas: probador por persona e interruptor general;
  - el orden libre de un probador vale en todas las rutas;
  - las rutas en beta van en la Fase 8c.
- **Base de datos** (migración `0010_orden_libre`):
  - `users.probador` (booleano, falso por defecto);
  - la tabla `ajustes` (`clave`, `valor` JSON, quién y cuándo), para el interruptor `orden_libre` y futuros ajustes.
- **Un solo punto de decisión:** `opcionesDeProgreso(db, userId)` (`lib/progreso/orden.ts`) arma las opciones del servicio de progreso con `ordenLibre = probador || orden libre para todos`.
  - Las cuatro rutas que registran avance o entregables la usan: `/api/progreso` (GET y POST), `/api/progreso/sync` y `/api/entregables`.
  - Con `ordenLibre`, `registrarIntento` no exige la misión anterior y `casoPendiente` no exige el caso anterior (así también `enviarEntregable`).
- **El navegador no muestra candados.**
  - El progreso de un caso devuelve `ordenLibre`, y la misión deja de mostrar "primero aprueba la misión...". El aviso del caso ya no aparece porque `bloqueadoPor` llega en `null`.
  - El resumen del mapa (`/api/progreso/resumen`) también devuelve `ordenLibre`. Con eso, `armarMapa` deja lo no empezado como disponible y no como `LOCKED`, y lo empezado muestra su avance.
- **Certificados:** se ganan igual. El de un caso pide su entregable aprobado y el de la ruta, todos los casos completos.
- **Administración:**
  - en la ficha de un usuario, la sección **Probador**: una casilla y "Guardar probador". Un admin también puede marcarse a sí mismo;
  - en la lista de usuarios, la etiqueta "Probador";
  - en la portada de la administración, **Orden de las rutas**: "Liberar el orden para todos" o "Volver al orden normal", con confirmación.
  - Las APIs son `PATCH /api/admin/usuarios/[id]` con `{ probador }` (la misma que cambia el rol) y `PATCH /api/admin/ajustes` con `{ ordenLibre }`. Las dos piden admin y quedan en la bitácora (`tester_changed` y `setting_changed`).
  - En la bitácora, `target_id` es un uuid, así que la clave del ajuste va en `metadata`.

**Tech Stack:** Drizzle (migración), Next 15, Vitest 4 y Playwright 1.55.

**Spec:** pedido del 2026-10-05: "liberar todos los cursos para que los alumnos puedan hacer la ruta en el orden que quieran... en el perfil del administrador... necesito que alumnos puedan probar esto antes que el resto".

## Global Constraints

- **El servidor manda:** el navegador solo deja de mostrar lo que el servidor ya no exige.
- **Entorno:** todo se ejecuta con `docker compose run --rm tools ...`. Los paquetes son `@syntaxerror/db` y `web`.
- **Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Que alguien sin orden libre se salte el orden:** el servidor sigue respondiendo 409. Probado en `servicio.test.ts` (la misma persona sin las opciones sigue bloqueada) y en `probadores.spec.ts` (409 antes de marcarla).
2. **El interruptor general en los e2e:** no se prueba en el navegador, porque las e2e corren en paralelo y soltaría los bloqueos de otras pruebas. Se prueba en `ajustes.test.ts`, `orden.test.ts` y `api/admin/ajustes/route.test.ts`.
3. **Repetir un cambio** (marcar dos veces, encender dos veces) no duplica la bitácora. Probado en `usuarios.test.ts` y `ajustes.test.ts`.
4. **Un no-admin** no puede marcar probadores ni cambiar ajustes (401 y 403). Probado en las rutas.
5. **El mapa con orden libre** no muestra `LOCKED`. Probado en `mapa.test.ts` y `probadores.spec.ts`.

---

### Task 1: La base y los servicios

**Files:**
- Modify: `packages/db/src/schema.ts`, `packages/db/src/audit.ts`, `apps/web/src/lib/admin/usuarios.ts`, `apps/web/src/lib/admin/etiquetas.ts`
- Create: `packages/db/drizzle/0010_orden_libre.sql` (generada), `apps/web/src/lib/ajustes.ts`, `apps/web/src/lib/progreso/orden.ts`
- Test: `apps/web/src/lib/ajustes.test.ts`, `apps/web/src/lib/progreso/orden.test.ts`, `apps/web/src/lib/admin/usuarios.test.ts`

**Interfaces:**
- Produces:
  - `users.probador` y la tabla `ajustes`;
  - las acciones `tester_changed` y `setting_changed`, y el tipo de destino `"setting"`;
  - `ordenLibreParaTodos(db)` y `cambiarOrdenLibreParaTodos(db, { admin, activo }, meta)`;
  - `tieneOrdenLibre(db, userId)` y `opcionesDeProgreso(db, userId)`;
  - `cambiarProbador(db, { admin, userId, probador }, meta)`, y `FilaUsuario.probador`;
  - `OpcionesRequisitos.ordenLibre?: boolean`, que la Task 2 usa en el servicio.

- [ ] **Step 1: El esquema y la migración**

En `packages/db/src/schema.ts`:
1. En `users`, después de `portafolioPublico`, agrega:
```ts
    // Probador: hace las rutas en el orden que quiera y entra a las rutas en beta. Lo marca un admin.
    probador: boolean("probador").notNull().default(false),
```
2. Antes de `export const auditLog`, agrega:
```ts
// Ajustes generales de la plataforma que cambia un admin, por ejemplo el orden libre de las rutas para todos.
export const ajustes = pgTable("ajustes", {
  clave: text("clave").primaryKey(),
  valor: jsonb("valor").notNull(),
  actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  actualizadoPor: uuid("actualizado_por").references(() => users.id, { onDelete: "set null" }),
});
```

Run: `docker compose run --rm tools sh -c "cd packages/db && npx drizzle-kit generate --name orden_libre"`
Expected: `drizzle/0010_orden_libre.sql` (más su snapshot y el `_journal.json`), con este SQL:
```sql
CREATE TABLE IF NOT EXISTS "ajustes" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_por" uuid
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "probador" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_actualizado_por_users_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
```

En `packages/db/src/audit.ts`:
1. Al final de `AUDIT_ACTIONS`, agrega `"tester_changed"` y `"setting_changed"`.
2. `AuditTargetType` suma `| "setting"`.

En `apps/web/src/lib/admin/etiquetas.ts`, al final de `ETIQUETAS_ACCION`, agrega:
```ts
  tester_changed: "Probador cambiado",
  setting_changed: "Ajuste cambiado",
```

- [ ] **Step 2: Escribir las pruebas**

`apps/web/src/lib/ajustes.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ajustes, auditLog, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import { cambiarOrdenLibreParaTodos, ordenLibreParaTodos } from "./ajustes";

const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
});
afterAll(() => close());

describe("orden libre para todos", () => {
  it("parte apagado; un admin lo enciende y lo apaga, y queda en la bitácora", async () => {
    const [admin] = await db.insert(users).values({ email: "admin@correo.cl", role: "admin" }).returning({ id: users.id, email: users.email });
    expect(await ordenLibreParaTodos(db)).toBe(false);

    await cambiarOrdenLibreParaTodos(db, { admin, activo: true }, SIN_META);
    expect(await ordenLibreParaTodos(db)).toBe(true);
    const [fila] = await db.select().from(ajustes);
    expect(fila).toMatchObject({ clave: "orden_libre", valor: true, actualizadoPor: admin.id });

    await cambiarOrdenLibreParaTodos(db, { admin, activo: true }, SIN_META);
    await cambiarOrdenLibreParaTodos(db, { admin, activo: false }, SIN_META);
    expect(await ordenLibreParaTodos(db)).toBe(false);
    // Repetir el mismo valor no deja otra entrada en la bitácora.
    expect((await db.select({ action: auditLog.action, metadata: auditLog.metadata }).from(auditLog)).map((entrada) => [entrada.action, entrada.metadata])).toEqual([
      ["setting_changed", { clave: "orden_libre", anterior: false, nuevo: true }],
      ["setting_changed", { clave: "orden_libre", anterior: true, nuevo: false }],
    ]);
  });
});
```

`apps/web/src/lib/progreso/orden.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { cambiarOrdenLibreParaTodos } from "@/lib/ajustes";
import { SIN_META } from "@/lib/cuenta/meta";
import { tieneOrdenLibre } from "./orden";

const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
});
afterAll(() => close());

describe("tieneOrdenLibre", () => {
  it("solo los probadores, salvo que el orden libre esté encendido para todos", async () => {
    const [estudiante, probador, admin] = await db
      .insert(users)
      .values([{ email: "ana@correo.cl" }, { email: "beto@correo.cl", probador: true }, { email: "admin@correo.cl", role: "admin" }])
      .returning({ id: users.id, email: users.email });
    expect(await tieneOrdenLibre(db, estudiante.id)).toBe(false);
    expect(await tieneOrdenLibre(db, probador.id)).toBe(true);

    await cambiarOrdenLibreParaTodos(db, { admin, activo: true }, SIN_META);
    expect(await tieneOrdenLibre(db, estudiante.id)).toBe(true);
  });
});
```

En `apps/web/src/lib/admin/usuarios.test.ts`, suma `cambiarProbador` al import de `./usuarios` y agrega al final:
```ts
describe("cambiarProbador", () => {
  it("marca y desmarca a un probador, deja la bitácora y no repite si no cambia", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl");
    expect(await cambiarProbador(db, { admin, userId: ana.id, probador: true }, SIN_META)).toBe("ok");
    expect((await detalleUsuario(db, ana.id))?.probador).toBe(true);
    expect((await listarUsuarios(db, { busqueda: "ana", pagina: 1 })).filas[0].probador).toBe(true);
    expect(await cambiarProbador(db, { admin, userId: ana.id, probador: true }, SIN_META)).toBe("ok");
    expect(await cambiarProbador(db, { admin, userId: ana.id, probador: false }, SIN_META)).toBe("ok");
    expect(await acciones()).toEqual([
      ["tester_changed", { probador: true, email: "ana@correo.cl" }],
      ["tester_changed", { probador: false, email: "ana@correo.cl" }],
    ]);
    expect(await cambiarProbador(db, { admin, userId: crypto.randomUUID(), probador: true }, SIN_META)).toBe("no_existe");
  });
});
```

- [ ] **Step 3: Correr y ver que fallan**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/db migrate && cd apps/web && npx vitest run src/lib/ajustes.test.ts src/lib/progreso/orden.test.ts src/lib/admin/usuarios.test.ts"`
Expected: FAIL. No existen `./ajustes`, `./orden` ni `cambiarProbador`.

- [ ] **Step 4: Implementar**

`apps/web/src/lib/ajustes.ts`:
```ts
import { eq } from "drizzle-orm";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import type { AppDb, DbClient } from "@syntaxerror/db/client";
import { ajustes } from "@syntaxerror/db/schema";
import type { MetaRequest } from "@/lib/cuenta/meta";

// Ajustes generales que cambia un admin. Cada uno guarda su valor como JSON.
export const AJUSTE_ORDEN_LIBRE = "orden_libre";

// Encendido, ningún estudiante tiene bloqueos de orden en las rutas (los probadores ya no los tienen).
export async function ordenLibreParaTodos(db: DbClient): Promise<boolean> {
  const [fila] = await db.select({ valor: ajustes.valor }).from(ajustes).where(eq(ajustes.clave, AJUSTE_ORDEN_LIBRE));
  return fila?.valor === true;
}

export async function cambiarOrdenLibreParaTodos(db: AppDb, { admin, activo }: { admin: { id: string; email: string }; activo: boolean }, meta: MetaRequest): Promise<void> {
  await db.transaction(async (tx) => {
    const anterior = await ordenLibreParaTodos(tx);
    if (anterior === activo) return;
    const ahora = new Date();
    await tx
      .insert(ajustes)
      .values({ clave: AJUSTE_ORDEN_LIBRE, valor: activo, actualizadoEn: ahora, actualizadoPor: admin.id })
      .onConflictDoUpdate({ target: ajustes.clave, set: { valor: activo, actualizadoEn: ahora, actualizadoPor: admin.id } });
    await insertAuditLogEntry(tx, {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "setting_changed",
      // target_id es un uuid: la clave del ajuste va en metadata.
      targetType: "setting",
      metadata: { clave: AJUSTE_ORDEN_LIBRE, anterior, nuevo: activo },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}
```

`apps/web/src/lib/progreso/orden.ts`:
```ts
import { eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { ordenLibreParaTodos } from "@/lib/ajustes";
import { incluirBorradores } from "@/lib/contenido";
import type { OpcionesRequisitos } from "./requisitos";

// Sin bloqueos de orden: los probadores, o todos si un admin encendió el orden libre para todos.
export async function tieneOrdenLibre(db: DbClient, userId: string): Promise<boolean> {
  const [fila] = await db.select({ probador: users.probador }).from(users).where(eq(users.id, userId));
  if (fila?.probador) return true;
  return ordenLibreParaTodos(db);
}

// Las opciones con que el servicio de progreso aplica el orden para esta persona.
export async function opcionesDeProgreso(db: DbClient, userId: string): Promise<OpcionesRequisitos> {
  return { incluirBorradores: incluirBorradores(), ordenLibre: await tieneOrdenLibre(db, userId) };
}
```

En `apps/web/src/lib/progreso/requisitos.ts`:
1. `OpcionesRequisitos` queda:
```ts
// ordenLibre: sin bloqueos de orden (probadores, o todos si un admin lo encendió).
export type OpcionesRequisitos = { incluirBorradores: boolean; ordenLibre?: boolean };
```
2. La primera línea de `casoPendiente` es:
```ts
  if (opciones.ordenLibre) return null;
```

`apps/web/src/lib/admin/usuarios.ts` completo:
```ts
import { count, desc, eq, ilike, or } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { users } from "@syntaxerror/db/schema";
import { normalizeEmail } from "@/app/api/auth/register/service";
import { listarCertificados } from "@/lib/certificados/servicio";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import type { Nivel } from "@/lib/puntos/niveles";
import { obtenerNivel } from "@/lib/puntos/servicio";
import { listarCasosDelUsuario, type CasoDelUsuario } from "@/lib/progreso/servicio";
import { esRol, type Rol } from "@/lib/roles";
import { armarPagina, desplazamiento, TAMANO_PAGINA, type Pagina } from "./paginacion";

export type FilaUsuario = { id: string; nombre: string | null; email: string; rol: Rol; verificado: boolean; probador: boolean; creadoEn: Date };
export type DetalleUsuario = FilaUsuario & { usuarioPublico: string | null; casos: CasoDelUsuario[]; nivel: Nivel; certificados: number };
export type Admin = { id: string; email: string };

const columnas = { id: users.id, nombre: users.name, email: users.email, rol: users.role, emailVerificado: users.emailVerified, probador: users.probador, creadoEn: users.createdAt };

function aFila(fila: { id: string; nombre: string | null; email: string; rol: string; emailVerificado: Date | null; probador: boolean; creadoEn: Date }): FilaUsuario {
  return { id: fila.id, nombre: fila.nombre, email: fila.email, rol: esRol(fila.rol) ? fila.rol : "student", verificado: fila.emailVerificado !== null, probador: fila.probador, creadoEn: fila.creadoEn };
}

export function patronLiteral(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}%`;
}

export async function listarUsuarios(db: AppDb, { busqueda, pagina }: { busqueda?: string; pagina: number }): Promise<Pagina<FilaUsuario>> {
  const texto = busqueda?.trim();
  const filtro = texto ? or(ilike(users.email, patronLiteral(texto)), ilike(users.name, patronLiteral(texto))) : undefined;
  const [filas, [conteo]] = await Promise.all([
    db.select(columnas).from(users).where(filtro).orderBy(desc(users.createdAt), desc(users.id)).limit(TAMANO_PAGINA).offset(desplazamiento(pagina)),
    db.select({ total: count() }).from(users).where(filtro),
  ]);
  return armarPagina(filas.map(aFila), Number(conteo?.total ?? 0), pagina);
}

export async function detalleUsuario(db: AppDb, id: string): Promise<DetalleUsuario | null> {
  const [fila] = await db.select({ ...columnas, usuarioPublico: users.usuario }).from(users).where(eq(users.id, id));
  if (!fila) return null;
  const [casos, nivel, certificados] = await Promise.all([listarCasosDelUsuario(db, id), obtenerNivel(db, id), listarCertificados(db, id)]);
  return { ...aFila(fila), usuarioPublico: fila.usuarioPublico, casos, nivel, certificados: certificados.length };
}

export async function cambiarRol(db: AppDb, { admin, userId, rol }: { admin: Admin; userId: string; rol: Rol }, meta: MetaRequest): Promise<"ok" | "no_existe" | "propio"> {
  if (userId === admin.id) return "propio";
  return db.transaction(async (tx) => {
    const [actual] = await tx.select({ rol: users.role, email: users.email }).from(users).where(eq(users.id, userId)).for("update");
    if (!actual) return "no_existe";
    if (actual.rol === rol) return "ok";
    await tx.update(users).set({ role: rol, updatedAt: new Date() }).where(eq(users.id, userId));
    await insertAuditLogEntry(tx, {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "role_changed",
      targetType: "user",
      targetId: userId,
      metadata: { rolAnterior: actual.rol, rolNuevo: rol, email: actual.email },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return "ok";
  });
}

// Un probador hace las rutas en el orden que quiera y entra a las rutas en beta, para probarlas antes que el resto.
export async function cambiarProbador(db: AppDb, { admin, userId, probador }: { admin: Admin; userId: string; probador: boolean }, meta: MetaRequest): Promise<"ok" | "no_existe"> {
  return db.transaction(async (tx) => {
    const [actual] = await tx.select({ probador: users.probador, email: users.email }).from(users).where(eq(users.id, userId)).for("update");
    if (!actual) return "no_existe";
    if (actual.probador === probador) return "ok";
    await tx.update(users).set({ probador, updatedAt: new Date() }).where(eq(users.id, userId));
    await insertAuditLogEntry(tx, {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "tester_changed",
      targetType: "user",
      targetId: userId,
      metadata: { probador, email: actual.email },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return "ok";
  });
}

export async function eliminarUsuario(
  db: AppDb,
  { admin, userId, confirmacion }: { admin: Admin; userId: string; confirmacion: string },
  { encolar, meta }: { encolar: Encolar; meta: MetaRequest }
): Promise<"ok" | "no_existe" | "propio" | "confirmacion_incorrecta"> {
  if (userId === admin.id) return "propio";
  const [cuenta] = await db.select({ email: users.email, nombre: users.name }).from(users).where(eq(users.id, userId));
  if (!cuenta) return "no_existe";
  if (normalizeEmail(confirmacion) !== normalizeEmail(cuenta.email)) return "confirmacion_incorrecta";
  const eliminada = await db.transaction(async (tx) => {
    const filas = await tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
    if (filas.length === 0) return false;
    await insertAuditLogEntry(tx, {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "account_deleted",
      targetType: "user",
      targetId: userId,
      metadata: { porAdmin: true, email: cuenta.email },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return true;
  });
  if (!eliminada) return "no_existe";
  await encolar({ tipo: "cuenta-eliminada", para: cuenta.email, nombre: cuenta.nombre });
  return "ok";
}
```

- [ ] **Step 5: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/ajustes.test.ts src/lib/progreso/orden.test.ts src/lib/admin && npx tsc --noEmit"`
Expected: PASS y sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add packages/db apps/web/src/lib/ajustes.ts apps/web/src/lib/ajustes.test.ts apps/web/src/lib/progreso/orden.ts apps/web/src/lib/progreso/orden.test.ts apps/web/src/lib/progreso/requisitos.ts apps/web/src/lib/admin
git commit -m "feat(admin): probadores y orden libre para todos, en la base y sus servicios

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: El servidor y el navegador sin bloqueos

**Files:**
- Modify: `apps/web/src/lib/progreso/servicio.ts`, `apps/web/src/app/api/progreso/route.ts`, `apps/web/src/app/api/progreso/sync/route.ts`, `apps/web/src/app/api/entregables/route.ts`, `apps/web/src/app/api/progreso/resumen/route.ts`, `apps/web/src/lib/progreso/cliente.ts`, `apps/web/src/components/mision/mision-provider.tsx`, `apps/web/src/lib/rutas/mapa.ts`, `apps/web/src/components/rutas/mapa-ruta.tsx`
- Test: `apps/web/src/lib/progreso/servicio.test.ts`, `apps/web/src/app/api/progreso/route.test.ts`, `apps/web/src/app/api/progreso/resumen/route.test.ts`, `apps/web/src/lib/progreso/cliente.test.ts`, `apps/web/src/lib/rutas/mapa.test.ts`

**Interfaces:**
- Consumes: `opcionesDeProgreso`, `tieneOrdenLibre` y `OpcionesRequisitos.ordenLibre` (Task 1).
- Produces:
  - `ProgresoCaso.ordenLibre` y `ProgresoVisible.ordenLibre`;
  - `/api/progreso/resumen` devuelve `{ casos, ordenLibre }`;
  - `armarMapa(piezas, avance, { ordenLibre })`.

- [ ] **Step 1: Escribir las pruebas**

En `apps/web/src/lib/progreso/servicio.test.ts`:
1. Después de "rechaza intentos en un caso cuyo caso anterior en la ruta no está completo", agrega:
```ts
  it("con orden libre no exige la misión ni el caso anteriores, y el progreso lo avisa", async () => {
    const { userId, rutaId } = await prepararCaso();
    const [siguiente] = await db
      .insert(casos)
      .values({ slug: "stock", titulo: "Stock", cargo: "A", empresa: "E", entregable: "R", misiones: [{ slug: "s1", titulo: "S1", tareas: ["x"] }] })
      .returning({ id: casos.id });
    await db.insert(rutaCasos).values({ rutaId, casoId: siguiente.id, orden: 1 });
    const libre = { incluirBorradores: false, ordenLibre: true };
    expect(await registrarIntento(db, userId, intento("m2", "t3"), libre)).toMatchObject({ misionAprobada: true });
    expect(await registrarIntento(db, userId, { caso: "stock", mision: "s1", tarea: "x", aprobada: true }, libre)).toMatchObject({ misionAprobada: true });
    expect(await obtenerProgresoCaso(db, userId, "stock", libre)).toMatchObject({ bloqueadoPor: null, ordenLibre: true });
    // Sin orden libre, la misma persona sigue con el orden normal.
    expect(await obtenerProgresoCaso(db, userId, "stock")).toMatchObject({ bloqueadoPor: { slug: "ventas" }, ordenLibre: false });
  });
```
2. En "aplica los válidos, cuenta los rechazados...", el objeto esperado suma `ordenLibre: false,` después de `bloqueadoPor: null,`.

En `apps/web/src/app/api/progreso/route.test.ts`, en "registra un intento y devuelve el progreso del caso", el objeto esperado suma `ordenLibre: false,` después de `bloqueadoPor: null,`.

`apps/web/src/app/api/progreso/resumen/route.test.ts` completo:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { GET } = await import("./route");
const { POST } = await import("../route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("GET /api/progreso/resumen", () => {
  it("sin sesión responde 401", async () => {
    expect((await GET()).status).toBe(401);
  });

  it("devuelve el avance de cada caso que la persona empezó, por slug", async () => {
    const [usuario] = await db.insert(users).values({ email: "alumna@correo.cl" }).returning({ id: users.id });
    await db.insert(casos).values({
      slug: "ventas",
      titulo: "Ventas",
      cargo: "Analista junior",
      empresa: "Distribuidora",
      entregable: "Repositorio",
      misiones: [
        { slug: "m1", titulo: "M1", tareas: ["t1"] },
        { slug: "m2", titulo: "M2", tareas: ["t2"] },
      ],
    });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
    expect(await (await GET()).json()).toEqual({ casos: {}, ordenLibre: false });

    const aprobar = { caso: "ventas", mision: "m1", tarea: "t1", aprobada: true };
    await POST(new Request("http://localhost:3000/api/progreso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(aprobar) }));
    const respuesta = await GET();
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    expect(await respuesta.json()).toEqual({ casos: { ventas: { aprobadas: 1, completo: false } }, ordenLibre: false });
  });

  it("avisa si la persona tiene el orden libre (probador)", async () => {
    const [probador] = await db.insert(users).values({ email: "probador@correo.cl", probador: true }).returning({ id: users.id });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(probador.id);
    expect(await (await GET()).json()).toEqual({ casos: {}, ordenLibre: true });
  });
});
```

En `apps/web/src/lib/progreso/cliente.test.ts`, en "une lo del servidor con lo pendiente en localStorage":
- la respuesta del servidor suma `ordenLibre: true,`;
- lo esperado suma `ordenLibre: true,`.

En "sin sesión usa solo localStorage", lo esperado suma `ordenLibre: false,`.

En `apps/web/src/lib/rutas/mapa.test.ts`, antes de "un caso con todas sus misiones pero sin el entregable aprobado queda en revisión", agrega:
```ts
  it("con orden libre nada queda bloqueado: lo empezado muestra su avance y el resto queda disponible", () => {
    const { etapas } = armarMapa(RUTA, { "herramientas-del-oficio": { aprobadas: 2, completo: false }, "clases-de-sql": { aprobadas: 5, completo: false } }, { ordenLibre: true });
    const estados = Object.fromEntries(etapas.flatMap((etapa) => [etapa.clases, etapa.caso]).filter((p) => p !== null).map((p) => [p.slug, [p.estado, p.aprobadas]]));
    expect(estados).toEqual({
      "herramientas-del-oficio": ["en_curso", 2],
      "clases-de-excel": ["disponible", 0],
      "despachos-rapidos": ["disponible", 0],
      "clases-de-sql": ["disponible", 5],
      "minimarkets-del-sur": ["disponible", 0],
    });
  });
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/progreso src/lib/rutas src/app/api/progreso"`
Expected: FAIL. El progreso no trae `ordenLibre` y el mapa todavía bloquea.

- [ ] **Step 3: El servicio**

En `apps/web/src/lib/progreso/servicio.ts`:
1. `ProgresoCaso` queda:
```ts
// ordenLibre avisa al navegador que esta persona no tiene bloqueos de orden (ni de misión ni de caso).
export type ProgresoCaso = { misiones: Record<string, EstadoMision>; entregable: string | null; revision: RevisionEntregable | null; completo: boolean; bloqueadoPor: CasoCorto | null; ordenLibre: boolean };
```
2. En `registrarIntento`, el comentario y la condición del bloqueo de misión quedan:
```ts
    // El servidor es la autoridad sobre el orden: la misión anterior aprobada y el caso anterior completo (salvo
    // con orden libre).
    const indice = caso.misiones.findIndex((candidata) => candidata.slug === mision.slug);
    if (indice > 0 && !opciones.ordenLibre) {
```
3. Al final del objeto que devuelve `obtenerProgresoCaso`, después de `bloqueadoPor,`, agrega:
```ts
    ordenLibre: Boolean(opciones.ordenLibre),
```

- [ ] **Step 4: Las rutas**

En las cuatro llamadas que hoy pasan `{ incluirBorradores: incluirBorradores() }`, pasa `await opcionesDeProgreso(db, userId)` (o `getDb()` donde la ruta no tiene `db`), importado de `@/lib/progreso/orden`. Quita el import de `incluirBorradores` donde ya no se use:
- `apps/web/src/app/api/progreso/route.ts`: `obtenerProgresoCaso` (GET) y `registrarIntento` (POST);
- `apps/web/src/app/api/progreso/sync/route.ts`: `sincronizarIntentos`;
- `apps/web/src/app/api/entregables/route.ts`: `enviarEntregable`.

`apps/web/src/app/api/progreso/resumen/route.ts` completo:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { tieneOrdenLibre } from "@/lib/progreso/orden";
import { listarCasosDelUsuario } from "@/lib/progreso/servicio";
import type { AvanceCaso } from "@/lib/rutas/mapa";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

// El avance de la persona en cada caso que empezó, para el mapa de la ruta (la página de la ruta es estática), y si
// tiene el orden libre, para no mostrarle bloqueos.
export async function GET() {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const casos: Record<string, AvanceCaso> = {};
  for (const caso of await listarCasosDelUsuario(getDb(), userId)) casos[caso.slug] = { aprobadas: caso.misionesAprobadas, completo: caso.completo };
  return NextResponse.json({ casos, ordenLibre: await tieneOrdenLibre(getDb(), userId) }, { headers: { "Cache-Control": "no-store" } });
}
```

- [ ] **Step 5: El navegador**

En `apps/web/src/lib/progreso/cliente.ts`:
1. `ProgresoVisible` suma, después de `bloqueadoPor`:
```ts
  // Sin bloqueos de orden para esta persona (probador, o todos si un admin lo encendió).
  ordenLibre: boolean;
```
2. `cargarProgreso` devuelve también `ordenLibre: servidor?.ordenLibre ?? false,`.

En `apps/web/src/components/mision/mision-provider.tsx`, el bloqueo de misión queda:
```tsx
      else if (!progreso.ordenLibre && anterior && progreso.misiones[anterior.slug]?.estado !== "aprobada") setBloqueo({ tipo: "mision", mision: { slug: anterior.slug, titulo: anterior.titulo } });
```

`apps/web/src/lib/rutas/mapa.ts` completo:
```ts
// El mapa de una ruta como un `git log --graph`: cada clase es una rama que sale de main y se fusiona en el caso que
// la aplica. Sin imports: este módulo corre en el navegador.

export type PiezaRuta = { slug: string; titulo: string; tipo: "caso" | "clases"; empresa: string; unidades: number };
export type AvanceCaso = { aprobadas: number; completo: boolean };
export type EstadoPieza = "completo" | "en_curso" | "en_revision" | "bloqueado" | "disponible";
export type PiezaMapa = PiezaRuta & { hash: string; numeroCaso: number | null; aprobadas: number; estado: EstadoPieza };
export type Etapa = { rama: string | null; clases: PiezaMapa | null; caso: PiezaMapa | null };
export type ResumenRuta = { leccionesAprobadas: number; lecciones: number; casosCompletos: number; casos: number; completa: boolean };

// Un hash corto y estable para mostrar junto a cada "commit" (FNV-1a de 32 bits).
export function hashCorto(texto: string): string {
  let hash = 0x811c9dc5;
  for (const caracter of texto) {
    hash ^= caracter.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

function rama(slug: string): string {
  return `clases/${slug.replace(/^clases-de-/, "")}`;
}

// Sin avance (sin sesión) todo queda disponible. Con avance, la ruta se recorre en orden: lo completo, después la
// primera pieza sin completar (en curso, o en revisión si es un caso con todas sus misiones y falta el entregable)
// y el resto bloqueado, igual que los requisitos del servidor. Con orden libre (probadores, o todos si un admin lo
// encendió), el resto queda disponible.
export function armarMapa(
  piezas: PiezaRuta[],
  avance: Record<string, AvanceCaso> | null,
  { ordenLibre = false }: { ordenLibre?: boolean } = {}
): { etapas: Etapa[]; resumen: ResumenRuta } {
  let actualEncontrada = false;
  let casosAntes = 0;
  const conEstado = piezas.map((pieza): PiezaMapa => {
    const propio = avance?.[pieza.slug];
    const aprobadas = Math.min(propio?.aprobadas ?? 0, pieza.unidades);
    let estado: EstadoPieza = "disponible";
    if (avance) {
      if (propio?.completo) estado = "completo";
      else if (!actualEncontrada) {
        actualEncontrada = true;
        estado = pieza.tipo === "caso" && pieza.unidades > 0 && aprobadas >= pieza.unidades ? "en_revision" : "en_curso";
      } else estado = ordenLibre ? "disponible" : "bloqueado";
    }
    const numeroCaso = pieza.tipo === "caso" ? casosAntes++ : null;
    return { ...pieza, hash: hashCorto(pieza.slug), numeroCaso, aprobadas, estado };
  });

  const etapas: Etapa[] = [];
  let pendiente: PiezaMapa | null = null;
  for (const pieza of conEstado) {
    if (pieza.tipo === "clases") {
      if (pendiente) etapas.push({ rama: rama(pendiente.slug), clases: pendiente, caso: null });
      pendiente = pieza;
    } else {
      etapas.push({ rama: pendiente ? rama(pendiente.slug) : null, clases: pendiente, caso: pieza });
      pendiente = null;
    }
  }
  if (pendiente) etapas.push({ rama: rama(pendiente.slug), clases: pendiente, caso: null });

  const clases = conEstado.filter((pieza) => pieza.tipo === "clases");
  const casos = conEstado.filter((pieza) => pieza.tipo === "caso");
  return {
    etapas,
    resumen: {
      leccionesAprobadas: clases.reduce((total, pieza) => total + pieza.aprobadas, 0),
      lecciones: clases.reduce((total, pieza) => total + pieza.unidades, 0),
      casosCompletos: casos.filter((pieza) => pieza.estado === "completo").length,
      casos: casos.length,
      completa: conEstado.length > 0 && conEstado.every((pieza) => pieza.estado === "completo"),
    },
  };
}
```

En `apps/web/src/components/rutas/mapa-ruta.tsx`:
1. `conAvance` queda:
```tsx
  const conAvance = pieza.estado === "en_curso" || pieza.estado === "en_revision" || ((pieza.estado === "bloqueado" || pieza.estado === "disponible") && pieza.aprobadas > 0);
```
2. Después de `const [avance, setAvance] = ...`, agrega `const [ordenLibre, setOrdenLibre] = useState(false);`.
3. La respuesta se lee como `{ casos: Record<string, AvanceCaso>; ordenLibre?: boolean }`, y después de `setAvance(datos.casos);` va `setOrdenLibre(Boolean(datos.ordenLibre));`.
4. El mapa se arma con `armarMapa(piezas, avance, { ordenLibre })`.

- [ ] **Step 6: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/progreso src/lib/rutas src/app/api && npx tsc --noEmit"`
Expected: PASS y sin errores de tipos.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/progreso apps/web/src/lib/rutas apps/web/src/app/api/progreso apps/web/src/app/api/entregables apps/web/src/components/mision/mision-provider.tsx apps/web/src/components/rutas/mapa-ruta.tsx
git commit -m "feat(progreso): con orden libre el servidor no exige el orden y el navegador no muestra bloqueos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: La administración

**Files:**
- Modify: `apps/web/src/app/api/admin/usuarios/[id]/route.ts`, `apps/web/src/app/(dashboard)/admin/page.tsx`, `apps/web/src/app/(dashboard)/admin/usuarios/[id]/page.tsx`, `apps/web/src/app/(dashboard)/admin/usuarios/page.tsx`, `README.md`
- Create: `apps/web/src/app/api/admin/ajustes/route.ts`, `apps/web/src/components/admin/formulario-probador.tsx`, `apps/web/src/components/admin/interruptor-orden-libre.tsx`
- Test: `apps/web/src/app/api/admin/usuarios/[id]/route.test.ts`, `apps/web/src/app/api/admin/ajustes/route.test.ts`, `e2e/tests/probadores.spec.ts`

**Interfaces:**
- Consumes: `cambiarProbador` y `cambiarOrdenLibreParaTodos` (Task 1).
- Produces:
  - `PATCH /api/admin/usuarios/[id]` con `{ probador }`, y `PATCH /api/admin/ajustes` con `{ ordenLibre }`;
  - `<FormularioProbador userId probadorActual />` y `<InterruptorOrdenLibre activo />`.

- [ ] **Step 1: Escribir las pruebas**

Al final del `describe` de `apps/web/src/app/api/admin/usuarios/[id]/route.test.ts`, agrega:
```ts
  it("administración marca y desmarca probadores, incluida su propia cuenta", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl", "student");
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(admin);
    expect((await pedir("PATCH", ana.id, { probador: "si" })).status).toBe(400);
    expect((await pedir("PATCH", ana.id, { probador: true })).status).toBe(200);
    expect((await pedir("PATCH", admin.id, { probador: true })).status).toBe(200);
    const filas = await db.select({ email: users.email, probador: users.probador }).from(users);
    expect(Object.fromEntries(filas.map((fila) => [fila.email, fila.probador]))).toEqual({ "admin@correo.cl": true, "ana@correo.cl": true });
    expect((await pedir("PATCH", crypto.randomUUID(), { probador: true })).status).toBe(404);
  });
```

`apps/web/src/app/api/admin/ajustes/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { ordenLibreParaTodos } from "@/lib/ajustes";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const { PATCH } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function persona(email: string, rol: Rol) {
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

const cambiar = (cuerpo: unknown) =>
  PATCH(new Request("http://localhost:3000/api/admin/ajustes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("PATCH /api/admin/ajustes", () => {
  it("solo administración enciende y apaga el orden libre para todos", async () => {
    expect((await cambiar({ ordenLibre: true })).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("rosa@correo.cl", "teacher"));
    expect((await cambiar({ ordenLibre: true })).status).toBe(403);

    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("admin@correo.cl", "admin"));
    expect((await cambiar({ ordenLibre: "si" })).status).toBe(400);
    expect((await cambiar({ ordenLibre: true })).status).toBe(200);
    expect(await ordenLibreParaTodos(db)).toBe(true);
    expect((await cambiar({ ordenLibre: false })).status).toBe(200);
    expect(await ordenLibreParaTodos(db)).toBe(false);
  });
});
```

`e2e/tests/probadores.spec.ts`:
```ts
import { expect, test } from "./fixtures";
import { entrarComoAdmin, registrarse } from "./progreso";

const MISION = "/casos/minimarkets-del-sur/02-filtrar";

test("un admin marca a una persona como probadora y ella hace la ruta en el orden que quiera", async ({ page, ip, nuevaPagina }) => {
  const email = await registrarse(page, "Josefina Lagos");
  const aprobarFiltro = () =>
    page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso: "minimarkets-del-sur", mision: "02-filtrar", tarea: "lacteos-caros", aprobada: true },
    });

  // Sin ser probadora: el Caso 2 está bloqueado (falta el Caso 1) y su segunda misión también (falta la primera).
  await page.goto(MISION);
  await expect(page.getByRole("status").filter({ hasText: "se habilita al completar" }).first()).toBeVisible();
  expect((await aprobarFiltro()).status()).toBe(409);

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto(`/admin/usuarios?q=${encodeURIComponent(email)}`);
  await admin.getByRole("link", { name: email }).click();
  await admin.getByLabel("Probador", { exact: false }).check();
  await admin.getByRole("button", { name: "Guardar probador" }).click();
  await expect(admin.getByText("Ahora es probador.")).toBeVisible();
  await admin.goto(`/admin/usuarios?q=${encodeURIComponent(email)}`);
  await expect(admin.getByRole("row", { name: email }).getByText("Probador")).toBeVisible();

  // Como probadora: sin avisos de bloqueo, el servidor acepta la misión y el mapa no muestra nada bloqueado.
  await page.goto(MISION);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Validar" }).first()).toBeEnabled();
  await expect(page.getByRole("status").filter({ hasText: /se habilita al completar|primero aprueba la misión/ })).toHaveCount(0);
  expect((await aprobarFiltro()).status()).toBe(200);
  await page.goto("/rutas/data-analyst");
  const mapa = page.getByRole("list", { name: "Mapa de la ruta Data Analyst" });
  await expect(mapa.getByRole("link", { name: /Minimarkets del Sur.*: disponible$/ })).toBeVisible();
  await expect(mapa.getByText("LOCKED")).toHaveCount(0);
});

test("la administración muestra el interruptor del orden de las rutas", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Orden de las rutas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Liberar el orden para todos" })).toBeVisible();
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/app/api/admin"`
Expected: FAIL. `{ probador }` responde 400 y no existe `api/admin/ajustes`.

- [ ] **Step 3: Las APIs**

`apps/web/src/app/api/admin/usuarios/[id]/route.ts` completo:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { cambiarProbador, cambiarRol, eliminarUsuario } from "@/lib/admin/usuarios";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { encolarSinFallar } from "@/lib/emails";
import { exigirAdmin } from "@/lib/permisos";
import { ROLES } from "@/lib/roles";
import { esUuid } from "@/lib/uuid";

const rolSchema = z.object({ rol: z.enum(ROLES) });
// Un admin también puede marcarse a sí mismo como probador, para recorrer las rutas en beta.
const probadorSchema = z.object({ probador: z.boolean() });
const eliminarSchema = z.object({ confirmacion: z.string().min(1).max(320) });
const noExiste = () => NextResponse.json({ error: "no_existe" }, { status: 404 });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirAdmin();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return noExiste();
  const cuerpo = await request.json().catch(() => null);
  const probador = probadorSchema.safeParse(cuerpo);
  if (probador.success) {
    const resultado = await cambiarProbador(getDb(), { admin: usuario, userId: id, probador: probador.data.probador }, metaDeRequest(request));
    return resultado === "no_existe" ? noExiste() : NextResponse.json({ ok: true });
  }
  const parsed = rolSchema.safeParse(cuerpo);
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await cambiarRol(getDb(), { admin: usuario, userId: id, rol: parsed.data.rol }, metaDeRequest(request));
  if (resultado === "no_existe") return noExiste();
  if (resultado === "propio") return NextResponse.json({ error: "propio" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirAdmin();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return noExiste();
  const parsed = eliminarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await eliminarUsuario(getDb(), { admin: usuario, userId: id, confirmacion: parsed.data.confirmacion }, { encolar: encolarSinFallar, meta: metaDeRequest(request) });
  if (resultado === "no_existe") return noExiste();
  if (resultado !== "ok") return NextResponse.json({ error: resultado }, { status: 400 });
  return NextResponse.json({ ok: true });
}
```

`apps/web/src/app/api/admin/ajustes/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { cambiarOrdenLibreParaTodos } from "@/lib/ajustes";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { exigirAdmin } from "@/lib/permisos";

const esquema = z.object({ ordenLibre: z.boolean() });

// Ajustes generales de la plataforma. Por ahora, el orden libre de las rutas para todos los estudiantes.
export async function PATCH(request: Request) {
  const { usuario, error } = await exigirAdmin();
  if (error) return error;
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  await cambiarOrdenLibreParaTodos(getDb(), { admin: usuario, activo: parsed.data.ordenLibre }, metaDeRequest(request));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Las pantallas**

`apps/web/src/components/admin/formulario-probador.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

// Marca a una persona como probadora: hace las rutas en el orden que quiera, para probarlas antes que el resto.
export function FormularioProbador({ userId, probadorActual }: { userId: string; probadorActual: boolean }) {
  const router = useRouter();
  const [probador, setProbador] = useState(probadorActual);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson(`/api/admin/usuarios/${userId}`, "PATCH", { probador });
    setEnviando(false);
    setAviso(respuesta.ok ? (probador ? "Ahora es probador." : "Ya no es probador.") : "No se pudo guardar.");
    if (respuesta.ok) router.refresh();
  }

  return (
    <form className="grid gap-3" onSubmit={guardar}>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={probador} onChange={(evento) => setProbador(evento.target.checked)} className="mt-1 size-4 accent-primary" />
        <span>
          <span className="font-bold">Probador</span>
          <span className="block text-muted-foreground">Hace las rutas en el orden que quiera, sin esperar la misión ni el caso anterior. Los certificados se ganan igual: piden los entregables aprobados.</span>
        </span>
      </label>
      <div>
        <Button type="submit" disabled={enviando || probador === probadorActual}>
          Guardar probador
        </Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
```

`apps/web/src/components/admin/interruptor-orden-libre.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

// Quita los bloqueos de orden de las rutas a todos los estudiantes. Se pide confirmar, porque cambia la experiencia de
// todas las personas de inmediato.
export function InterruptorOrdenLibre({ activo }: { activo: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function cambiar() {
    const pregunta = activo ? "¿Volver al orden normal para todos los estudiantes?" : "¿Liberar el orden de todas las rutas para todos los estudiantes?";
    if (!window.confirm(pregunta)) return;
    setEnviando(true);
    const respuesta = await enviarJson("/api/admin/ajustes", "PATCH", { ordenLibre: !activo });
    setEnviando(false);
    setAviso(respuesta.ok ? null : "No se pudo cambiar.");
    if (respuesta.ok) router.refresh();
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm leading-6">
        {activo ? (
          <>
            <span className="badge mr-2">Orden libre</span>
            Todos los estudiantes hacen las rutas en el orden que quieran.
          </>
        ) : (
          "Orden normal: cada caso se habilita al completar el anterior, y cada misión al aprobar la anterior. Los probadores no tienen estos bloqueos."
        )}
      </p>
      <div>
        <Button type="button" variant={activo ? "secondary" : "primary"} disabled={enviando} onClick={() => void cambiar()}>
          {activo ? "Volver al orden normal" : "Liberar el orden para todos"}
        </Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </div>
  );
}
```

`apps/web/src/app/(dashboard)/admin/usuarios/[id]/page.tsx` completo:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { EliminarUsuario } from "@/components/admin/eliminar-usuario";
import { FormularioProbador } from "@/components/admin/formulario-probador";
import { FormularioRol } from "@/components/admin/formulario-rol";
import { adminDePagina } from "@/lib/admin/acceso";
import { ETIQUETAS_ROL } from "@/lib/admin/etiquetas";
import { detalleUsuario } from "@/lib/admin/usuarios";
import { esUuid } from "@/lib/uuid";

export const metadata = { title: "Usuario · Administración" };

export default async function UsuarioAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await adminDePagina(`/admin/usuarios/${id}`);
  if (!esUuid(id)) notFound();
  const usuario = await detalleUsuario(getDb(), id);
  if (!usuario) notFound();
  const esPropia = usuario.id === admin.id;
  return (
    <main className="grid gap-6">
      <nav className="text-sm" aria-label="Volver"><Link className="font-bold text-primary hover:underline" href="/admin/usuarios">← Usuarios</Link></nav>
      <header className="grid gap-1">
        <h1 className="text-3xl font-black">{usuario.nombre ?? usuario.email}</h1>
        <p className="text-muted-foreground">{`${usuario.email} · ${ETIQUETAS_ROL[usuario.rol]}${usuario.probador ? " · probador" : ""} · ${usuario.verificado ? "email confirmado" : "email sin confirmar"}`}</p>
        <p className="text-sm text-muted-foreground">{`Nivel ${usuario.nivel.nivel} (${usuario.nivel.puntos} puntos) · ${usuario.certificados} ${usuario.certificados === 1 ? "certificado" : "certificados"}`}</p>
      </header>
      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Casos</h2>
        {usuario.casos.length === 0 ? <p className="text-muted-foreground">No empezó ningún caso.</p> : (
          <ul className="grid gap-2 text-sm">{usuario.casos.map((caso) => <li key={caso.slug}>{`${caso.titulo}: ${caso.completo ? "completo" : `${caso.misionesAprobadas}/${caso.totalMisiones} misiones`}`}</li>)}</ul>
        )}
      </section>
      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Rol</h2>
        {esPropia ? <p className="text-sm text-muted-foreground">Es tu cuenta: tu rol no se cambia desde aquí.</p> : <FormularioRol userId={usuario.id} rolActual={usuario.rol} />}
      </section>
      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Probador</h2>
        <FormularioProbador userId={usuario.id} probadorActual={usuario.probador} />
      </section>
      {esPropia ? null : (
        <section className="card grid gap-3 border-destructive/40 p-5">
          <h2 className="text-xl font-black">Eliminar cuenta</h2>
          <p className="text-sm text-muted-foreground">Para solicitudes de eliminación por derechos ARCO. No se puede deshacer, y la persona recibe un aviso por email.</p>
          <EliminarUsuario userId={usuario.id} />
        </section>
      )}
    </main>
  );
}
```

`apps/web/src/app/(dashboard)/admin/page.tsx` completo:
```tsx
import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { InterruptorOrdenLibre } from "@/components/admin/interruptor-orden-libre";
import { adminDePagina } from "@/lib/admin/acceso";
import { resumenAdmin } from "@/lib/admin/resumen";
import { ordenLibreParaTodos } from "@/lib/ajustes";

export const metadata = { title: "Administración" };

function Tarjeta({ href, valor, texto, alerta = false }: { href: string; valor: number; texto: string; alerta?: boolean }) {
  return <Link href={href} className={alerta && valor > 0 ? "card grid gap-1 border-primary p-4 hover:border-primary" : "card grid gap-1 p-4 hover:border-primary"}><span className="text-3xl font-black">{valor}</span><span className="text-sm text-muted-foreground">{texto}</span></Link>;
}

export default async function AdminPage() {
  await adminDePagina("/admin");
  const resumen = await resumenAdmin(getDb());
  const ordenLibre = await ordenLibreParaTodos(getDb());
  return (
    <main className="grid gap-8">
      <h1 className="text-3xl font-black">Administración</h1>
      <section className="grid gap-3"><h2 className="text-xl font-black">Por revisar</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Tarjeta href="/admin/comunidad" valor={resumen.solicitudesPendientes} texto="Solicitudes de acceso docente" alerta /><Tarjeta href="/admin/comunidad" valor={resumen.comentariosPendientes} texto="Comentarios de reseñas" alerta /><Tarjeta href="/admin/reportes" valor={resumen.reportesPendientes} texto="Reportes pendientes" alerta /><Tarjeta href="/profesor/entregables" valor={resumen.entregablesPorRevisar} texto="Entregables por revisar" alerta /><Tarjeta href="/profesor/preguntas" valor={resumen.preguntasSinDocente} texto="Preguntas sin docente" alerta /></div></section>
      <section className="card grid gap-3 p-5"><h2 className="text-xl font-black">Orden de las rutas</h2><InterruptorOrdenLibre activo={ordenLibre} /><p className="text-sm text-muted-foreground">Para liberar el orden solo a algunas personas, márcalas como probadoras desde <Link className="font-bold text-primary hover:underline" href="/admin/usuarios">Usuarios</Link>.</p></section>
      <section className="grid gap-3"><h2 className="text-xl font-black">Actividad</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Tarjeta href="/admin/usuarios" valor={resumen.usuarios} texto="Cuentas" /><Tarjeta href="/admin/usuarios" valor={resumen.nuevosSemana} texto="Cuentas nuevas esta semana" /><Tarjeta href="/admin/usuarios" valor={resumen.docentes} texto="Docentes" /><Tarjeta href="/admin/preguntas?vista=tutor" valor={resumen.preguntasTutorSemana} texto="Preguntas al tutor esta semana" /></div></section>
    </main>
  );
}
```

En `apps/web/src/app/(dashboard)/admin/usuarios/page.tsx`, la celda del rol queda:
```tsx
                <td className="p-2">{ETIQUETAS_ROL[fila.rol]}{fila.probador ? <span className="badge ml-2">Probador</span> : null}</td>
```

En `README.md`:
1. En "Orden obligatorio", después de "El servidor rechaza con 409 los intentos fuera de orden.", agrega:
```markdown
  - Excepción: los probadores, o todos si un admin libera el orden (ver Administración).
```
2. En "Administración", después de la línea de **Usuarios**, agrega:
```markdown
- **Probadores y orden de las rutas:** en la ficha de un usuario se le marca como **probador**: hace las rutas en el orden que quiera, sin esperar la misión ni el caso anterior, para probarlas antes que el resto (un admin también puede marcarse a sí mismo). En la portada de la administración, **Orden de las rutas** libera el orden para todos los estudiantes, con confirmación. El servidor aplica el orden en `registrarIntento` y `enviarEntregable` según `opcionesDeProgreso` (`lib/progreso/orden.ts`), y avisa `ordenLibre` al navegador para no mostrar bloqueos. Los certificados se ganan igual: piden los entregables aprobados. Los dos cambios quedan en la bitácora.
```

- [ ] **Step 5: Correr todo**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/app/api/admin && npx tsc --noEmit"`
Expected: PASS.

Run: `npm run test:e2e -- tests/probadores.spec.ts --repeat-each 2`
Expected: `4 passed`.

Run: `docker compose run --rm tools pnpm -r --if-present test`
Expected: PASS (web 368).

Run: `npm run test:e2e`
Expected: `59 passed`, dos corridas seguidas.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/api/admin" "apps/web/src/app/(dashboard)/admin" apps/web/src/components/admin/formulario-probador.tsx apps/web/src/components/admin/interruptor-orden-libre.tsx e2e/tests/probadores.spec.ts README.md
git commit -m "feat(admin): marcar probadores y liberar el orden de las rutas desde la administracion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Fase 8c: rutas en beta.** El estado `beta` publica la ruta en producción, pero oculta:
- no aparece en `/rutas`, en el buscador ni en el mapa del sitio;
- solo los probadores pueden entrar y avanzar, y la ven en su panel;
- el resto ve "Próximamente".

Con eso, la ruta Data Analyst pasa de `borrador` a `beta` para que la prueben antes de publicarla.
