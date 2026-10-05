# Fase 8c: Rutas en beta. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un estado `beta` para las rutas: se publican en producción, pero ocultas, y solo las hacen los probadores (Fase 8b) y los admins, antes que el resto. La ruta Data Analyst pasa de `borrador` a `beta`.

**Architecture:**
- **Decisión del 2026-10-05:** estado beta en la misma app, para que el avance de los probadores quede guardado cuando la ruta se publique.
- **Dos listas que antes eran una** (`lib/contenido.ts`):
  - **Se lista al público** (`rutasParaPublicar`, como hoy): `/rutas`, el buscador, el sitemap y las rutas para clases de docentes.
  - **Se construye** (`rutasParaConstruir` y `casosParaConstruir`, nuevas): lo publicado más lo beta. La usan las páginas de rutas, casos, misiones y datos (`generateStaticParams`), las búsquedas `obtenerRuta`/`obtenerCaso`, los requisitos, el panel y los entregables por revisar.
- **El cierre en el servidor:**
  - `casosSoloBeta` (contenido) da los casos que solo están en rutas beta.
  - `exigirAccesoBeta(db, userId, caso)` (`lib/beta.ts`) responde 403 `{ error: "solo_probadores" }` si el caso es solo beta y la persona no es probador ni admin.
  - Lo usan `/api/progreso` (GET y POST), `/api/entregables`, el tutor, el asistente y los puntos de decisión. La sincronización rechaza esos intentos, como cualquier intento inválido.
- **Solo en producción:** con los borradores a la vista (`CONTENT_INCLUDE_DRAFTS=true`, en desarrollo y en los e2e) `casosSoloBeta` está vacío y nadie queda fuera. Si no, las decenas de e2e que recorren Data Analyst como estudiante normal fallarían. El cierre se prueba con pruebas de servidor que simulan producción (`beta.test.ts` y `api/progreso/beta.test.ts`), y con una imagen de producción construida con `CONTENT_INCLUDE_DRAFTS=false`, ya revisada:
  - existen `/rutas/data-analyst` y las lecciones, y no existe la demo (borrador);
  - `/rutas`, el índice del buscador y el sitemap no mencionan Data Analyst;
  - la ruta lleva `noindex, nofollow`.
- **Lo que se ve:**
  - **Quien no tiene acceso** (o no entró) ve en la misión, el caso y el mapa el aviso **Beta**: "Esta ruta está en beta: la están probando algunas personas antes de abrirla a todos. Muy pronto estará disponible. ¿Eres probador? Entra con tu cuenta." (`aviso-beta.tsx`), en vez de las tareas.
  - **Un probador** ve en el mapa "Estás probando esta ruta antes que el resto...", y en su panel la sección **Rutas en beta**, con el enlace.
  - **Rutas, casos y misiones beta** llevan `robots: noindex, nofollow`.
- **Otros ajustes:**
  - **El validador** le exige a una ruta beta lo mismo que a una publicada: la última misión de un caso, sin guía.
  - **El orden entre casos** (`casosRequeridos`) considera las rutas publicadas y las beta.
- **Certificados:** no dependen del estado. Quien complete una ruta beta recibe su certificado.

**Requisito:** las Fases 8a y 8b implementadas. El plan se armó sobre ellas.

**Tech Stack:** Next 15 (generación estática y metadata), Zod, Vitest 4 y Playwright 1.55.

**Spec:** decisión del 2026-10-05 ("Estado beta en la misma app").

## Global Constraints

- **El servidor manda:** quien no tiene acceso no puede registrar avance ni entregables en una ruta beta, aunque llegue a la página por enlace directo.
- **Desarrollo y e2e sin cierre:** se ve todo, como con los borradores.
- **Entorno:** todo se ejecuta con `docker compose run --rm tools ...`. Los paquetes son `@syntaxerror/content` y `web`.
- **Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Un estudiante que entra por enlace directo a una lección beta** en producción ve el aviso, y el servidor responde 403 a su avance. Probado en `api/progreso/beta.test.ts`.
2. **Un caso que está en una ruta publicada y en una beta** no queda cerrado. Probado en `publicacion.test.ts`.
3. **Que la ruta beta se cuele en `/rutas`, el buscador o el sitemap.** Revisado en la imagen de producción.
4. **Los e2e siguen corriendo como estudiante normal** en Data Analyst, porque en los e2e no hay cierre. Probado con la suite completa (61).
5. **Un admin entra a las rutas beta** sin marcarse como probador. Probado en `beta.test.ts` y `beta.spec.ts`.

---

### Task 1: El estado beta en el contenido

**Files:**
- Modify: `packages/content/src/esquemas.ts`, `packages/content/src/publicacion.ts`, `packages/content/src/validar.ts`
- Test: `packages/content/src/publicacion.test.ts`, `packages/content/src/validar.test.ts`

**Interfaces:**
- Produces:
  - `Ruta.estado: "publicada" | "beta" | "borrador"`;
  - `rutasVisibles(contenido, incluirBorradores, { beta? })` y `casosVisibles(..., { beta? })`;
  - `casosSoloBeta(contenido, incluirBorradores): Set<string>`.

- [ ] **Step 1: Escribir las pruebas**

En `packages/content/src/publicacion.test.ts`, suma `casosSoloBeta` al import de `./publicacion` y, antes de "tareasDeMision devuelve solo los bloques de tarea", agrega:
```ts
  it("una ruta en beta se construye pero no se lista, y sus casos son solo para probadores", () => {
    const enBeta: Contenido = { ...contenido, rutas: contenido.rutas.map((ruta) => ({ ...ruta, estado: "beta" as const })) };
    expect(rutasVisibles(enBeta, false)).toEqual([]);
    expect(rutasVisibles(enBeta, false, { beta: true }).map((ruta) => ruta.slug)).toEqual(["analista"]);
    expect(casosVisibles(enBeta, false, { beta: true }).map((caso) => caso.slug)).toEqual(["ventas"]);
    expect([...casosSoloBeta(enBeta, false)]).toEqual(["ventas"]);
    // Con los borradores a la vista (desarrollo y e2e) se ve todo y nada queda solo para probadores.
    expect(rutasVisibles(enBeta, true).map((ruta) => ruta.slug)).toEqual(["analista"]);
    expect([...casosSoloBeta(enBeta, true)]).toEqual([]);
    // Un caso que también está en una ruta publicada no es solo beta.
    const tambienPublicado: Contenido = { ...enBeta, rutas: [...enBeta.rutas, { ...contenido.rutas[0], slug: "otra", estado: "publicada" }] };
    expect([...casosSoloBeta(tambienPublicado, false)]).toEqual([]);
  });
```

En `packages/content/src/validar.test.ts`, en "la última misión de un caso publicado debe ser sin guía; en borrador no se exige", antes de `contenido.rutas[0].estado = "borrador";`, agrega:
```ts
    // Una ruta en beta se va a publicar: también se exige.
    contenido.rutas[0].estado = "beta";
    expect(await validar()).toContain("casos/ventas: la última misión (03-python) debe ser sin guía: agrega sinGuia: true a su frontmatter");
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools sh -c "cd packages/content && npx vitest run src/publicacion.test.ts src/validar.test.ts"`
Expected: FAIL (2 pruebas).

- [ ] **Step 3: Implementar**

En `packages/content/src/esquemas.ts`, el estado de la ruta queda:
```ts
  // beta: se publica en producción, pero oculta; solo la hacen probadores y admins (fase 8c).
  estado: z.enum(["publicada", "beta", "borrador"]),
```

