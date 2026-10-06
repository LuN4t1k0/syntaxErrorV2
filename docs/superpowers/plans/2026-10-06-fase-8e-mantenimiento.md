# Fase 8e: Mantenimiento para administración y docentes. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que las listas de administración y del panel docente sigan siendo manejables cuando crezcan, y que sus acciones se entiendan y se confirmen (hallazgos 3 y 4 de la auditoría de experiencia del 2026-10-05).

**Architecture:**
- **Paginación donde faltaba,** de 25 en 25, con el mismo `Pagina<T>` de las demás listas. Cada lista gana una función paginada nueva junto a la que ya existía, que se mantiene para quien la usa:
  - **Solicitudes docentes y comentarios de reseñas** (`/admin/comunidad`): cada lista con su propia página (`?solicitudes=` y `?comentarios=`). `Paginacion` acepta el nombre del parámetro y una etiqueta.
  - **Entregables por revisar** (`/profesor/entregables`): con búsqueda por estudiante (`?q=`, nombre o email). El filtro de quién puede revisar qué se aplica antes de cortar la página.
  - **Preguntas del docente** (`/profesor/preguntas`): pestañas Todas, Pendientes y Respondidas. Todas va por defecto y muestra primero las pendientes; así una pregunta recién respondida sigue a la vista con su "Respondida".
  - **Clases del docente** (`/profesor`): pestañas Activas y Archivadas, con su cantidad.
- **Archivar clases.** Se usa `clases.estado`, sin migración. `cambiarEstadoClase` y `PATCH /api/profesor/clases/[id]` (`{ estado: "activa" | "archivada" }`) los puede usar solo la docente de la clase. Una clase archivada sale del panel y su código deja de aceptar estudiantes, porque `unirseAClase` ya exigía `activa`. El avance de sus estudiantes no cambia, y se puede restaurar.
- **Acciones con ícono, texto y confirmación:**
  - `BotonAccion` acepta `icono` **por nombre** (`aprobar`, `rechazar`, `ocultar`, `borrar`, `archivar`, `restaurar`). Se usa desde páginas del servidor, y un componente de lucide es una función que no puede pasar al navegador. TypeScript no lo detecta: lo detectó la e2e.
  - Piden confirmación: rechazar una solicitud, borrar de la caché y archivar una clase.
  - Ocultar un comentario se mantiene en vez de "Eliminar": se puede revertir y deja registro.
  - El modal `Confirmacion` parte con el foco en **Cancelar**: con el teclado se llega directo a los botones y lo seguro es no hacer nada.
- **El mapa guía a un solo lugar** (de la revisión de la 8d). La acción "Empezar →" o "Continuar →" va solo en la tarjeta donde está la persona. Sin sesión, o con orden libre, las 11 tarjetas decían "Empezar →".
- **Las e2e buscan su entregable.** La base de e2e (la misma del desarrollo local) acumula entregables pendientes, 177 el 2026-10-06. Con la paginación, `aprobarEntregable`, `completarCaso` y `recorrido.spec` entran con `?q=<email>`.

**Tech Stack:** Next 15, React 19, Drizzle, lucide-react, Vitest 4 y Playwright 1.55.

**Spec:** auditoría de experiencia del 2026-10-05 (hallazgos 3 y 4) y revisión de la 8d.

## Global Constraints

- **Plataformas:** debe funcionar en el teléfono y en los temas claro y oscuro.
- **Acciones:** cada acción lleva ícono y texto. Las que no se deshacen fácilmente piden confirmar.
- **Entorno:** todo se ejecuta con `docker compose run --rm tools ...`. El paquete de la app se llama `web`.
- **Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Otra docente intenta archivar una clase ajena:** recibe 404 y la clase no cambia. Probado en `servicio.test.ts` y `api/profesor/clases/[id]/route.test.ts`.
2. **Una clase archivada** no acepta el código. Probado en `servicio.test.ts`.
3. **Un entregable de la página 2** queda alcanzable con la búsqueda. Probado en `revision.test.ts` y en las e2e que aprueban entregables.
4. **Responder una pregunta** la deja a la vista en "Todas". Lo prueba `comunidad.spec.ts`, sin cambios.
5. **Un ícono pasado como componente** desde una página del servidor rompe la página. Por eso va por nombre, y lo prueban `mantenimiento.spec.ts` y `admin.spec.ts`.

---

### Task 1: Las listas paginadas y archivar clases

**Files:**
- Modify: `apps/web/src/lib/admin/moderacion.ts`, `apps/web/src/lib/preguntas-profesor.ts`, `apps/web/src/lib/entregables/revision.ts`, `apps/web/src/lib/clases/servicio.ts`
- Create: `apps/web/src/app/api/profesor/clases/[id]/route.ts`
- Test: `apps/web/src/lib/admin/moderacion.test.ts`, `apps/web/src/lib/preguntas-profesor.test.ts`, `apps/web/src/lib/entregables/revision.test.ts`, `apps/web/src/lib/clases/servicio.test.ts`, `apps/web/src/app/api/profesor/clases/[id]/route.test.ts`

**Interfaces:**
- Produces:
  - `paginaSolicitudesPendientes(db, { pagina })` y `paginaComentariosPendientes(db, { pagina })`;
  - `paginaPreguntasParaDocente(db, actor, { estado?, pagina })`;
  - `paginaEntregablesPorRevisar(db, revisor, { busqueda?, pagina })`;
  - `paginaClasesDelProfesor(db, profesorId, { estado, pagina })`, que suma `{ activas, archivadas }`, y `cambiarEstadoClase(db, { profesorId, claseId, estado })`;
  - `PATCH /api/profesor/clases/[id]`.

- [ ] **Step 1: Escribir las pruebas**

Al final de cada archivo, agrega su bloque y suma las funciones nuevas a su import.