`packages/content/src/publicacion.ts` completo:
```ts
import { TIPOS_TAREA, type BloqueTarea } from "./esquemas";
import type { Caso, Contenido, Mision, Ruta } from "./tipos";

// Las rutas que se ven: las publicadas, más las beta si se piden (para construir sus páginas, que quedan ocultas) y
// todas con los borradores a la vista (desarrollo y e2e).
export function rutasVisibles(contenido: Contenido, incluirBorradores: boolean, { beta = false }: { beta?: boolean } = {}): Ruta[] {
  return contenido.rutas.filter((ruta) => incluirBorradores || ruta.estado === "publicada" || (beta && ruta.estado === "beta"));
}

export function casosVisibles(contenido: Contenido, incluirBorradores: boolean, opciones: { beta?: boolean } = {}): Caso[] {
  const slugs = new Set(rutasVisibles(contenido, incluirBorradores, opciones).flatMap((ruta) => ruta.casos));
  return contenido.casos.filter((caso) => slugs.has(caso.slug));
}

// Los casos que solo están en rutas en beta: solo los pueden hacer probadores y admins. Con los borradores a la vista
// no hay ninguno: en desarrollo y en los e2e todo queda abierto.
export function casosSoloBeta(contenido: Contenido, incluirBorradores: boolean): Set<string> {
  const publicos = new Set(casosVisibles(contenido, incluirBorradores).map((caso) => caso.slug));
  return new Set(casosVisibles(contenido, incluirBorradores, { beta: true }).map((caso) => caso.slug).filter((slug) => !publicos.has(slug)));
}

export function tareasDeMision(mision: Mision): BloqueTarea[] {
  return mision.bloques.filter((bloque): bloque is BloqueTarea => (TIPOS_TAREA as readonly string[]).includes(bloque.tipo));
}
```

En `packages/content/src/validar.ts`, la línea de `publicado` queda:
```ts
    // Una ruta en beta se va a publicar: se le exige lo mismo que a una publicada.
    const publicado = contenido.rutas.some((ruta) => ruta.estado !== "borrador" && ruta.casos.includes(caso.slug));
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd packages/content && npx vitest run && npx tsc --noEmit"`
Expected: PASS (104) y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src
git commit -m "feat(contenido): el estado beta, que se construye pero no se lista

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: El cierre en el servidor

**Files:**
- Modify: `content/rutas/data-analyst.yaml`, `apps/web/src/lib/contenido.ts`, `apps/web/src/lib/progreso/requisitos.ts`, `apps/web/src/app/api/progreso/route.ts`, `apps/web/src/app/api/progreso/sync/route.ts`, `apps/web/src/app/api/progreso/resumen/route.ts`, `apps/web/src/app/api/entregables/route.ts`, `apps/web/src/app/api/tutor/preguntas/route.ts`, `apps/web/src/app/api/asistente/preguntas/route.ts`, `apps/web/src/app/api/puntos/decision/route.ts`
- Create: `apps/web/src/lib/beta.ts`
- Test: `apps/web/src/lib/beta.test.ts`, `apps/web/src/app/api/progreso/beta.test.ts`, `apps/web/src/app/api/progreso/resumen/route.test.ts`

**Interfaces:**
- Consumes: `casosSoloBeta` y `rutasVisibles(..., { beta })` (Task 1), y `users.probador` (8b).
- Produces:
  - `rutasParaConstruir()`, `casosParaConstruir()`, `casosSoloParaProbadores()` y `rutasEnBeta()`;
  - `accesoBeta(db, userId)` y `exigirAccesoBeta(db, userId, casoSlug)`;
  - `/api/progreso/resumen` devuelve también `accesoBeta`.

- [ ] **Step 1: La ruta a beta y las pruebas**

En `content/rutas/data-analyst.yaml`, `estado: borrador` pasa a `estado: beta`.

`apps/web/src/lib/beta.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { accesoBeta, exigirAccesoBeta } from "./beta";

// Como en producción: sin borradores a la vista, la ruta Data Analyst (en beta) queda solo para probadores.
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "false");

const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
});
afterAll(() => close());

describe("acceso a las rutas en beta", () => {
  it("solo probadores y admins; el resto recibe 403 en un caso que solo está en una ruta beta", async () => {
    const [estudiante, probador, admin] = await db
      .insert(users)
      .values([{ email: "ana@correo.cl" }, { email: "beto@correo.cl", probador: true }, { email: "admin@correo.cl", role: "admin" }])
      .returning({ id: users.id });
    expect(await accesoBeta(db, estudiante.id)).toBe(false);
    expect(await accesoBeta(db, probador.id)).toBe(true);
    expect(await accesoBeta(db, admin.id)).toBe(true);

    const bloqueo = await exigirAccesoBeta(db, estudiante.id, "clases-de-sql");
    expect(bloqueo?.status).toBe(403);
    expect(await bloqueo?.json()).toEqual({ error: "solo_probadores" });
    expect(await exigirAccesoBeta(db, probador.id, "clases-de-sql")).toBeNull();
    expect(await exigirAccesoBeta(db, admin.id, "clases-de-sql")).toBeNull();
  });

  it("con los borradores a la vista (desarrollo y e2e) no se bloquea a nadie", async () => {
    vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");
    const [estudiante] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    expect(await exigirAccesoBeta(db, estudiante.id, "clases-de-sql")).toBeNull();
    vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "false");
  });
});
```

`apps/web/src/app/api/progreso/beta.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
// Como en producción: la ruta Data Analyst está en beta y sus casos son solo para probadores.
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "false");

const { GET, POST } = await import("./route");
const { POST: SINCRONIZAR } = await import("./sync/route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const intento = { caso: "clases-de-sql", mision: "01-select-basico", tarea: "select-basico", aprobada: true };
const enviar = (handler: (request: Request) => Promise<Response>, cuerpo: unknown) =>
  handler(new Request("http://localhost:3000/api/progreso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));

beforeEach(async () => {
  await truncateAll(db);
});
afterAll(() => close());

describe("/api/progreso en una ruta beta", () => {
  it("un estudiante recibe 403 al consultar y registrar, y su sincronización se rechaza", async () => {
    const [ana] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(ana.id);
    const consulta = await GET(new Request("http://localhost:3000/api/progreso?caso=clases-de-sql"));
    expect(consulta.status).toBe(403);
    expect(await consulta.json()).toEqual({ error: "solo_probadores" });
    expect((await enviar(POST, intento)).status).toBe(403);
    expect(await (await enviar(SINCRONIZAR, { intentos: [intento] })).json()).toMatchObject({ aplicados: 0, rechazados: 1 });
  });

  it("un probador pasa el control (el caso no está en esta base, así que responde 404 y no 403)", async () => {
    const [beto] = await db.insert(users).values({ email: "beto@correo.cl", probador: true }).returning({ id: users.id });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(beto.id);
    expect((await GET(new Request("http://localhost:3000/api/progreso?caso=clases-de-sql"))).status).toBe(404);
  });
});
```

`apps/web/src/app/api/progreso/resumen/route.test.ts` completo:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

// Como en producción: la ruta Data Analyst está en beta, así que un estudiante no tiene acceso a ella.
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "false");

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
    expect(await (await GET()).json()).toEqual({ casos: {}, ordenLibre: false, accesoBeta: false });

    const aprobar = { caso: "ventas", mision: "m1", tarea: "t1", aprobada: true };
    await POST(new Request("http://localhost:3000/api/progreso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(aprobar) }));
    const respuesta = await GET();
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    expect(await respuesta.json()).toEqual({ casos: { ventas: { aprobadas: 1, completo: false } }, ordenLibre: false, accesoBeta: false });
  });

  it("avisa si la persona tiene el orden libre y acceso a las rutas en beta (probador)", async () => {
    const [probador] = await db.insert(users).values({ email: "probador@correo.cl", probador: true }).returning({ id: users.id });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(probador.id);
    expect(await (await GET()).json()).toEqual({ casos: {}, ordenLibre: true, accesoBeta: true });
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/beta.test.ts src/app/api/progreso"`
Expected: FAIL. No existe `./beta` y el progreso responde sin cierre.

- [ ] **Step 3: El contenido y el acceso**

`apps/web/src/lib/contenido.ts` completo:
```ts
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { cargarContenido } from "@syntaxerror/content/cargar";
import { casosSoloBeta, casosVisibles, rutasVisibles } from "@syntaxerror/content/publicacion";
import type { Caso, Contenido, Ruta } from "@syntaxerror/content/tipos";

let enCache: Promise<Contenido> | null = null;
let firmaEnCache = "";

function directorio(): string {
  return process.env.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content");
}

export function incluirBorradores(): boolean {
  return process.env.CONTENT_INCLUDE_DRAFTS === "true";
}

// La fecha de modificación más reciente y la cantidad de archivos del contenido: cambia al editar, crear o borrar uno.
function firmaContenido(dir: string): string {
  let ultima = 0;
  let archivos = 0;
  for (const entrada of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entrada.isFile()) continue;
    archivos += 1;
    ultima = Math.max(ultima, statSync(path.join(entrada.parentPath, entrada.name)).mtimeMs);
  }
  return `${archivos}:${ultima}`;
}

// En producción el contenido se carga una vez. En desarrollo se vuelve a cargar solo si cambió algún archivo:
// cargarlo entero en cada llamada (varias por página, con 174 misiones) hacía que cada página tardara segundos.
export function obtenerContenido(): Promise<Contenido> {
  if (process.env.NODE_ENV !== "production") {
    const firma = firmaContenido(directorio());
    if (!enCache || firma !== firmaEnCache) {
      enCache = cargarContenido(directorio());
      firmaEnCache = firma;
    }
    return enCache;
  }
  enCache ??= cargarContenido(directorio());
  return enCache;
}

// Lo que se lista al público: /rutas, el buscador, el sitemap y las clases de los docentes.
export async function rutasParaPublicar(): Promise<Ruta[]> {
  return rutasVisibles(await obtenerContenido(), incluirBorradores());
}

export async function casosParaPublicar(): Promise<Caso[]> {
  return casosVisibles(await obtenerContenido(), incluirBorradores());
}

// Lo que se construye: lo publicado más las rutas en beta, cuyas páginas existen pero no se listan.
export async function rutasParaConstruir(): Promise<Ruta[]> {
  return rutasVisibles(await obtenerContenido(), incluirBorradores(), { beta: true });
}

export async function casosParaConstruir(): Promise<Caso[]> {
  return casosVisibles(await obtenerContenido(), incluirBorradores(), { beta: true });
}

// Los casos que solo están en rutas en beta: solo los hacen probadores y admins. Vacío con los borradores a la vista.
export async function casosSoloParaProbadores(): Promise<Set<string>> {
  return casosSoloBeta(await obtenerContenido(), incluirBorradores());
}

export async function rutasEnBeta(): Promise<Ruta[]> {
  return (await rutasParaConstruir()).filter((ruta) => ruta.estado === "beta");
}

export async function obtenerRuta(slug: string): Promise<Ruta | null> {
  return (await rutasParaConstruir()).find((ruta) => ruta.slug === slug) ?? null;
}

export async function obtenerCaso(slug: string): Promise<Caso | null> {
  return (await casosParaConstruir()).find((caso) => caso.slug === slug) ?? null;
}

export async function casosDeRuta(ruta: Ruta): Promise<Caso[]> {
  const casos = await casosParaConstruir();
  return ruta.casos.flatMap((slug) => casos.filter((caso) => caso.slug === slug));
}
```

`apps/web/src/lib/beta.ts`:
```ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { casosSoloParaProbadores } from "@/lib/contenido";

// Las rutas en beta están publicadas pero ocultas: las hacen los probadores (los marca un admin) y los admins.
export async function accesoBeta(db: DbClient, userId: string): Promise<boolean> {
  const [fila] = await db.select({ probador: users.probador, rol: users.role }).from(users).where(eq(users.id, userId));
  return Boolean(fila?.probador || fila?.rol === "admin");
}

// Para las APIs de un caso: 403 si el caso solo está en rutas beta y la persona no tiene acceso.
export async function exigirAccesoBeta(db: DbClient, userId: string, casoSlug: string): Promise<NextResponse | null> {
  if (!(await casosSoloParaProbadores()).has(casoSlug)) return null;
  if (await accesoBeta(db, userId)) return null;
  return NextResponse.json({ error: "solo_probadores" }, { status: 403 });
}
```

En `apps/web/src/lib/progreso/requisitos.ts`, el filtro de `casosRequeridos` queda:
```ts
    .where(and(eq(rutaCasos.casoId, casoId), incluirBorradores ? undefined : inArray(rutas.estado, ["publicada", "beta"])));
```

- [ ] **Step 4: Las APIs**

`apps/web/src/app/api/progreso/route.ts` completo:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { otorgarCertificados } from "@/lib/certificados/otorgar";
import { certificadosDelCaso } from "@/lib/certificados/servicio";
import { encolarSinFallar } from "@/lib/emails";
import { intentoSchema } from "@/lib/progreso/esquemas";
import { opcionesDeProgreso } from "@/lib/progreso/orden";
import { ErrorProgreso, estadoHttp, obtenerProgresoCaso, registrarIntento } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";
import { exigirAccesoBeta } from "@/lib/beta";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const caso = new URL(request.url).searchParams.get("caso");
  if (!caso) return NextResponse.json({ error: "falta_caso" }, { status: 400 });
  const bloqueo = await exigirAccesoBeta(getDb(), userId, caso);
  if (bloqueo) return bloqueo;
  const progreso = await obtenerProgresoCaso(getDb(), userId, caso, await opcionesDeProgreso(getDb(), userId));
  if (!progreso) return NextResponse.json({ error: "caso_no_existe" }, { status: 404 });
  const certificados = await certificadosDelCaso(getDb(), userId, caso);
  return NextResponse.json({ ...progreso, certificados }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = intentoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const bloqueo = await exigirAccesoBeta(getDb(), userId, parsed.data.caso);
  if (bloqueo) return bloqueo;
  try {
    const db = getDb();
    const resultado = await registrarIntento(db, userId, parsed.data, await opcionesDeProgreso(db, userId));
    const certificados = resultado.casoCompleto ? await otorgarCertificados(db, userId, parsed.data.caso, encolarSinFallar) : [];
    return NextResponse.json({ ...resultado, certificados });
  } catch (error) {
    if (error instanceof ErrorProgreso) return NextResponse.json({ error: error.codigo }, { status: estadoHttp(error.codigo) });
    throw error;
  }
}
```

`apps/web/src/app/api/progreso/sync/route.ts` completo:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { otorgarCertificados } from "@/lib/certificados/otorgar";
import type { CertificadoEmitido } from "@/lib/certificados/servicio";
import { encolarSinFallar } from "@/lib/emails";
import { sincronizacionSchema } from "@/lib/progreso/esquemas";
import { opcionesDeProgreso } from "@/lib/progreso/orden";
import { sincronizarIntentos } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";
import { accesoBeta } from "@/lib/beta";
import { casosSoloParaProbadores } from "@/lib/contenido";

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = sincronizacionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const db = getDb();
  // Los intentos en casos solo para probadores, de quien no lo es, se rechazan como cualquier intento inválido.
  const soloBeta = await casosSoloParaProbadores();
  const conAcceso = soloBeta.size === 0 || (await accesoBeta(db, userId));
  const intentos = conAcceso ? parsed.data.intentos : parsed.data.intentos.filter((intento) => !soloBeta.has(intento.caso));
  const aplicado = await sincronizarIntentos(db, userId, intentos, await opcionesDeProgreso(db, userId));
  const resultado = { ...aplicado, rechazados: aplicado.rechazados + parsed.data.intentos.length - intentos.length };
  const certificados: CertificadoEmitido[] = [];
  for (const caso of new Set(intentos.map((intento) => intento.caso))) {
    certificados.push(...(await otorgarCertificados(db, userId, caso, encolarSinFallar)));
  }
  return NextResponse.json({ ...resultado, certificados });
}
```

`apps/web/src/app/api/progreso/resumen/route.ts` completo:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { accesoBeta } from "@/lib/beta";
import { casosSoloParaProbadores } from "@/lib/contenido";
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
  // accesoBeta: si puede hacer las rutas en beta (probador o admin; todos con los borradores a la vista).
  const conBeta = (await casosSoloParaProbadores()).size === 0 || (await accesoBeta(getDb(), userId));
  return NextResponse.json({ casos, ordenLibre: await tieneOrdenLibre(getDb(), userId), accesoBeta: conBeta }, { headers: { "Cache-Control": "no-store" } });
}
```

En `apps/web/src/app/api/entregables/route.ts`, `apps/web/src/app/api/tutor/preguntas/route.ts`, `apps/web/src/app/api/asistente/preguntas/route.ts` y `apps/web/src/app/api/puntos/decision/route.ts`:
1. Importa `import { exigirAccesoBeta } from "@/lib/beta";`.
2. Justo después de la línea que responde 404 si el caso (o la misión) no existe, agrega:
```ts
  const bloqueo = await exigirAccesoBeta(getDb(), userId, caso.slug);
  if (bloqueo) return bloqueo;
```

- [ ] **Step 5: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib src/app/api && npx tsc --noEmit"`
Expected: PASS y sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add content/rutas/data-analyst.yaml apps/web/src/lib/contenido.ts apps/web/src/lib/beta.ts apps/web/src/lib/beta.test.ts apps/web/src/lib/progreso/requisitos.ts apps/web/src/app/api
git commit -m "feat(beta): la ruta data analyst en beta, solo para probadores y admins en produccion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Las páginas

**Files:**
- Create: `apps/web/src/components/mision/aviso-beta.tsx`
- Modify: `apps/web/src/lib/progreso/cliente.ts`, `apps/web/src/components/mision/mision-provider.tsx`, `apps/web/src/components/mision/panel-tarea.tsx`, `apps/web/src/components/mision/panel-caso.tsx`, `apps/web/src/components/rutas/mapa-ruta.tsx`, `apps/web/src/app/(misiones)/casos/[caso]/page.tsx`, `apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx`, `apps/web/src/app/(misiones)/casos/[caso]/datos/[archivo]/route.ts`, `apps/web/src/app/(misiones)/rutas/[ruta]/page.tsx`, `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/web/src/app/(dashboard)/profesor/entregables/page.tsx`, `README.md`
- Test: `apps/web/src/lib/progreso/cliente.test.ts`, `e2e/tests/beta.spec.ts`

**Interfaces:**
- Consumes: todo lo de la Task 2.
- Produces:
  - `ProgresoVisible.soloProbadores`;
  - `Bloqueo` de tipo `"beta"`;
  - `<AvisoBeta sesion volverA />`;
  - `MisionProvider` y `PanelCaso` con `soloProbadores`;
  - `MapaRuta` con `ruta.beta`.

- [ ] **Step 1: Escribir las pruebas**

En `apps/web/src/lib/progreso/cliente.test.ts`:
1. Los dos objetos esperados de `cargarProgreso` suman `soloProbadores: false,` después de `ordenLibre`.
2. Antes de "sin sesión usa solo localStorage", agrega:
```ts
  it("en un caso de una ruta beta, sin ser probador, avisa soloProbadores con la sesión iniciada", async () => {
    const progreso = await cargarProgreso("ventas", tareasPorMision, { fetch: fetchFalso(() => json(403, { error: "solo_probadores" })).fetch, almacen: almacenEnMemoria() });
    expect(progreso).toMatchObject({ sesion: true, soloProbadores: true, misiones: {} });
  });
```

`e2e/tests/beta.spec.ts`:
```ts
import { expect, test } from "./fixtures";
import { entrarComoAdmin, registrarse } from "./progreso";

// En los e2e se ven los borradores, así que el cierre de las rutas beta (solo probadores y admins) no corre aquí: lo
// prueban beta.test.ts y api/progreso/beta.test.ts como en producción. Aquí se prueba lo que se ve.
test("una ruta en beta avisa que está en beta y no se indexa", async ({ page }) => {
  await page.goto("/rutas/data-analyst");
  await expect(page.getByRole("status").filter({ hasText: "Esta ruta está en beta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Entra con tu cuenta" })).toHaveAttribute("href", "/login?callbackUrl=%2Frutas%2Fdata-analyst");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("los admins encuentran las rutas en beta en su panel; un estudiante no", async ({ page, nuevaPagina }) => {
  await registrarse(page, "Rocío Fuentes");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Tus casos y clases" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Rutas en beta" })).toHaveCount(0);

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/dashboard");
  const betas = admin.getByRole("region", { name: "Rutas en beta" });
  await betas.getByRole("link", { name: "Data Analyst" }).click();
  await expect(admin).toHaveURL(/\/rutas\/data-analyst$/);
  await expect(admin.getByRole("status").filter({ hasText: "Estás probando esta ruta antes que el resto" })).toBeVisible();
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/progreso/cliente.test.ts"`
Expected: FAIL (falta `soloProbadores`).

- [ ] **Step 3: El cliente y los avisos**

En `apps/web/src/lib/progreso/cliente.ts`:
1. `ProgresoVisible` suma, después de `ordenLibre`:
```ts
  // El caso es de una ruta en beta y la persona no es probadora (la API respondió 403 solo_probadores).
  soloProbadores: boolean;
```
2. El comienzo de `cargarProgreso` queda:
```ts
  let servidor: Omit<ProgresoVisible, "sesion" | "soloProbadores"> | null = null;
  let soloProbadores = false;
  try {
    const respuesta = await deps.fetch(`/api/progreso?caso=${encodeURIComponent(caso)}`, { cache: "no-store" });
    if (respuesta.ok) servidor = (await respuesta.json()) as Omit<ProgresoVisible, "sesion" | "soloProbadores">;
    else if (respuesta.status === 403) soloProbadores = ((await respuesta.json().catch(() => ({}))) as { error?: string }).error === "solo_probadores";
  } catch {
    servidor = null;
  }
```
3. En lo que devuelve, `sesion` pasa a `servidor !== null || soloProbadores,`, y al final se agrega `soloProbadores,`.

`apps/web/src/components/mision/aviso-beta.tsx`:
```tsx
import Link from "next/link";

// Lo que ve quien no es probador en una ruta en beta: está publicada, pero todavía no abierta a todos.
export function AvisoBeta({ sesion, volverA, className = "" }: { sesion: boolean; volverA: string; className?: string }) {
  return (
    <p role="status" className={`text-sm leading-6 ${className}`}>
      <span className="badge mr-2">Beta</span>
      Esta ruta está en beta: la están probando algunas personas antes de abrirla a todos. Muy pronto estará disponible.
      {sesion ? null : (
        <>
          {" ¿Eres probador? "}
          <Link className="font-bold text-primary hover:underline" href={`/login?callbackUrl=${encodeURIComponent(volverA)}`}>
            Entra con tu cuenta
          </Link>
          .
        </>
      )}
    </p>
  );
}
```

En `apps/web/src/components/mision/mision-provider.tsx`:
1. `Bloqueo` queda:
```ts
export type Bloqueo =
  | { tipo: "mision"; mision: { slug: string; titulo: string } }
  | { tipo: "caso"; caso: CasoCorto; sesion: boolean }
  // Un caso de una ruta en beta, para quien no es probador (o no ha entrado).
  | { tipo: "beta"; sesion: boolean };
```
2. `MisionProvider` recibe `soloProbadores = false` (`soloProbadores?: boolean` en sus tipos).
3. En el efecto que carga el progreso, antes de `if (casoPendiente)`, va el aviso de beta (y `if (casoPendiente)` pasa a `else if`):
```tsx
      if (soloProbadores && (progreso.soloProbadores || !progreso.sesion)) setBloqueo({ tipo: "beta", sesion: progreso.sesion });
      else if (casoPendiente) setBloqueo({ tipo: "caso", caso: casoPendiente, sesion: progreso.sesion });
```
4. Las dependencias del efecto suman `soloProbadores`.

En `apps/web/src/components/mision/panel-tarea.tsx`:
1. Importa `import { AvisoBeta } from "./aviso-beta";`.
2. La primera línea de `AvisoBloqueo`, después de `const clase = ...`, es:
```tsx
  if (bloqueo.tipo === "beta") return <AvisoBeta sesion={bloqueo.sesion} volverA={`/casos/${caso}`} className={clase} />;
```

En `apps/web/src/components/mision/panel-caso.tsx`:
1. Importa `AvisoBeta` y suma la prop `soloProbadores = false` (`soloProbadores?: boolean`).
2. `casoPendiente` queda:
```tsx
  // En una ruta beta, quien no es probador ve el aviso de beta en vez del de orden.
  const enBeta = soloProbadores && progreso !== null && (progreso.soloProbadores || !progreso.sesion);
  const casoPendiente = progreso && !enBeta ? (progreso.sesion ? progreso.bloqueadoPor : (requisitos[0] ?? null)) : null;
```
3. Como primer hijo del `<div className="grid gap-8">`, agrega:
```tsx
      {enBeta ? <AvisoBeta sesion={progreso.sesion} volverA={`/casos/${caso}`} className="card p-4" /> : null}
```

`apps/web/src/components/rutas/mapa-ruta.tsx` completo:
```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { armarMapa, hashCorto, type AvanceCaso, type EstadoPieza, type PiezaMapa, type PiezaRuta } from "@/lib/rutas/mapa";
import { AvisoBeta } from "../mision/aviso-beta";

// La ruta como un `git log --graph --reverse`: main avanza con los casos y cada clase es una rama que sale de main y
// se fusiona en el caso que la aplica. La página es estática; el avance de la persona se pide al cargar.

type Props = { ruta: { slug: string; titulo: string; beta?: boolean }; piezas: PiezaRuta[] };

const NODO: Record<EstadoPieza, string> = {
  completo: "border-success bg-success",
  en_curso: "border-primary bg-background",
  en_revision: "border-warning bg-warning/40",
  bloqueado: "border-dashed border-muted-foreground bg-background",
  disponible: "border-primary bg-background",
};

// La línea que llega a un nodo: verde si ese tramo ya se recorrió, punteada si está bloqueado.
function linea(estado: EstadoPieza | "release") {
  if (estado === "completo") return "border-success";
  if (estado === "bloqueado" || estado === "release") return "border-dashed border-border";
  return "border-border";
}

function Decoracion({ children, tono }: { children: React.ReactNode; tono: "head" | "rama" | "tag" }) {
  const borde = tono === "head" ? "border-primary" : tono === "rama" ? "border-success" : "border-warning";
  return <span className={`rounded border px-1 font-mono text-[11px] font-bold leading-5 text-foreground ${borde}`}>{children}</span>;
}

function Estado({ pieza }: { pieza: PiezaMapa }) {
  // Sin encogerse ni partirse: en un teléfono la etiqueta queda junto al título, completa.
  const base = "shrink-0 whitespace-nowrap font-mono text-[11px] font-black uppercase";
  if (pieza.estado === "completo") return <span className={`${base} text-foreground`}>✔ merged</span>;
  if (pieza.estado === "en_revision") return <span className={`${base} text-foreground`}>PR en revisión</span>;
  if (pieza.estado === "bloqueado") {
    return (
      <span className={`${base} typographic-glitch text-muted-foreground`} data-text="LOCKED">
        LOCKED
      </span>
    );
  }
  return null;
}

function etiquetaEstado(pieza: PiezaMapa): string {
  if (pieza.estado === "completo") return "completo";
  if (pieza.estado === "en_curso") return pieza.aprobadas > 0 ? "en curso" : "siguiente";
  if (pieza.estado === "en_revision") return "entregable en revisión";
  if (pieza.estado === "bloqueado") return "bloqueado";
  return "disponible";
}

function Commit({ pieza, mensaje, decoraciones }: { pieza: PiezaMapa; mensaje: string; decoraciones: React.ReactNode }) {
  const unidad = pieza.tipo === "clases" ? "lecciones" : "misiones";
  const conAvance = pieza.estado === "en_curso" || pieza.estado === "en_revision" || ((pieza.estado === "bloqueado" || pieza.estado === "disponible") && pieza.aprobadas > 0);
  const detalle = pieza.tipo === "clases" ? `${pieza.unidades} ${unidad}` : `Caso ${pieza.numeroCaso} · ${pieza.empresa} · ${pieza.unidades} ${unidad}`;
  return (
    <Link
      href={`/casos/${pieza.slug}`}
      aria-label={`${pieza.titulo}: ${etiquetaEstado(pieza)}`}
      className={`card grid min-w-0 flex-1 gap-1.5 p-4 hover:border-primary ${pieza.estado === "bloqueado" ? "opacity-70" : ""} ${pieza.estado === "en_curso" ? "border-primary" : ""}`}
    >
      <span className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <span>{pieza.hash}</span>
        {decoraciones}
        <span className="min-w-0 truncate">{mensaje}</span>
      </span>
      <span className="flex items-start justify-between gap-3">
        <span className="font-black leading-snug">{pieza.titulo}</span>
        <Estado pieza={pieza} />
      </span>
      <span className="text-sm text-muted-foreground">{detalle}</span>
      {conAvance ? (
        <span className="grid gap-1">
          <span className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((pieza.aprobadas / Math.max(pieza.unidades, 1)) * 100)}%` }} />
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {pieza.estado === "en_revision" ? "Misiones listas: falta que aprueben tu entregable" : `${pieza.aprobadas}/${pieza.unidades} ${unidad}`}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