`apps/web/src/lib/admin/moderacion.test.ts` (import: `paginaComentariosPendientes`, `paginaSolicitudesPendientes`):
```ts
describe("listas paginadas de moderación", () => {
  it("solicitudes y comentarios pendientes, de 25 en 25 y del más antiguo al más nuevo", async () => {
    const [caso] = await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [] }).returning({ id: casos.id });
    for (let numero = 0; numero < 27; numero++) {
      const persona = await db.insert(users).values({ email: `p${numero}@correo.cl`, name: `P${numero}` }).returning({ id: users.id });
      const creadaEn = new Date(Date.UTC(2026, 0, 1, 0, numero));
      await db.insert(solicitudesDocente).values({ userId: persona[0].id, creadaEn });
      await db.insert(resenasCaso).values({ userId: persona[0].id, casoId: caso.id, estrellas: 5, comentario: `C${numero}`, estadoComentario: "pendiente", creadaEn });
    }
    const primera = await paginaSolicitudesPendientes(db, { pagina: 1 });
    expect([primera.total, primera.paginas, primera.filas.length, primera.filas[0].email]).toEqual([27, 2, 25, "p0@correo.cl"]);
    expect((await paginaSolicitudesPendientes(db, { pagina: 2 })).filas.map((fila) => fila.email)).toEqual(["p25@correo.cl", "p26@correo.cl"]);
    const comentarios = await paginaComentariosPendientes(db, { pagina: 2 });
    expect([comentarios.total, comentarios.filas.map((fila) => fila.comentario)]).toEqual([27, ["C25", "C26"]]);
  });
});
```

`apps/web/src/lib/preguntas-profesor.test.ts` (import: `paginaPreguntasParaDocente`):
```ts
describe("preguntas del docente por estado", () => {
  it("separa pendientes y respondidas, con su total", async () => {
    const { ana, admin } = await escenario();
    const primera = await preguntar(ana);
    await preguntar(ana);
    if (!primera.ok) throw new Error("no se creó");
    await responderPregunta(db, { preguntaId: primera.id, respuesta: "Usa WHERE.", actor: admin }, { ...deps, meta: SIN_META });
    const pendientes = await paginaPreguntasParaDocente(db, admin, { estado: "pendiente", pagina: 1 });
    const respondidas = await paginaPreguntasParaDocente(db, admin, { estado: "respondida", pagina: 1 });
    expect([pendientes.total, pendientes.filas.map((fila) => fila.estado)]).toEqual([1, ["pendiente"]]);
    expect([respondidas.total, respondidas.filas.map((fila) => fila.respuesta)]).toEqual([1, ["Usa WHERE."]]);
    const todas = await paginaPreguntasParaDocente(db, admin, { pagina: 1 });
    expect(todas.filas.map((fila) => fila.estado)).toEqual(["pendiente", "respondida"]);
  });
});
```

`apps/web/src/lib/entregables/revision.test.ts` (import: `paginaEntregablesPorRevisar`):
```ts
describe("entregables por revisar, paginados y con búsqueda", () => {
  it("busca por email o nombre del estudiante, sin importar mayúsculas", async () => {
    const { admin } = await escenario();
    expect((await paginaEntregablesPorRevisar(db, admin, { busqueda: "ANA", pagina: 1 })).filas.map((fila) => fila.estudiante.email)).toEqual(["ana@correo.cl"]);
    expect((await paginaEntregablesPorRevisar(db, admin, { busqueda: "ana@correo", pagina: 1 })).total).toBe(1);
    expect((await paginaEntregablesPorRevisar(db, admin, { busqueda: "nadie", pagina: 1 })).total).toBe(0);
    expect(await paginaEntregablesPorRevisar(db, admin, { pagina: 1 })).toMatchObject({ total: 1, paginas: 1, pagina: 1 });
  });
});
```

`apps/web/src/lib/clases/servicio.test.ts` (import: `cambiarEstadoClase`, `paginaClasesDelProfesor`):
```ts
describe("archivar clases", () => {
  it("la docente archiva y restaura su clase; archivada no recibe estudiantes nuevos; otra docente no puede", async () => {
    const { docenteId, otraId, anaId, clase } = await escenario();
    expect(await cambiarEstadoClase(db, { profesorId: otraId, claseId: clase.id, estado: "archivada" })).toBe(false);
    expect(await cambiarEstadoClase(db, { profesorId: docenteId, claseId: clase.id, estado: "archivada" })).toBe(true);
    const activas = await paginaClasesDelProfesor(db, docenteId, { estado: "activa", pagina: 1 });
    const archivadas = await paginaClasesDelProfesor(db, docenteId, { estado: "archivada", pagina: 1 });
    expect([activas.total, archivadas.total, archivadas.filas[0].titulo, archivadas.archivadas]).toEqual([0, 1, "3°A", 1]);
    expect((await unirseAClase(db, { userId: anaId, codigo: clase.codigo }, { encolar })).ok).toBe(false);
    expect(await cambiarEstadoClase(db, { profesorId: docenteId, claseId: clase.id, estado: "activa" })).toBe(true);
    expect((await paginaClasesDelProfesor(db, docenteId, { estado: "activa", pagina: 1 })).total).toBe(1);
  });
});
```