// Las dos líneas del grafo: main (izquierda) y la rama de las clases (derecha). `tramo` dibuja cada fila.
function Carril({ main, rama, nodo }: { main: string | null; rama?: string | null; nodo?: { carril: "main" | "rama"; clase: string; actual: boolean } }) {
  return (
    <span aria-hidden="true" className="relative block w-12 shrink-0 self-stretch">
      {main ? <span className={`absolute inset-y-0 left-[11px] border-l-2 ${main}`} /> : null}
      {rama ? <span className={`absolute inset-y-0 left-[35px] border-l-2 ${rama}`} /> : null}
      {nodo ? (
        <span className={`absolute top-5 size-4 rounded-full border-2 ${nodo.carril === "main" ? "left-1" : "left-7"} ${nodo.clase}`}>
          {nodo.actual ? <span className="absolute -inset-1 rounded-full border-2 border-primary motion-safe:animate-ping" /> : null}
        </span>
      ) : null}
    </span>
  );
}

// La curva que sale de main hacia la rama (o vuelve), en una fila corta.
function Curva({ hacia, main, rama }: { hacia: "rama" | "main"; main: string; rama: string }) {
  return (
    <li aria-hidden="true" className="flex h-6">
      <span className="relative block w-12 shrink-0">
        <span className={`absolute inset-y-0 left-[11px] border-l-2 ${main}`} />
        <svg className="absolute inset-0 overflow-visible" width="48" height="24" viewBox="0 0 48 24" fill="none">
          <path
            d={hacia === "rama" ? "M12 0 C 12 14, 36 10, 36 24" : "M36 0 C 36 14, 12 10, 12 24"}
            className={rama.includes("success") ? "stroke-success" : "stroke-border"}
            strokeWidth="2"
            strokeDasharray={rama.includes("dashed") ? "4 3" : undefined}
          />
        </svg>
      </span>
    </li>
  );
}