`apps/web/src/app/api/profesor/clases/[id]/route.test.ts`:
```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clases, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const { PATCH } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function persona(email: string, rol: Rol) {
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

const cambiar = (id: string, cuerpo: unknown) =>
  PATCH(new Request(`http://localhost:3000/api/profesor/clases/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }), {
    params: Promise.resolve({ id }),
  });

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("PATCH /api/profesor/clases/[id]", () => {
  it("la docente archiva y restaura su clase; otra docente recibe 404 y sin sesión 401", async () => {
    const rosa = await persona("rosa@correo.cl", "teacher");
    const otra = await persona("otra@correo.cl", "teacher");
    const [ruta] = await db.insert(rutas).values({ slug: "r", titulo: "R", cargo: "A", descripcion: "R" }).returning({ id: rutas.id });
    const [clase] = await db.insert(clases).values({ profesorId: rosa.id, rutaId: ruta.id, titulo: "3°A", codigo: "ABC234" }).returning({ id: clases.id });
    const estado = async () => (await db.select({ estado: clases.estado }).from(clases).where(eq(clases.id, clase.id)))[0].estado;

    expect((await cambiar(clase.id, { estado: "archivada" })).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(otra);
    expect((await cambiar(clase.id, { estado: "archivada" })).status).toBe(404);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(rosa);
    expect((await cambiar(clase.id, { estado: "borrada" })).status).toBe(400);
    expect((await cambiar(clase.id, { estado: "archivada" })).status).toBe(200);
    expect(await estado()).toBe("archivada");
    expect((await cambiar(clase.id, { estado: "activa" })).status).toBe(200);
    expect(await estado()).toBe("activa");
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/admin/moderacion.test.ts src/lib/preguntas-profesor.test.ts src/lib/entregables/revision.test.ts src/lib/clases/servicio.test.ts src/app/api/profesor/clases"`
Expected: FAIL. No existen las funciones nuevas ni la ruta.

- [ ] **Step 3: Implementar**

`apps/web/src/lib/admin/moderacion.ts`:
1. Antes de `resolverSolicitudDocente`, agrega:
```ts
// La lista de la administración, de 25 en 25 (la de arriba la usan las pruebas y quien necesite todas).
export async function paginaSolicitudesPendientes(db: AppDb, { pagina }: { pagina: number }): Promise<Pagina<SolicitudPendiente>> {
  const filtro = eq(solicitudesDocente.estado, "pendiente");
  const [filas, [conteo]] = await Promise.all([
    db
      .select({ id: solicitudesDocente.id, userId: solicitudesDocente.userId, nombre: users.name, email: users.email, creadaEn: solicitudesDocente.creadaEn })
      .from(solicitudesDocente)
      .innerJoin(users, eq(users.id, solicitudesDocente.userId))
      .where(filtro)
      .orderBy(asc(solicitudesDocente.creadaEn))
      .limit(TAMANO_PAGINA)
      .offset(desplazamiento(pagina)),
    db.select({ total: count() }).from(solicitudesDocente).where(filtro),
  ]);
  return armarPagina(filas, Number(conteo?.total ?? 0), pagina);
}
```
2. Antes de `listarReportes`, agrega:
```ts
export async function paginaComentariosPendientes(db: AppDb, { pagina }: { pagina: number }): Promise<Pagina<ComentarioPendiente>> {
  const filtro = eq(resenasCaso.estadoComentario, "pendiente");
  const [filas, [conteo]] = await Promise.all([
    db
      .select({ id: resenasCaso.id, casoSlug: casos.slug, casoTitulo: casos.titulo, nombre: users.name, email: users.email, estrellas: resenasCaso.estrellas, comentario: resenasCaso.comentario, creadaEn: resenasCaso.creadaEn })
      .from(resenasCaso)
      .innerJoin(casos, eq(casos.id, resenasCaso.casoId))
      .innerJoin(users, eq(users.id, resenasCaso.userId))
      .where(filtro)
      .orderBy(asc(resenasCaso.creadaEn))
      .limit(TAMANO_PAGINA)
      .offset(desplazamiento(pagina)),
    db.select({ total: count() }).from(resenasCaso).where(filtro),
  ]);
  const comentarios = filas.map(({ casoSlug, casoTitulo, comentario, ...fila }) => ({ ...fila, caso: { slug: casoSlug, titulo: casoTitulo }, comentario: comentario ?? "" }));
  return armarPagina(comentarios, Number(conteo?.total ?? 0), pagina);
}
```

`apps/web/src/lib/preguntas-profesor.ts`:
1. Importa `count` de `drizzle-orm` y `import { armarPagina, desplazamiento, TAMANO_PAGINA, type Pagina } from "@/lib/admin/paginacion";`.
2. `listar` recibe `{ limite = 100, desde = 0 }` y termina en `.limit(limite).offset(desde)`:
```ts
async function listar(db: AppDb, filtro: SQL | undefined, { limite = 100, desde = 0 }: { limite?: number; desde?: number } = {}): Promise<FilaPregunta[]> {
```
3. Desde `preguntasParaDocente` hasta el final del archivo queda:
```ts
function deDocente(actor: { id: string; rol: Rol }): SQL | undefined {
  const propias = eq(preguntasProfesor.profesorId, actor.id);
  return actor.rol === "admin" ? or(propias, isNull(preguntasProfesor.profesorId)) : propias;
}

export function preguntasParaDocente(db: AppDb, actor: { id: string; rol: Rol }): Promise<FilaPregunta[]> {
  return listar(db, deDocente(actor));
}

// El panel del docente, de 25 en 25: todas (las pendientes primero), o solo pendientes o respondidas.
export async function paginaPreguntasParaDocente(
  db: AppDb,
  actor: { id: string; rol: Rol },
  { estado, pagina }: { estado?: "pendiente" | "respondida"; pagina: number }
): Promise<Pagina<FilaPregunta>> {
  const filtro = and(deDocente(actor), estado ? eq(preguntasProfesor.estado, estado) : undefined);
  const [filas, [conteo]] = await Promise.all([
    listar(db, filtro, { limite: TAMANO_PAGINA, desde: desplazamiento(pagina) }),
    db.select({ total: count() }).from(preguntasProfesor).where(filtro),
  ]);
  return armarPagina(filas, Number(conteo?.total ?? 0), pagina);
}
```

`apps/web/src/lib/entregables/revision.ts`:
1. Importa `import { armarPagina, desplazamiento, TAMANO_PAGINA, type Pagina } from "@/lib/admin/paginacion";`.
2. Después de `listarEntregablesPorRevisar`, agrega:
```ts
// La lista del docente, de 25 en 25 y con búsqueda por estudiante (nombre o email): con muchos pendientes, así se
// encuentra el de una persona. El filtro de quién puede revisar qué se hace antes de cortar la página.
export async function paginaEntregablesPorRevisar(db: AppDb, revisor: Revisor, { busqueda, pagina }: { busqueda?: string; pagina: number }): Promise<Pagina<FilaEntregable>> {
  const texto = busqueda?.trim().toLowerCase() ?? "";
  const todas = (await listarEntregablesPorRevisar(db, revisor)).filter(
    (fila) => !texto || fila.estudiante.email.toLowerCase().includes(texto) || (fila.estudiante.nombre ?? "").toLowerCase().includes(texto)
  );
  return armarPagina(todas.slice(desplazamiento(pagina), desplazamiento(pagina) + TAMANO_PAGINA), todas.length, pagina);
}
```

`apps/web/src/lib/clases/servicio.ts`:
1. Importa `import { armarPagina, desplazamiento, TAMANO_PAGINA, type Pagina } from "@/lib/admin/paginacion";`.
2. `clasesDelProfesor` y lo que sigue, hasta el final de `resumir`, queda:
```ts
export async function clasesDelProfesor(db: AppDb, profesorId: string): Promise<ResumenClase[]> {
  const filas = await db
    .select({ id: clases.id, titulo: clases.titulo, codigo: clases.codigo, estado: clases.estado, ruta: rutas.titulo })
    .from(clases)
    .innerJoin(rutas, eq(rutas.id, clases.rutaId))
    .where(eq(clases.profesorId, profesorId))
    .orderBy(desc(clases.creadaEn));
  return resumir(db, filas);
}

// Las clases del panel docente: activas o archivadas, de 25 en 25, más cuántas hay de cada una (para las pestañas).
export async function paginaClasesDelProfesor(
  db: AppDb,
  profesorId: string,
  { estado, pagina }: { estado: "activa" | "archivada"; pagina: number }
): Promise<Pagina<ResumenClase> & { activas: number; archivadas: number }> {
  const filtro = and(eq(clases.profesorId, profesorId), eq(clases.estado, estado));
  const [filas, conteos] = await Promise.all([
    db
      .select({ id: clases.id, titulo: clases.titulo, codigo: clases.codigo, estado: clases.estado, ruta: rutas.titulo })
      .from(clases)
      .innerJoin(rutas, eq(rutas.id, clases.rutaId))
      .where(filtro)
      .orderBy(desc(clases.creadaEn))
      .limit(TAMANO_PAGINA)
      .offset(desplazamiento(pagina)),
    db.select({ estado: clases.estado, total: count() }).from(clases).where(eq(clases.profesorId, profesorId)).groupBy(clases.estado),
  ]);
  const cuantas = (cual: string) => Number(conteos.find((conteo) => conteo.estado === cual)?.total ?? 0);
  return { ...armarPagina(await resumir(db, filas), cuantas(estado), pagina), activas: cuantas("activa"), archivadas: cuantas("archivada") };
}

// Archivar saca la clase del panel y deja de aceptar su código; el avance de sus estudiantes no cambia. Se puede
// restaurar. Solo la docente de la clase.
export async function cambiarEstadoClase(db: AppDb, { profesorId, claseId, estado }: { profesorId: string; claseId: string; estado: "activa" | "archivada" }): Promise<boolean> {
  const cambiadas = await db
    .update(clases)
    .set({ estado })
    .where(and(eq(clases.id, claseId), eq(clases.profesorId, profesorId)))
    .returning({ id: clases.id });
  return cambiadas.length > 0;
}

async function resumir(db: AppDb, filas: { id: string; titulo: string; codigo: string; estado: string; ruta: string }[]): Promise<ResumenClase[]> {
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
```

`apps/web/src/app/api/profesor/clases/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { cambiarEstadoClase } from "@/lib/clases/servicio";
import { exigirDocente } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({ estado: z.enum(["activa", "archivada"]) });

// Archivar o restaurar una clase propia.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const cambiado = await cambiarEstadoClase(getDb(), { profesorId: usuario.id, claseId: id, estado: parsed.data.estado });
  if (!cambiado) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib src/app/api/profesor && npx tsc --noEmit"`
Expected: PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/admin/moderacion.ts apps/web/src/lib/admin/moderacion.test.ts apps/web/src/lib/preguntas-profesor.ts apps/web/src/lib/preguntas-profesor.test.ts apps/web/src/lib/entregables apps/web/src/lib/clases "apps/web/src/app/api/profesor/clases/[id]/route.ts" "apps/web/src/app/api/profesor/clases/[id]/route.test.ts"
git commit -m "feat(mantenimiento): listas paginadas, busqueda de entregables y archivar clases

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Las pantallas

**Files:**
- Modify: `apps/web/src/components/admin/paginacion.tsx`, `apps/web/src/components/admin/boton-accion.tsx`, `apps/web/src/components/confirmacion.tsx`, `apps/web/src/components/rutas/mapa-ruta.tsx`, `apps/web/src/app/(dashboard)/admin/comunidad/page.tsx`, `apps/web/src/app/(dashboard)/admin/tutor/page.tsx`, `apps/web/src/app/(dashboard)/profesor/page.tsx`, `apps/web/src/app/(dashboard)/profesor/preguntas/page.tsx`, `apps/web/src/app/(dashboard)/profesor/entregables/page.tsx`, `e2e/tests/progreso.ts`, `e2e/tests/revision.ts`, `e2e/tests/recorrido.spec.ts`, `README.md`
- Test: `e2e/tests/mantenimiento.spec.ts`

**Interfaces:**
- Consumes: todo lo de la Task 1.
- Produces:
  - `Paginacion` con `parametro` y `etiqueta`;
  - `BotonAccion` con `icono` (`NombreIcono`).

- [ ] **Step 1: Escribir la prueba**

`e2e/tests/mantenimiento.spec.ts`:
```ts
import { expect, test } from "./fixtures";
import { entrarComoAdmin, registrarse } from "./progreso";

test("un docente archiva una clase con confirmación, la encuentra en Archivadas y la restaura", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.goto("/profesor");
  const titulo = `Clase por archivar ${Date.now()}`;
  await page.getByLabel("Nombre de la clase").fill(titulo);
  await page.getByRole("button", { name: "Crear clase" }).click();
  await expect(page).toHaveURL(/\/profesor\/clases\//);

  await page.goto("/profesor");
  const fila = page.locator("li", { hasText: titulo });
  await fila.getByRole("button", { name: "Archivar" }).click();
  const dialogo = page.getByRole("dialog", { name: "Archivar" });
  await expect(dialogo).toContainText("su código deja de aceptar estudiantes nuevos");
  // El foco parte en Cancelar: lo seguro con el teclado.
  await expect(dialogo.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await dialogo.getByRole("button", { name: "Archivar" }).click();
  await expect(page.locator("li", { hasText: titulo })).toHaveCount(0);

  await page.getByRole("link", { name: /Archivadas \(\d+\)/ }).click();
  await expect(page).toHaveURL(/vista=archivadas/);
  await page.locator("li", { hasText: titulo }).getByRole("button", { name: "Restaurar" }).click();
  await expect(page.locator("li", { hasText: titulo })).toHaveCount(0);
  await page.getByRole("link", { name: /Activas \(\d+\)/ }).click();
  await expect(page.locator("li", { hasText: titulo })).toHaveCount(1);
});

test("los entregables se buscan por estudiante y las preguntas se filtran por estado", async ({ page, nuevaPagina }) => {
  await registrarse(page, "Paula Contreras");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/profesor/entregables");
  await admin.getByLabel("Buscar por estudiante").fill("nadie-con-este-nombre");
  await admin.getByRole("button", { name: "Buscar" }).click();
  await expect(admin).toHaveURL(/q=nadie-con-este-nombre/);
  await expect(admin.getByText("No hay entregables por revisar de esa persona.")).toBeVisible();

  await admin.goto("/profesor/preguntas");
  const estados = admin.getByRole("navigation", { name: "Estado de las preguntas" });
  await expect(estados.getByRole("link", { name: /Todas \(\d+\)/ })).toHaveAttribute("aria-current", "page");
  await estados.getByRole("link", { name: "Respondidas" }).click();
  await expect(admin).toHaveURL(/estado=respondida/);
  await expect(estados.getByRole("link", { name: /Respondidas \(\d+\)/ })).toHaveAttribute("aria-current", "page");
});

test("las solicitudes y los comentarios pendientes se paginan por separado", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.goto("/admin/comunidad?comentarios=2");
  await expect(page.getByRole("heading", { name: /Comentarios de reseñas \(\d+\)/ })).toBeVisible();
  const paginas = page.getByRole("navigation", { name: "Páginas de comentarios" });
  // La base de e2e acumula comentarios pendientes; si hay una segunda página, se muestra como tal.
  if ((await paginas.count()) > 0) await expect(paginas).toContainText("Página 2 de");
  await expect(page.getByRole("heading", { name: /Solicitudes de acceso docente \(\d+\)/ })).toBeVisible();
});
```

En `e2e/tests/progreso.ts` (en `completarCaso`), `e2e/tests/revision.ts` (en `aprobarEntregable`) y `e2e/tests/recorrido.spec.ts`, la línea `await admin.goto("/profesor/entregables");` pasa a:
```ts
  // La lista se pagina y la base de e2e acumula entregables: se busca el de esta persona.
  await admin.goto(`/profesor/entregables?q=${encodeURIComponent(email)}`);
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run test:e2e -- tests/mantenimiento.spec.ts`
Expected: FAIL. No existen "Archivar", la búsqueda ni las pestañas.

- [ ] **Step 3: Los componentes**

`apps/web/src/components/admin/paginacion.tsx` completo:
```tsx
import Link from "next/link";

// `parametro` permite dos listas paginadas en la misma página (por ejemplo, solicitudes y comentarios).
export function Paginacion({
  ruta,
  parametros,
  pagina,
  paginas,
  parametro = "pagina",
  etiqueta = "Paginación",
}: {
  ruta: string;
  parametros: Record<string, string>;
  pagina: number;
  paginas: number;
  parametro?: string;
  etiqueta?: string;
}) {
  if (paginas <= 1) return null;
  const enlace = (numero: number) => `${ruta}?${new URLSearchParams({ ...parametros, [parametro]: String(numero) }).toString()}`;
  return (
    <nav aria-label={etiqueta} className="flex items-center gap-4 text-sm font-bold">
      {pagina > 1 ? <Link className="text-primary hover:underline" href={enlace(pagina - 1)}>← Anterior</Link> : <span />}
      <span className="text-muted-foreground">{`Página ${Math.min(pagina, paginas)} de ${paginas}`}</span>
      {pagina < paginas ? <Link className="text-primary hover:underline" href={enlace(pagina + 1)}>Siguiente →</Link> : null}
    </nav>
  );
}
```

`apps/web/src/components/admin/boton-accion.tsx` completo:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Check, EyeOff, Trash2, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Confirmacion } from "@/components/confirmacion";
import { enviarJson } from "@/lib/cuenta/cliente";

type Props = {
  url: string;
  metodo?: "POST" | "PATCH" | "DELETE";
  cuerpo?: unknown;
  etiqueta: string;
  variante?: "primary" | "secondary" | "ghost" | "destructive";
  confirmar?: string;
  // Un ícono junto al texto, que se mantiene para que la acción se entienda sin adivinar el ícono. Va por nombre: este
  // botón se usa desde páginas del servidor, que no pueden pasarle componentes (funciones) al navegador.
  icono?: NombreIcono;
};

const ICONOS = { aprobar: Check, rechazar: X, ocultar: EyeOff, borrar: Trash2, archivar: Archive, restaurar: ArchiveRestore } satisfies Record<string, LucideIcon>;
export type NombreIcono = keyof typeof ICONOS;

export function BotonAccion({ url, metodo = "POST", cuerpo, etiqueta, variante = "secondary", confirmar, icono }: Props) {
  const Icono = icono ? ICONOS[icono] : null;
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  async function ejecutar() {
    setEnviando(true);
    setError(null);
    const respuesta = await enviarJson(url, metodo, cuerpo);
    setEnviando(false);
    setConfirmando(false);
    if (respuesta.ok) router.refresh();
    else setError(respuesta.status === 404 ? "Ya no está disponible: otra persona lo resolvió." : "No se pudo completar. Intenta de nuevo.");
  }

  function pedirConfirmacion() {
    if (confirmar) {
      setConfirmando(true);
      return;
    }
    void ejecutar();
  }

  return (
    <div className="inline-grid gap-1">
      <Button type="button" size="sm" variant={variante} disabled={enviando} onClick={pedirConfirmacion}>
        {Icono ? <Icono className="size-4" aria-hidden="true" /> : null}
        {etiqueta}
      </Button>
      {error ? <span role="status" className="text-xs font-bold">{error}</span> : null}
      {confirmar ? (
        <Confirmacion
          abierta={confirmando}
          titulo={etiqueta}
          descripcion={confirmar}
          confirmar={etiqueta}
          variante={variante === "destructive" ? "destructive" : "primary"}
          onConfirmar={() => void ejecutar()}
          onCancelar={() => setConfirmando(false)}
        />
      ) : null}
    </div>
  );
}
```

En `apps/web/src/components/confirmacion.tsx`, el botón Cancelar queda:
```tsx
          {/* El foco parte en Cancelar: con el teclado se llega directo a los botones y lo seguro es no hacer nada. */}
          <Button type="button" variant="ghost" onClick={onCancelar} autoFocus>
```

En `apps/web/src/components/rutas/mapa-ruta.tsx`, `accionDe` queda:
```tsx
// La acción va solo donde está la persona: con varias tarjetas diciendo "Empezar", el mapa no guía (auditoría, 8e).
function accionDe(pieza: PiezaMapa): string | null {
  if (pieza.estado !== "en_curso" && pieza.estado !== "en_revision") return null;
```
(el resto de la función no cambia).

- [ ] **Step 4: Las páginas**

`apps/web/src/app/(dashboard)/admin/comunidad/page.tsx` completo:
```tsx
import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { BotonAccion } from "@/components/admin/boton-accion";
import { Paginacion } from "@/components/admin/paginacion";
import { adminDePagina } from "@/lib/admin/acceso";
import { paginaComentariosPendientes, paginaSolicitudesPendientes } from "@/lib/admin/moderacion";
import { leerPagina } from "@/lib/admin/paginacion";

export const metadata = { title: "Solicitudes y reseñas · Administración" };
const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });

type Parametros = { searchParams: Promise<{ solicitudes?: string; comentarios?: string }> };

// Dos listas en la misma página, cada una con su paginación: `solicitudes` y `comentarios` son sus números de página.
export default async function ComunidadAdminPage({ searchParams }: Parametros) {
  await adminDePagina("/admin/comunidad");
  const parametros = await searchParams;
  const paginaSolicitudes = leerPagina(parametros.solicitudes);
  const paginaComentarios = leerPagina(parametros.comentarios);
  const [solicitudes, comentarios] = await Promise.all([
    paginaSolicitudesPendientes(getDb(), { pagina: paginaSolicitudes }),
    paginaComentariosPendientes(getDb(), { pagina: paginaComentarios }),
  ]);
  const conservar = { solicitudes: String(paginaSolicitudes), comentarios: String(paginaComentarios) };
  return (
    <main className="grid gap-8">
      <h1 className="text-3xl font-black">Solicitudes y reseñas</h1>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">{`Solicitudes de acceso docente (${solicitudes.total})`}</h2>
        {solicitudes.filas.length === 0 ? (
          <p className="text-muted-foreground">No hay solicitudes pendientes.</p>
        ) : (
          <ul className="grid gap-2">
            {solicitudes.filas.map((s) => (
              <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <span>
                  <Link className="block font-bold text-primary hover:underline" href={`/admin/usuarios/${s.userId}`}>
                    {s.nombre ?? s.email}
                  </Link>
                  <span className="block text-sm text-muted-foreground">{`${s.email} · ${fecha(s.creadaEn)}`}</span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <BotonAccion url={`/api/admin/solicitudes/${s.id}`} cuerpo={{ decision: "aprobada" }} etiqueta="Aprobar" icono="aprobar" />
                  <BotonAccion url={`/api/admin/solicitudes/${s.id}`} cuerpo={{ decision: "rechazada" }} etiqueta="Rechazar" variante="ghost" icono="rechazar" confirmar="La persona recibe un mensaje de que por ahora no se aprobó su acceso docente." />
                </span>
              </li>
            ))}
          </ul>
        )}
        <Paginacion ruta="/admin/comunidad" parametros={conservar} parametro="solicitudes" pagina={solicitudes.pagina} paginas={solicitudes.paginas} etiqueta="Páginas de solicitudes" />
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">{`Comentarios de reseñas (${comentarios.total})`}</h2>
        {comentarios.filas.length === 0 ? (
          <p className="text-muted-foreground">No hay comentarios pendientes.</p>
        ) : (
          <ul className="grid gap-2">
            {comentarios.filas.map((c) => (
              <li key={c.id} className="card grid gap-2 p-4">
                <p className="text-sm text-muted-foreground">{`${c.caso.titulo} · ${c.estrellas}/5 · ${c.nombre ?? c.email} · ${fecha(c.creadaEn)}`}</p>
                <p className="whitespace-pre-wrap leading-7">{c.comentario}</p>
                <span className="flex flex-wrap gap-2">
                  <BotonAccion url={`/api/admin/resenas/${c.id}`} cuerpo={{ decision: "aprobado" }} etiqueta="Publicar comentario" icono="aprobar" />
                  <BotonAccion url={`/api/admin/resenas/${c.id}`} cuerpo={{ decision: "rechazado" }} etiqueta="Ocultar" variante="ghost" icono="ocultar" />
                </span>
              </li>
            ))}
          </ul>
        )}
        <Paginacion ruta="/admin/comunidad" parametros={conservar} parametro="comentarios" pagina={comentarios.pagina} paginas={comentarios.paginas} etiqueta="Páginas de comentarios" />
      </section>
    </main>
  );
}
```

En `apps/web/src/app/(dashboard)/admin/tutor/page.tsx`, el botón de la caché suma `icono="borrar"`.

`apps/web/src/app/(dashboard)/profesor/page.tsx` completo:
```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { BotonAccion } from "@/components/admin/boton-accion";
import { Paginacion } from "@/components/admin/paginacion";
import { FormularioClase } from "@/components/comunidad/clases/formulario-clase";
import { leerPagina } from "@/lib/admin/paginacion";
import { paginaClasesDelProfesor } from "@/lib/clases/servicio";
import { rutasParaPublicar } from "@/lib/contenido";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const metadata = { title: "Panel docente" };

export default async function ProfesorPage({ searchParams }: { searchParams: Promise<{ vista?: string; pagina?: string }> }) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?callbackUrl=/profesor");
  if (!esDocente(usuario)) notFound();
  const parametros = await searchParams;
  // Las archivadas salen del panel, pero quedan a mano para restaurarlas.
  const estado = parametros.vista === "archivadas" ? "archivada" : "activa";
  const [resultado, rutas] = await Promise.all([paginaClasesDelProfesor(getDb(), usuario.id, { estado, pagina: leerPagina(parametros.pagina) }), rutasParaPublicar()]);
  const clases = resultado.filas;

  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">{"> sudo -u docente"}</p>
        <h1 className="text-3xl font-black">Panel docente</h1>
        <p className="leading-7 text-muted-foreground">
          Crea clases, comparte su código y sigue el avance de tus estudiantes.{" "}
          <Link className="font-bold text-primary hover:underline" href="/profesor/preguntas">Ver las preguntas de tus estudiantes</Link>{" · "}
          <Link className="font-bold text-primary hover:underline" href="/profesor/entregables">Revisar entregables</Link>
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus clases</h2>
        <nav className="flex flex-wrap gap-4 text-sm" aria-label="Clases activas o archivadas">
          <Link href="/profesor" aria-current={estado === "activa" ? "page" : undefined} className={estado === "activa" ? "font-bold text-foreground" : "font-bold text-primary hover:underline"}>
            {`Activas (${resultado.activas})`}
          </Link>
          <Link href="/profesor?vista=archivadas" aria-current={estado === "archivada" ? "page" : undefined} className={estado === "archivada" ? "font-bold text-foreground" : "font-bold text-primary hover:underline"}>
            {`Archivadas (${resultado.archivadas})`}
          </Link>
        </nav>
        {clases.length === 0 ? (
          <p className="text-muted-foreground">{estado === "archivada" ? "No tienes clases archivadas." : "Todavía no creas ninguna clase."}</p>
        ) : (
          <ul className="grid gap-3">
            {clases.map((clase) => (
              <li key={clase.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <Link href={`/profesor/clases/${clase.id}`} className="grid min-w-0 gap-0.5 hover:underline">
                  <span className="block font-bold">{clase.titulo}</span>
                  <span className="block text-sm text-muted-foreground">{`${clase.ruta} · código ${clase.codigo}`}</span>
                </Link>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="badge">{`${clase.activas} estudiantes · ${clase.pendientes} por aceptar`}</span>
                  {estado === "activa" ? (
                    <BotonAccion
                      url={`/api/profesor/clases/${clase.id}`}
                      metodo="PATCH"
                      cuerpo={{ estado: "archivada" }}
                      etiqueta="Archivar"
                      variante="ghost"
                      icono="archivar"
                      confirmar={`«${clase.titulo}» sale de tu panel y su código deja de aceptar estudiantes nuevos. El avance de sus estudiantes no cambia, y puedes restaurarla cuando quieras.`}
                    />
                  ) : (
                    <BotonAccion url={`/api/profesor/clases/${clase.id}`} metodo="PATCH" cuerpo={{ estado: "activa" }} etiqueta="Restaurar" variante="ghost" icono="restaurar" />
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Paginacion ruta="/profesor" parametros={estado === "archivada" ? { vista: "archivadas" } : {}} pagina={resultado.pagina} paginas={resultado.paginas} />
      </section>

      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Crear una clase</h2>
        <FormularioClase rutas={rutas.map((ruta) => ({ slug: ruta.slug, titulo: ruta.titulo }))} />
      </section>
    </main>
  );
}
```

`apps/web/src/app/(dashboard)/profesor/preguntas/page.tsx` completo:
```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { EVENTO_PREGUNTA_NUEVA } from "@syntaxerror/queue/eventos";
import { RefrescarConAvisos } from "@/components/avisos/refrescar-con-avisos";
import { ListaPreguntas } from "@/components/comunidad/lista-preguntas";
import { Paginacion } from "@/components/admin/paginacion";
import { leerPagina } from "@/lib/admin/paginacion";
import { paginaPreguntasParaDocente } from "@/lib/preguntas-profesor";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const metadata = { title: "Preguntas de estudiantes" };

const VISTAS = [
  { valor: undefined, texto: "Todas" },
  { valor: "pendiente", texto: "Pendientes" },
  { valor: "respondida", texto: "Respondidas" },
] as const;

export default async function PreguntasDocentePage({ searchParams }: { searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?callbackUrl=/profesor/preguntas");
  if (!esDocente(usuario)) notFound();
  const parametros = await searchParams;
  const estado = parametros.estado === "pendiente" || parametros.estado === "respondida" ? parametros.estado : undefined;
  const resultado = await paginaPreguntasParaDocente(getDb(), usuario, { estado, pagina: leerPagina(parametros.pagina) });
  const preguntas = resultado.filas;
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
      <nav className="flex flex-wrap gap-4 text-sm" aria-label="Estado de las preguntas">
        {VISTAS.map((vista) => (
          <Link
            key={vista.texto}
            href={vista.valor ? `/profesor/preguntas?estado=${vista.valor}` : "/profesor/preguntas"}
            aria-current={estado === vista.valor ? "page" : undefined}
            className={estado === vista.valor ? "font-bold text-foreground" : "font-bold text-primary hover:underline"}
          >
            {estado === vista.valor ? `${vista.texto} (${resultado.total})` : vista.texto}
          </Link>
        ))}
      </nav>
      {preguntas.length === 0 ? <p className="text-muted-foreground">No hay preguntas por ahora.</p> : <ListaPreguntas preguntas={preguntas} modo="docente" />}
      <Paginacion ruta="/profesor/preguntas" parametros={estado ? { estado } : {}} pagina={resultado.pagina} paginas={resultado.paginas} />
    </main>
  );
}
```

`apps/web/src/app/(dashboard)/profesor/entregables/page.tsx` completo:
```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RUBRICA_BASE } from "@syntaxerror/content/rubrica";
import { getDb } from "@syntaxerror/db/client";
import { Paginacion } from "@/components/admin/paginacion";
import { FormularioRevision } from "@/components/comunidad/formulario-revision";
import { leerPagina } from "@/lib/admin/paginacion";
import { casosParaConstruir } from "@/lib/contenido";
import { paginaEntregablesPorRevisar } from "@/lib/entregables/revision";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const metadata = { title: "Entregables por revisar" };

const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });

export default async function EntregablesPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?callbackUrl=/profesor/entregables");
  if (!esDocente(usuario)) notFound();
  const parametros = await searchParams;
  const busqueda = (parametros.q ?? "").slice(0, 100);
  const [resultado, casos] = await Promise.all([paginaEntregablesPorRevisar(getDb(), usuario, { busqueda, pagina: leerPagina(parametros.pagina) }), casosParaConstruir()]);
  const lista = resultado.filas;
  const rubricaDe = (slug: string) => casos.find((caso) => caso.slug === slug)?.rubrica ?? RUBRICA_BASE;

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-12 sm:px-6">
      <nav className="text-sm"><Link className="font-bold text-primary hover:underline" href="/profesor">← Panel docente</Link></nav>
      <p className="font-mono text-sm font-bold text-primary">{"> git review"}</p>
      <h1 className="text-3xl font-black">Entregables por revisar</h1>
      <p className="leading-7 text-muted-foreground">
        La plataforma ya verificó que cada repositorio es público, tiene README y los archivos del caso. Abre el repositorio y ponle un puntaje de 1 a 3 en cada dimensión de la rúbrica: con 2 o más en las tres se aprueba; con un 1 se piden cambios, y esa dimensión necesita un comentario sobre qué corregir.
      </p>
      <form className="flex flex-wrap items-end gap-3" action="/profesor/entregables">
        <label className="grid gap-1 text-sm font-bold">
          Buscar por estudiante
          <input name="q" defaultValue={busqueda} maxLength={100} placeholder="Nombre o email" className="h-10 w-72 max-w-full rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground" />
        </label>
        <button type="submit" className="btn btn-secondary">
          Buscar
        </button>
        <span className="text-sm text-muted-foreground">{`${resultado.total} por revisar${busqueda ? ` para «${busqueda}»` : ""}`}</span>
      </form>
      {lista.length === 0 ? (
        <p className="text-muted-foreground">{busqueda ? "No hay entregables por revisar de esa persona." : "No hay entregables por revisar."}</p>
      ) : (
        <ul className="grid gap-4">
          {lista.map((entregable) => (
            <li key={entregable.id} className="card grid gap-3 p-5">
              <div className="grid gap-1">
                <p className="font-bold">{`${entregable.caso.titulo} · ${entregable.estudiante.nombre ?? entregable.estudiante.email}`}</p>
                <p className="text-xs text-muted-foreground">{`${entregable.estudiante.email} · enviado el ${fecha(entregable.enviadoEn)}`}</p>
                <a className="w-fit font-bold text-primary hover:underline" href={entregable.url} target="_blank" rel="noopener noreferrer">Abrir el repositorio</a>
              </div>
              <FormularioRevision entregableId={entregable.id} rubrica={rubricaDe(entregable.caso.slug)} />
            </li>
          ))}
        </ul>
      )}
      <Paginacion ruta="/profesor/entregables" parametros={busqueda ? { q: busqueda } : {}} pagina={resultado.pagina} paginas={resultado.paginas} />
    </main>
  );
}
```

En `README.md`, después de la línea de **Comunidad** (en Administración), agrega:
```markdown
- **Listas largas:** las solicitudes y los comentarios pendientes se paginan por separado (`?solicitudes=` y `?comentarios=`). En el panel docente, los entregables por revisar se buscan por estudiante (`?q=`, nombre o email) y se paginan; las preguntas se filtran en Todas, Pendientes y Respondidas; y las clases se archivan o restauran (una archivada no acepta estudiantes nuevos y el avance de sus estudiantes no cambia). Las acciones llevan ícono y texto, y las que no se deshacen fácilmente piden confirmar en un modal que parte con el foco en Cancelar.
```

- [ ] **Step 5: Correr todo**

Run: `npm run test:e2e -- tests/mantenimiento.spec.ts tests/comunidad.spec.ts tests/admin.spec.ts tests/avance.spec.ts`
Expected: `14 passed`.

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec tsc --noEmit && pnpm -r --if-present test"`
Expected: sin errores de tipos; web 384 pruebas.

Run: `npm run test:e2e`
Expected: `67 passed`, dos corridas seguidas.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components apps/web/src/app/(dashboard) e2e/tests README.md
git commit -m "feat(mantenimiento): paginas paginadas, archivar clases y acciones con icono y confirmacion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