export function MapaRuta({ ruta, piezas }: Props) {
  const [avance, setAvance] = useState<Record<string, AvanceCaso> | null>(null);
  const [ordenLibre, setOrdenLibre] = useState(false);
  const [conBeta, setConBeta] = useState(false);
  const [sesion, setSesion] = useState<"cargando" | "con" | "sin">("cargando");

  useEffect(() => {
    let vigente = true;
    fetch("/api/progreso/resumen", { cache: "no-store" })
      .then(async (respuesta) => {
        if (!vigente) return;
        if (!respuesta.ok) return setSesion("sin");
        const datos = (await respuesta.json()) as { casos: Record<string, AvanceCaso>; ordenLibre?: boolean; accesoBeta?: boolean };
        if (!vigente) return;
        setAvance(datos.casos);
        setOrdenLibre(Boolean(datos.ordenLibre));
        setConBeta(Boolean(datos.accesoBeta));
        setSesion("con");
      })
      .catch(() => vigente && setSesion("sin"));
    return () => {
      vigente = false;
    };
  }, []);

  const { etapas, resumen } = armarMapa(piezas, avance, { ordenLibre });
  const ultimoCaso = [...etapas].reverse().find((etapa) => etapa.caso)?.caso ?? null;
  const release = resumen.completa ? "completo" : "release";

  return (
    <div className="grid gap-6">
      {ruta.beta && sesion !== "cargando" ? (
        sesion === "con" && conBeta ? (
          <p role="status" className="card p-4 text-sm leading-6">
            <span className="badge mr-2">Beta</span>
            Estás probando esta ruta antes que el resto. Si algo falla o no se entiende, usa «Reportar un problema» al pie de la página.
          </p>
        ) : (
          <AvisoBeta sesion={sesion === "con"} volverA={`/rutas/${ruta.slug}`} className="card p-4" />
        )
      ) : null}
      {sesion === "con" ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Tu avance en la ruta">
          <Barra etiqueta="Lecciones" descripcion="Lecciones aprobadas" valor={resumen.leccionesAprobadas} total={resumen.lecciones} />
          <Barra etiqueta="Casos" descripcion="Casos completados" valor={resumen.casosCompletos} total={resumen.casos} />
        </div>
      ) : sesion === "sin" ? (
        <p className="card p-4 text-sm leading-6">
          <span className="font-mono font-bold text-primary">{"$ git config user.name "}</span>
          <span className="text-muted-foreground">sin configurar. </span>
          <Link className="font-bold text-primary hover:underline" href={`/registro?callbackUrl=${encodeURIComponent(`/rutas/${ruta.slug}`)}`}>
            Crea tu cuenta
          </Link>{" "}
          para guardar tu avance y ver dónde está tu HEAD.
        </p>
      ) : (
        <div className="h-14" aria-hidden="true" />
      )}

      <ol className="grid" aria-label={`Mapa de la ruta ${ruta.titulo}`}>
        {etapas.map((etapa, indice) => {
          const clases = etapa.clases;
          const caso = etapa.caso;
          const lineaMain = linea(clases?.estado ?? caso?.estado ?? "disponible");
          return [
            clases ? <Curva key={`${indice}-sale`} hacia="rama" main={lineaMain} rama={linea(clases.estado)} /> : null,
            clases ? (
              <li key={clases.slug} className="flex gap-1 pb-3">
                <Carril main={lineaMain} rama={linea(clases.estado)} nodo={{ carril: "rama", clase: NODO[clases.estado], actual: clases.estado === "en_curso" }} />
                <Commit
                  pieza={clases}
                  mensaje={`feat: ${clases.unidades} lecciones`}
                  decoraciones={
                    <>
                      {clases.estado === "en_curso" ? <Decoracion tono="head">HEAD -&gt; tú</Decoracion> : null}
                      <Decoracion tono="rama">{etapa.rama}</Decoracion>
                    </>
                  }
                />
              </li>
            ) : null,
            clases && caso ? <Curva key={`${indice}-vuelve`} hacia="main" main={lineaMain} rama={linea(clases.estado)} /> : null,
            caso ? (
              <li key={caso.slug} className="flex gap-1 pb-3">
                <Carril main={linea(caso.estado)} nodo={{ carril: "main", clase: NODO[caso.estado], actual: caso.estado === "en_curso" }} />
                <Commit
                  pieza={caso}
                  mensaje={indice === 0 && !clases ? "Initial commit" : etapa.rama ? `Merge branch '${etapa.rama}'` : "feat: caso"}
                  decoraciones={
                    <>
                      {caso.estado === "en_curso" || caso.estado === "en_revision" ? <Decoracion tono="head">HEAD -&gt; tú</Decoracion> : null}
                      {caso === ultimoCaso ? <Decoracion tono="tag">deploy</Decoracion> : null}
                    </>
                  }
                />
              </li>
            ) : null,
          ];
        })}
        <li className="flex gap-1">
          <Carril main={linea(release)} nodo={{ carril: "main", clase: resumen.completa ? NODO.completo : "border-warning bg-background", actual: false }} />
          <div className={`card grid min-w-0 flex-1 gap-1.5 border-warning p-4 ${resumen.completa ? "" : "opacity-80"}`}>
            <span className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <span>{hashCorto(`${ruta.slug}-release`)}</span>
              <Decoracion tono="tag">tag: v1.0</Decoracion>
              <span>release</span>
            </span>
            <span className="font-black">{`Certificado ${ruta.titulo}`}</span>
            <span className="text-sm text-muted-foreground">
              {resumen.completa ? (
                <Link className="font-bold text-primary hover:underline" href="/dashboard">
                  Ver tu certificado en el panel
                </Link>
              ) : (
                "Se publica al completar todos los casos y clases de la ruta."
              )}
            </span>
          </div>
        </li>
      </ol>
    </div>
  );
}

function Barra({ etiqueta, descripcion, valor, total }: { etiqueta: string; descripcion: string; valor: number; total: number }) {
  const porcentaje = Math.round((valor / Math.max(total, 1)) * 100);
  return (
    <div className="card grid gap-2 p-4">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-black">{etiqueta}</span>
        <span className="font-mono text-sm text-muted-foreground">{`${valor}/${total}`}</span>
      </span>
      <span className="h-2 overflow-hidden rounded-full bg-surface-raised" role="progressbar" aria-label={descripcion} aria-valuemin={0} aria-valuemax={total} aria-valuenow={valor}>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${porcentaje}%` }} />
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Las páginas**

`apps/web/src/app/(misiones)/casos/[caso]/page.tsx` completo:
```tsx
import { notFound } from "next/navigation";
import { tareasDeMision } from "@syntaxerror/content/publicacion";
import { ResenasCaso } from "@/components/comunidad/resenas-caso";
import { AsistenteFlotante } from "@/components/ia/asistente-flotante";
import { DatosDelCaso } from "@/components/mision/datos-del-caso";
import { PanelCaso } from "@/components/mision/panel-caso";
import { RubricaDelCaso } from "@/components/mision/rubrica-del-caso";
import { casosParaConstruir, casosSoloParaProbadores, obtenerCaso, rutasParaConstruir } from "@/lib/contenido";
import { requisitosDelCaso } from "@/lib/progreso/requisitos-contenido";

export const dynamic = "error";
export const dynamicParams = false;
type Parametros = { params: Promise<{ caso: string }> };

export async function generateStaticParams() {
  return (await casosParaConstruir()).map((caso) => ({ caso: caso.slug }));
}

export async function generateMetadata({ params }: Parametros) {
  const caso = await obtenerCaso((await params).caso);
  // Un caso solo de rutas en beta no se indexa hasta que se publique.
  const enBeta = caso ? (await casosSoloParaProbadores()).has(caso.slug) : false;
  return { title: caso?.titulo ?? "Caso", ...(enBeta ? { robots: { index: false, follow: false } } : {}) };
}

export default async function CasoPage({ params }: Parametros) {
  const caso = await obtenerCaso((await params).caso);
  if (!caso) notFound();
  const requisitos = requisitosDelCaso(await rutasParaConstruir(), await casosParaConstruir(), caso.slug);
  const soloProbadores = (await casosSoloParaProbadores()).has(caso.slug);
  const esClases = caso.tipo === "clases";
  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{esClases ? "> clases" : `> caso: ${caso.empresa}`}</p>
        <h1 className="text-3xl font-black">{caso.titulo}</h1>
        <p className="leading-7 text-muted-foreground">
          {esClases
            ? `Una lección por tema, paso a paso y con datos de práctica: ${caso.dataset}. Al aprobarlas todas se habilita el caso siguiente, donde las usas en un trabajo real.`
            : `Llegas como ${caso.cargo.toLowerCase()} a ${caso.empresa}. Datos del caso: ${caso.dataset}.`}
        </p>
      </header>
      <PanelCaso
        soloProbadores={soloProbadores}
        caso={caso.slug}
        tipo={caso.tipo}
        entregable={caso.entregable}
        requisitos={requisitos}
        misiones={caso.misiones.map((mision) => ({ slug: mision.slug, titulo: mision.titulo, tiempo: mision.tiempo, sinGuia: mision.sinGuia, tareas: tareasDeMision(mision).map((tarea) => tarea.props.id) }))}
      />
      {esClases ? null : <RubricaDelCaso rubrica={caso.rubrica} />}
      <DatosDelCaso caso={caso.slug} datos={caso.datos} />
      <ResenasCaso caso={caso.slug} />
      <AsistenteFlotante caso={caso.slug} />
    </main>
  );
}
```

`apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx` completo:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { compilarMision } from "@syntaxerror/content/bloques";
import { archivosPython, paquetesPython } from "@syntaxerror/content/datos";
import { tareasDeMision } from "@syntaxerror/content/publicacion";
import { AsistenteFlotante } from "@/components/ia/asistente-flotante";
import { componentesMision } from "@/components/mision/componentes";
import { MisionProvider } from "@/components/mision/mision-provider";
import { PreguntaDocente } from "@/components/mision/pregunta-docente";
import { Tutor } from "@/components/mision/tutor";
import { casosParaConstruir, casosSoloParaProbadores, obtenerCaso, rutasParaConstruir } from "@/lib/contenido";
import { requisitosDelCaso } from "@/lib/progreso/requisitos-contenido";
import { unidad } from "@/lib/unidad";

export const dynamic = "error";
export const dynamicParams = false;
type Parametros = { params: Promise<{ caso: string; mision: string }> };

export async function generateStaticParams() {
  return (await casosParaConstruir()).flatMap((caso) => caso.misiones.map((mision) => ({ caso: caso.slug, mision: mision.slug })));
}

async function buscar(params: Parametros["params"]) {
  const { caso: slugCaso, mision: slugMision } = await params;
  const caso = await obtenerCaso(slugCaso);
  const indice = caso ? caso.misiones.findIndex((mision) => mision.slug === slugMision) : -1;
  return caso && indice >= 0 ? { caso, indice, mision: caso.misiones[indice] } : null;
}

export async function generateMetadata({ params }: Parametros) {
  const encontrada = await buscar(params);
  // Una misión solo de rutas en beta no se indexa hasta que se publique.
  const enBeta = encontrada ? (await casosSoloParaProbadores()).has(encontrada.caso.slug) : false;
  return { title: encontrada ? `${encontrada.mision.titulo} · ${encontrada.caso.titulo}` : "Misión", ...(enBeta ? { robots: { index: false, follow: false } } : {}) };
}

export default async function MisionPage({ params }: Parametros) {
  const encontrada = await buscar(params);
  if (!encontrada) notFound();
  const { caso, indice, mision } = encontrada;
  const Contenido = await compilarMision(mision.fuente);
  const usaPython = mision.bloques.some((bloque) => bloque.tipo === "PythonTask" || bloque.tipo === "PythonEjemplo");
  const anterior = caso.misiones[indice - 1];
  const siguiente = caso.misiones[indice + 1];
  const requisitos = requisitosDelCaso(await rutasParaConstruir(), await casosParaConstruir(), caso.slug);
  const soloProbadores = (await casosSoloParaProbadores()).has(caso.slug);
  const sinGuia = mision.sinGuia;
  const tareas = tareasDeMision(mision).map((tarea) => tarea.props.id);
  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6">
      <nav className="text-sm" aria-label="Volver al caso"><Link className="font-bold text-primary hover:underline" href={`/casos/${caso.slug}`}>{`← ${caso.titulo}`}</Link></nav>
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">{`> ${unidad(caso.tipo).nombre} ${indice + 1}/${caso.misiones.length} · ${mision.tiempo} min`}</p>
        <h1 className="text-3xl font-black">{mision.titulo}</h1>
        {sinGuia ? (
          <p className="card border-primary p-3 text-sm leading-6">
            <span className="badge mr-2">Misión sin guía</span>
            Aquí demuestras lo aprendido en el caso: no hay concepto, ejemplos ni pistas. El tutor te acompaña con preguntas después de varios intentos.
          </p>
        ) : null}
      </header>
      <MisionProvider
        caso={caso.slug}
        mision={mision.slug}
        tareas={tareas}
        python={usaPython ? { paquetes: paquetesPython(mision), archivos: archivosPython(caso) } : null}
        anterior={anterior ? { slug: anterior.slug, titulo: anterior.titulo, tareas: tareasDeMision(anterior).map((tarea) => tarea.props.id) } : null}
        requisitos={requisitos}
        sinGuia={sinGuia}
        soloProbadores={soloProbadores}
      >
        <article className="grid gap-6"><Contenido components={componentesMision(caso)} /></article>
        <Tutor caso={caso.slug} mision={mision.slug} />
      </MisionProvider>
      <PreguntaDocente caso={caso.slug} mision={mision.slug} />
      <nav className="flex justify-between gap-4 text-sm font-bold" aria-label="Misiones cercanas">
        {anterior ? <Link className="text-primary hover:underline" href={`/casos/${caso.slug}/${anterior.slug}`}>{`← ${anterior.titulo}`}</Link> : <span />}
        {siguiente ? <Link className="text-primary hover:underline" href={`/casos/${caso.slug}/${siguiente.slug}`}>{`${siguiente.titulo} →`}</Link> : null}
      </nav>
      <AsistenteFlotante caso={caso.slug} />
    </main>
  );
}
```

`apps/web/src/app/(misiones)/rutas/[ruta]/page.tsx` completo:
```tsx
import { notFound } from "next/navigation";
import { MapaRuta } from "@/components/rutas/mapa-ruta";
import { casosDeRuta, obtenerRuta, rutasParaConstruir } from "@/lib/contenido";
import type { PiezaRuta } from "@/lib/rutas/mapa";

export const dynamic = "error";
export const dynamicParams = false;
type Parametros = { params: Promise<{ ruta: string }> };

export async function generateStaticParams() {
  return (await rutasParaConstruir()).map((ruta) => ({ ruta: ruta.slug }));
}

export async function generateMetadata({ params }: Parametros) {
  const ruta = await obtenerRuta((await params).ruta);
  // Una ruta en beta no se indexa hasta que se publique.
  return { title: ruta?.titulo ?? "Ruta", ...(ruta?.estado === "beta" ? { robots: { index: false, follow: false } } : {}) };
}

export default async function RutaPage({ params }: Parametros) {
  const ruta = await obtenerRuta((await params).ruta);
  if (!ruta) notFound();
  const piezas: PiezaRuta[] = (await casosDeRuta(ruta)).map((caso) => ({
    slug: caso.slug,
    titulo: caso.titulo,
    tipo: caso.tipo,
    empresa: caso.empresa,
    unidades: caso.misiones.length,
  }));
  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{`$ git log --graph --reverse ${ruta.slug}`}</p>
        <h1 className="text-3xl font-black">{ruta.titulo}</h1>
        <p className="text-sm font-bold text-muted-foreground">{ruta.cargo}</p>
        <p className="leading-7 text-muted-foreground">{ruta.descripcion}</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Cada clase es una rama: aprendes en ella y se fusiona en el caso que la aplica, en un trabajo real.
        </p>
      </header>
      <MapaRuta ruta={{ slug: ruta.slug, titulo: ruta.titulo, beta: ruta.estado === "beta" }} piezas={piezas} />
    </main>
  );
}
```

`apps/web/src/app/(dashboard)/dashboard/page.tsx` completo:
```tsx
import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { AvisoVerificacion } from "@/components/cuenta/aviso-verificacion";
import { auth } from "@/lib/auth";
import { fechaCertificado } from "@/lib/certificados/formato";
import { listarCertificados } from "@/lib/certificados/servicio";
import { accesoBeta } from "@/lib/beta";
import { casosParaConstruir, rutasEnBeta } from "@/lib/contenido";
import { necesitaVerificar } from "@/lib/cuenta/verificacion";
import { calcularNivel } from "@/lib/puntos/niveles";
import { obtenerNivel } from "@/lib/puntos/servicio";
import { siguientePaso } from "@/lib/progreso/continuar";
import { listarCasosDelUsuario } from "@/lib/progreso/servicio";
import { unidad } from "@/lib/unidad";

export const metadata = { title: "Tu panel" };

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "estudiante";
  const userId = session?.user?.id;
  const db = getDb();
  const casosDelUsuario = userId ? await listarCasosDelUsuario(db, userId) : [];
  const certificados = userId ? await listarCertificados(db, userId) : [];
  const nivel = userId ? await obtenerNivel(db, userId) : calcularNivel(0);
  const verificar = userId ? await necesitaVerificar(db, userId) : false;
  const casos = await casosParaConstruir();
  // Las rutas en beta no salen en /rutas: los probadores y admins las encuentran aquí.
  const betas = userId && (await accesoBeta(db, userId)) ? await rutasEnBeta() : [];
  const publicados = new Set(casos.map((caso) => caso.slug));
  // Las clases se cuentan en lecciones; el progreso guardado no sabe el tipo, el contenido sí.
  const esClases = (slug: string) => casos.find((caso) => caso.slug === slug)?.tipo === "clases";
  const paso = userId ? await siguientePaso(db, userId, publicados) : null;
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-sm font-bold text-primary">{"> whoami"}</p>
      <h1 className="text-3xl font-black">Hola, {name}</h1>
      <p className="max-w-2xl leading-7 text-muted-foreground">
        Aquí vas a ver tus casos y clases en curso, tus entregables y tus certificados.
      </p>
      {verificar ? <AvisoVerificacion /> : null}
      {paso ? (
        <section className="card grid gap-3 border-primary p-5" aria-label="Continuar">
          <p className="font-mono text-sm font-bold text-primary">{"> continuar"}</p>
          {paso.tipo === "mision" ? (
            <p className="leading-7">
              {esClases(paso.caso.slug) ? (
                <>
                  Sigue con <strong>{paso.mision.titulo}</strong>, de <strong>{paso.caso.titulo}</strong>.
                </>
              ) : (
                <>
                  Sigue con <strong>{paso.mision.titulo}</strong>, del caso <strong>{paso.caso.titulo}</strong>.
                </>
              )}
            </p>
          ) : (
            <p className="leading-7">
              Aprobaste todas las misiones de <strong>{paso.caso.titulo}</strong>. Te falta enlazar tu entregable para completarlo.
            </p>
          )}
          <div>
            <Link href={paso.href} className="btn btn-primary">{paso.tipo === "mision" ? `Continuar ${unidad(esClases(paso.caso.slug) ? "clases" : "caso").nombre}` : "Ir al caso"}</Link>
          </div>
        </section>
      ) : null}
      <section className="card grid gap-1 p-4" aria-label="Tu nivel">
        <p className="font-mono text-sm font-bold text-primary">{`> nivel ${nivel.nivel}`}</p>
        <p className="text-xl font-black">{`${nivel.puntos} puntos`}</p>
        <p className="text-sm text-muted-foreground">
          {`Te faltan ${nivel.faltan} para el nivel ${nivel.nivel + 1}. Sumas puntos al aprobar misiones, completar casos y acertar decisiones.`}
        </p>
      </section>
      <nav className="flex flex-wrap gap-3 text-sm font-bold" aria-label="Comunidad">
        <Link className="text-primary hover:underline" href="/dashboard/preguntas">Tus preguntas a docentes</Link>
        <Link className="text-primary hover:underline" href="/dashboard/clases">Tus clases</Link>
        <Link className="text-primary hover:underline" href="/dashboard/mensajes">Tus mensajes</Link>
      </nav>
      {betas.length > 0 ? (
        <section className="card grid gap-3 border-primary p-5" aria-label="Rutas en beta">
          <h2 className="text-xl font-black">Rutas en beta</h2>
          <p className="text-sm text-muted-foreground">Las estás probando antes que el resto: no aparecen en el listado de rutas. Si algo falla, usa «Reportar un problema».</p>
          <ul className="grid gap-2">
            {betas.map((ruta) => (
              <li key={ruta.slug}>
                <Link className="font-bold text-primary hover:underline" href={`/rutas/${ruta.slug}`}>
                  {ruta.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus casos y clases</h2>
        {casosDelUsuario.length === 0 ? (
          <p className="text-muted-foreground">
            Todavía no empiezas ningún caso.{" "}
            <Link className="font-bold text-primary hover:underline" href="/rutas">
              Mira las rutas
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-3">
            {casosDelUsuario.map((caso) => (
              <li key={caso.slug}>
                <Link href={`/casos/${caso.slug}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
                  <span className="font-bold">{caso.titulo}</span>
                  <span className="badge">{caso.completo ? "Completo" : `${caso.misionesAprobadas}/${caso.totalMisiones} ${esClases(caso.slug) ? "lecciones" : "misiones"}`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus certificados</h2>
        {certificados.length === 0 ? (
          <p className="text-muted-foreground">Cuando completes casos o rutas, aparecerán aquí.</p>
        ) : (
          <ul className="grid gap-3">
            {certificados.map((certificado) => (
              <li key={certificado.codigo}>
                <Link href={`/certificados/${certificado.codigo}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
                  <span>
                    <span className="block font-bold">{certificado.titulo}</span>
                    <span className="block text-sm text-muted-foreground">{fechaCertificado(certificado.emitidoEn)}</span>
                  </span>
                  <span className="badge">{certificado.tipo === "ruta" ? "Ruta" : "Caso"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
```

En `apps/web/src/app/(misiones)/casos/[caso]/datos/[archivo]/route.ts` y `apps/web/src/app/(dashboard)/profesor/entregables/page.tsx`, `casosParaPublicar` pasa a `casosParaConstruir` (en el import y en su uso).

En `README.md`, en la sección de contenido, la línea "En desarrollo se ven también las rutas en `borrador`..." se reemplaza por:
```markdown
- Una ruta tiene `estado: publicada`, `beta` o `borrador`.
  - **`publicada`:** se lista en `/rutas`, el buscador y el sitemap.
  - **`beta`:** sus páginas se construyen en producción, pero no se listan ni se indexan (`noindex`). Solo la hacen los probadores y los admins: al resto, el servidor le responde 403 `solo_probadores` en progreso, entregables, tutor y asistente, y las páginas muestran un aviso de beta. Los probadores la encuentran en su panel ("Rutas en beta"). Para abrirla a todos, se cambia a `publicada`.
  - **`borrador`:** no se construye en producción.
- En desarrollo y en los e2e se ven todas, incluidas las de `borrador` (`CONTENT_INCLUDE_DRAFTS=true`), y el cierre de las rutas beta no corre (sí el aviso).
- `db-setup` sincroniza rutas y casos con la base en cada `npm run dev`.
```

En "Probadores y orden de las rutas", "...sin esperar la misión ni el caso anterior, para probarlas antes que el resto (un admin también puede marcarse a sí mismo)." pasa a "...sin esperar la misión ni el caso anterior, y entra a las rutas en `beta`, para probarlas antes que el resto (un admin también puede marcarse a sí mismo; los admins entran a las rutas beta siempre).".

- [ ] **Step 5: Correr todo**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content validate && pnpm --filter web exec tsc --noEmit && pnpm -r --if-present test"`
Expected: `[content] ok: 2 rutas, 12 casos, 174 misiones`; sin errores de tipos; web 373 pruebas.

Run: `npm run test:e2e`
Expected: `61 passed`, dos corridas seguidas.

**La revisión de producción** (opcional, toma unos minutos): construye la imagen sin borradores y revisa lo generado.

Run: `docker build -f docker/web.Dockerfile --build-arg CONTENT_INCLUDE_DRAFTS=false --build-arg NEXT_PUBLIC_SITE_URL=https://syntaxerror.cl -t web-sin-borradores .`

Run: `docker run --rm --entrypoint sh web-sin-borradores -c 'd=/app/apps/web/.next/server/app; ls $d/rutas/data-analyst.html $d/casos/clases-de-sql/05-join-inner.html; grep -c "Data Analyst" $d/rutas.html; grep -o "noindex[^\"]*" $d/rutas/data-analyst.html | head -1'`
Expected: los dos archivos existen, `0` y `noindex, nofollow`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src "e2e/tests/beta.spec.ts" README.md
git commit -m "feat(beta): avisos de ruta en beta, rutas en beta en el panel y paginas sin indexar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Al desplegar

En producción (Railway), con la imagen sin borradores:
1. Marca a tus probadores en `/admin/usuarios`.
2. Ellos entran a la ruta desde **Rutas en beta**, en su panel.
3. Cuando termine la prueba, en `content/rutas/data-analyst.yaml` cambia `estado: beta` por `estado: publicada` y despliega. Queda abierta para todos, con el orden normal, y el avance de los probadores se conserva.
