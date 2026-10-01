# Fase 3e1: Recorrido y ayudas. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar a la plataforma las reglas de aprendizaje aprobadas por el equipo:
- orden obligatorio de misiones y casos;
- pistas y tutor IA solo después de intentar;
- misión final sin guía;
- entregables verificados en GitHub y revisados con rúbrica antes del certificado.

**Architecture:**
- **Orden obligatorio:**
  - El servidor rechaza con 409 cualquier intento en una misión cuya anterior no está aprobada, o en un caso cuyo caso anterior en la ruta no está completo.
  - Los prerrequisitos salen de `ruta_casos.orden`. Solo cuenta el caso inmediatamente anterior de cada ruta visible que contiene el caso, porque ese ya exigió el suyo.
  - En el navegador, la misión se puede leer, pero sus tareas se desactivan hasta cumplir el requisito ("estricto para certificar, flexible para explorar").
- **Intentos fallidos:**
  - `mision_progreso.fallidos` cuenta en el servidor los intentos fallidos de cada misión. De ahí sale el umbral del tutor: 3 intentos, o 5 en una misión sin guía.
  - Las pistas cuentan los intentos por tarea en el navegador: la primera aparece tras 2 intentos fallidos y luego una más por cada intento fallido. Es un empujón pedagógico, no una barrera de seguridad: las pistas ya viajan en la página estática.
- **Misión sin guía:**
  - Se marca con `sinGuia: true` en el frontmatter.
  - El validador exige que no tenga concepto, ejemplos ni pistas, y que la última misión de todo caso de una ruta publicada sea sin guía.
  - El tutor recibe la instrucción de responder con preguntas.
- **Entregables:**
  - El enlace debe ser un repositorio de GitHub.
  - Al enviarlo, la plataforma lo revisa por la API de GitHub: que exista, que sea público, que tenga README y los archivos que pide el caso (`archivos` en `caso.yaml`).
  - Si pasa, queda `pendiente` y avisa a quien revisa: su docente, si está en una clase con ese caso, o administración.
  - La revisión usa la rúbrica del caso (`rubrica` en `caso.yaml`, con una base común).
  - Solo un entregable `aprobado` completa el caso y emite el certificado. `observado` devuelve un comentario y permite reenviar.
  - En desarrollo y en e2e, `ENTREGABLES_VERIFICACION=prueba` reemplaza la llamada a GitHub.

**Tech Stack:** Next.js 15, React 19, Drizzle ORM 0.36, zod 3, la API REST de GitHub (`api.github.com`, sin SDK), Vitest 4 y Playwright 1.55.

**Spec:** `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md` (secciones 7.5 y 9) y la propuesta aprobada, `docs/propuesta-pedagogica-data-analyst.md`, en particular:
- 2: principios;
- 5: misión sin guía;
- 6: ayuda escalonada;
- 7: orden y prerrequisitos;
- 9: evaluación y certificación;
- 14: implicancias en la plataforma.

## Global Constraints

**Entorno y texto**
- Todo se ejecuta en contenedores. Ningún paso corre `pnpm` o `node` en el host: se usa `docker compose run --rm tools ...`.
- Si los contenedores de la v1 (`cursos-*`) están arriba, ocupan los puertos 5432, 5433, 6379, 1025 y 8025. Detenlos antes con `docker compose -p cursos stop`.
- El texto visible va en español de Chile, con tildes y `¿`/`¡`, tratando de tú, sin voseo y con lenguaje neutro.

**Páginas**
- `/casos/[caso]` y `/casos/[caso]/[mision]` siguen con `dynamic = "error"` y se sirven con `x-nextjs-cache: HIT`. El bloqueo y las ayudas se deciden en el navegador con el progreso que entrega la API.

**Umbrales**
- Los umbrales viven en un solo lugar, `apps/web/src/lib/progreso/ayudas.ts`:
  - `INTENTOS_PARA_PISTA = 2`;
  - `INTENTOS_PARA_TUTOR = 3`;
  - `INTENTOS_PARA_TUTOR_SIN_GUIA = 5`.
- El equipo puede ajustarlos ahí (pregunta abierta 2 de la propuesta).

**Reglas que no se relajan**
- **El servidor es la autoridad sobre el orden y la aprobación:** un intento fuera de orden se rechaza aunque el navegador lo permita.
- **El certificado solo se emite con:** todas las misiones aprobadas, incluida la sin guía, y el entregable `aprobado` por una persona con la rúbrica completa.
- **La verificación de GitHub nunca deja pasar un repositorio que no se pudo revisar:** si GitHub no responde, se pide intentar más tarde.

**Commits**
- Mensajes en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Una persona manda por la API un intento de la misión 3 sin haber aprobado la 2** (o del caso 2 sin completar el 1), o sincroniza desde `localStorage` un lote desordenado. El servidor responde 409 o lo cuenta como rechazado, y no la aprueba ni suma puntos. Tests en Task 1.
2. **Un enlace de entregable raro:**
   - `http://`;
   - `github.com/usuario` sin repositorio;
   - con `/tree/main` al final o `.git`;
   - un repositorio privado, vacío o inexistente;
   - GitHub que tarda o limita las consultas.

   Los enlaces válidos con ruta interna o `.git` se normalizan al repositorio; el resto recibe un mensaje claro en español. Nunca pasa a revisión un repositorio que no se pudo verificar. Tests en Task 4.
3. **Reenviar el entregable después de aprobado, o dos docentes revisando el mismo a la vez.** Un entregable aprobado no se reemplaza (409), y de dos revisiones simultáneas solo se aplica una, con un solo certificado. Tests en Task 5.
4. **Una persona sin sesión abre la primera misión de un caso que requiere otro caso.** Puede leerla, pero sus tareas quedan desactivadas con un aviso para entrar y completar el caso anterior. La primera misión de un caso sin requisitos funciona sin sesión, como hoy. Test en Task 7.
5. **Preguntar al tutor por la API sin haber intentado** (saltándose la interfaz). El servidor responde 403 `tutor_bloqueado` con los intentos que lleva y el umbral. Test en Task 1.

## Estructura de archivos

```
packages/db/src/schema.ts                         + mision_progreso.fallidos; entregables con estado de revisión
packages/content/src/
  esquemas.ts                                     sinGuia; archivos y rubrica del caso; RUBRICA_BASE
  cargar.ts, tipos.ts                             Mision.sinGuia, Caso.archivos, Caso.rubrica
  validar.ts                                      reglas de la misión sin guía
apps/web/src/lib/progreso/
  requisitos.ts                                   casosRequeridos, casoPendiente
  ayudas.ts                                       umbrales, pistasDisponibles, tutorHabilitado
  requisitos-contenido.ts                         requisitos desde el contenido (páginas estáticas)
  servicio.ts                                     orden, fallidos, entregable y completitud
  cliente.ts                                      progreso visible con fallidos, bloqueo y revisión
apps/web/src/lib/tutor/acceso.ts                  estadoTutor
apps/web/src/lib/entregables/
  github.ts                                       parsearRepositorio, crearVerificadorGithub, verificadorPrueba
  verificador.ts                                  verificadorDesdeEntorno
  revision.ts                                     listar, revisar y avisar
apps/web/src/components/mision/                   provider, panel de tarea, tutor
apps/web/src/components/mision/panel-caso.tsx     estados del entregable
apps/web/src/components/comunidad/formulario-revision.tsx
apps/web/src/app/(dashboard)/profesor/entregables/page.tsx
apps/web/src/app/api/revision/entregables/[id]/route.ts
apps/worker/src/emails/mensajes.ts                entregable-por-revisar, entregable-observado
e2e/tests/recorrido.spec.ts
```

---

### Task 1: Orden obligatorio e intentos fallidos en el servidor

**Files:**
- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/drizzle/0006_<nombre>.sql` (generada)
- Create: `apps/web/src/lib/progreso/requisitos.ts`, `apps/web/src/lib/progreso/ayudas.ts`, `apps/web/src/lib/tutor/acceso.ts`
- Test: `apps/web/src/lib/progreso/requisitos.test.ts`, `apps/web/src/lib/progreso/ayudas.test.ts`, `apps/web/src/lib/tutor/acceso.test.ts`
- Modify: `apps/web/src/lib/progreso/servicio.ts`, `apps/web/src/lib/progreso/servicio.test.ts`, `apps/web/src/lib/contenido.ts`
- Modify:
  - `apps/web/src/app/api/progreso/route.ts`
  - `apps/web/src/app/api/progreso/sync/route.ts`
  - `apps/web/src/app/api/progreso/route.test.ts`
  - `apps/web/src/app/api/entregables/route.ts`
  - `apps/web/src/app/api/tutor/preguntas/route.ts`
  - `apps/web/src/app/api/tutor/route.test.ts`

**Interfaces:**
- Consumes: `misionProgreso`, `casoInscripciones`, `rutaCasos`, `rutas` y `casos` (Fase 2), y `otorgarPuntos`/`PUNTOS`/`CLAVE_CASO` (Fase 3c1).
- Produces en la base: `mision_progreso.fallidos` (entero, 0 por defecto).
- Produces en `@/lib/progreso/requisitos`:
  - `type CasoCorto = { slug: string; titulo: string }`;
  - `type OpcionesRequisitos = { incluirBorradores: boolean }`;
  - `casosRequeridos(db, casoId, opciones): Promise<(CasoCorto & { id: string })[]>`;
  - `casoPendiente(db, userId, casoId, opciones): Promise<CasoCorto | null>`.
- Produces en `@/lib/progreso/ayudas`:
  - `INTENTOS_PARA_PISTA = 2`, `INTENTOS_PARA_TUTOR = 3` e `INTENTOS_PARA_TUTOR_SIN_GUIA = 5`;
  - `pistasDisponibles(fallidos, total): number`;
  - `umbralTutor(sinGuia): number`;
  - `tutorHabilitado({ fallidos, aprobada, sinGuia }): boolean`.
- Produces en `@/lib/progreso/servicio`:
  - `CodigoErrorProgreso` con `mision_bloqueada` y `caso_bloqueado`, y `estadoHttp(codigo): 404 | 409`;
  - `EstadoMision = { estado; tareasAprobadas; fallidos: number }`;
  - `ProgresoCaso = { misiones; entregable; completo; bloqueadoPor: CasoCorto | null }`;
  - `registrarIntento(db, userId, intento, opciones?)` y `obtenerProgresoCaso(db, userId, slug, opciones?)`, donde `opciones` es `OpcionesRequisitos` y por defecto no incluye borradores.
- Produces en `@/lib/contenido`: `incluirBorradores()`, ahora exportada.
- Produces en `@/lib/tutor/acceso`:
  - `type EstadoTutor = { habilitado: boolean; fallidos: number; umbral: number }`;
  - `estadoTutor(db, userId, casoSlug, mision: { slug: string; sinGuia: boolean }): Promise<EstadoTutor>`.
- Produces en la API:
  - `POST /api/progreso` y `POST /api/entregables` responden 409 con `mision_bloqueada` o `caso_bloqueado`;
  - `POST /api/tutor/preguntas` responde 403 `{ error: "tutor_bloqueado", fallidos, umbral }`.

- [ ] **Step 1: Agregar `fallidos` y generar la migración**

En `packages/db/src/schema.ts`, dentro de `misionProgreso`, después de `intentos: integer("intentos").notNull().default(0),`, agregar:
```ts
    fallidos: integer("fallidos").notNull().default(0),
```

Run: `npm run db:generate`
Expected: crea `packages/db/drizzle/0006_<nombre>.sql` con `ALTER TABLE "mision_progreso" ADD COLUMN "fallidos" integer DEFAULT 0 NOT NULL;`.

- [ ] **Step 2: Escribir los tests que fallan**

`apps/web/src/lib/progreso/ayudas.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { pistasDisponibles, tutorHabilitado, umbralTutor } from "./ayudas";

describe("ayudas", () => {
  it("la primera pista llega tras 2 intentos fallidos y luego una por intento, sin pasarse del total", () => {
    expect([0, 1, 2, 3, 4, 9].map((fallidos) => pistasDisponibles(fallidos, 3))).toEqual([0, 0, 1, 2, 3, 3]);
    expect(pistasDisponibles(5, 0)).toBe(0);
  });

  it("el tutor se habilita a los 3 intentos, a los 5 sin guía, o con la misión aprobada", () => {
    expect(umbralTutor(false)).toBe(3);
    expect(umbralTutor(true)).toBe(5);
    expect(tutorHabilitado({ fallidos: 2, aprobada: false, sinGuia: false })).toBe(false);
    expect(tutorHabilitado({ fallidos: 3, aprobada: false, sinGuia: false })).toBe(true);
    expect(tutorHabilitado({ fallidos: 4, aprobada: false, sinGuia: true })).toBe(false);
    expect(tutorHabilitado({ fallidos: 0, aprobada: true, sinGuia: true })).toBe(true);
  });
});
```

`apps/web/src/lib/progreso/requisitos.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casoInscripciones, casos, rutaCasos, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { casoPendiente, casosRequeridos } from "./requisitos";

const { db, close } = createTestDb();
const PUBLICADAS = { incluirBorradores: false };

async function escenario() {
  const [ana] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
  const nuevos = await db
    .insert(casos)
    .values(["oficio", "planillas", "sql", "suelto"].map((slug) => ({ slug, titulo: slug.toUpperCase(), cargo: "A", empresa: "E", entregable: "R", misiones: [] })))
    .returning({ id: casos.id, slug: casos.slug });
  const id = (slug: string) => nuevos.find((caso) => caso.slug === slug)!.id;
  const [analista, borrador] = await db
    .insert(rutas)
    .values([
      { slug: "analista", titulo: "Analista", cargo: "A", descripcion: "R", estado: "publicada" },
      { slug: "otra", titulo: "Otra", cargo: "A", descripcion: "R", estado: "borrador" },
    ])
    .returning({ id: rutas.id });
  await db.insert(rutaCasos).values([
    { rutaId: analista.id, casoId: id("oficio"), orden: 0 },
    { rutaId: analista.id, casoId: id("planillas"), orden: 1 },
    { rutaId: analista.id, casoId: id("sql"), orden: 2 },
    { rutaId: borrador.id, casoId: id("suelto"), orden: 0 },
    { rutaId: borrador.id, casoId: id("oficio"), orden: 1 },
  ]);
  return { userId: ana.id, id };
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("requisitos entre casos", () => {
  it("un caso requiere el anterior de cada ruta visible, no toda la cadena", async () => {
    const { id } = await escenario();
    expect(await casosRequeridos(db, id("oficio"), PUBLICADAS)).toEqual([]);
    expect((await casosRequeridos(db, id("sql"), PUBLICADAS)).map((caso) => caso.slug)).toEqual(["planillas"]);
    expect((await casosRequeridos(db, id("oficio"), { incluirBorradores: true })).map((caso) => caso.slug)).toEqual(["suelto"]);
  });

  it("casoPendiente devuelve el caso anterior sin completar, o null", async () => {
    const { userId, id } = await escenario();
    expect(await casoPendiente(db, userId, id("planillas"), PUBLICADAS)).toEqual({ slug: "oficio", titulo: "OFICIO" });
    await db.insert(casoInscripciones).values({ userId, casoId: id("oficio") });
    expect(await casoPendiente(db, userId, id("planillas"), PUBLICADAS)).toEqual({ slug: "oficio", titulo: "OFICIO" });
    await db.update(casoInscripciones).set({ completadoEn: new Date() });
    expect(await casoPendiente(db, userId, id("planillas"), PUBLICADAS)).toBeNull();
    expect(await casoPendiente(db, userId, id("oficio"), PUBLICADAS)).toBeNull();
  });
});
```

`apps/web/src/lib/tutor/acceso.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, misionProgreso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { estadoTutor } from "./acceso";

const { db, close } = createTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("estadoTutor", () => {
  it("se habilita con los intentos fallidos suficientes o con la misión aprobada", async () => {
    const [ana] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    const [caso] = await db.insert(casos).values({ slug: "ventas", titulo: "V", cargo: "A", empresa: "E", entregable: "R", misiones: [] }).returning({ id: casos.id });
    const m1 = { slug: "m1", sinGuia: false };
    expect(await estadoTutor(db, ana.id, "ventas", m1)).toEqual({ habilitado: false, fallidos: 0, umbral: 3 });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m1", fallidos: 3 });
    expect(await estadoTutor(db, ana.id, "ventas", m1)).toEqual({ habilitado: true, fallidos: 3, umbral: 3 });
    expect(await estadoTutor(db, ana.id, "ventas", { slug: "m1", sinGuia: true })).toEqual({ habilitado: false, fallidos: 3, umbral: 5 });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m2", estado: "aprobada" });
    expect((await estadoTutor(db, ana.id, "ventas", { slug: "m2", sinGuia: true })).habilitado).toBe(true);
    expect((await estadoTutor(db, ana.id, "otro", m1)).habilitado).toBe(false);
  });
});
```

En `apps/web/src/lib/progreso/servicio.test.ts`:

1. Reemplazar el test `"un intento fallido suma intentos pero no aprueba la tarea"` por:
```ts
  it("un intento fallido suma intentos y fallidos, pero no aprueba la tarea", async () => {
    const { userId } = await prepararCaso();
    expect(await registrarIntento(db, userId, intento("m1", "t1", false))).toEqual({
      misionAprobada: false,
      casoCompleto: false,
    });
    const [fila] = await db.select().from(misionProgreso);
    expect(fila).toMatchObject({ estado: "en_curso", intentos: 1, fallidos: 1, tareasAprobadas: [] });
  });
```
2. En `"aprobar dos veces la misma tarea no la duplica ni cambia la fecha de aprobación"`:
   - antes de la primera llamada, agregar `await aprobarM1(userId);`;
   - cambiar los dos `db.select().from(misionProgreso)` por `db.select().from(misionProgreso).where(eq(misionProgreso.mision, "m2"))`.
3. Agregar, después de `const intento = ...`:
```ts
const aprobarM1 = async (userId: string) => {
  await registrarIntento(db, userId, intento("m1", "t1"));
  await registrarIntento(db, userId, intento("m1", "t2"));
};
```
4. En `sincronizarIntentos`, reemplazar el `toEqual` de `obtenerProgresoCaso` por:
```ts
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toEqual({
      misiones: { m1: { estado: "aprobada", tareasAprobadas: ["t1", "t2"], fallidos: 0 } },
      entregable: null,
      completo: false,
      bloqueadoPor: null,
    });
```
5. Agregar al final del `describe("registrarIntento", ...)`:
```ts
  it("rechaza intentos en una misión cuya anterior no está aprobada", async () => {
    const { userId } = await prepararCaso();
    await expect(registrarIntento(db, userId, intento("m2", "t3"))).rejects.toMatchObject({ codigo: "mision_bloqueada" });
    await expect(registrarIntento(db, userId, intento("m2", "t3", false))).rejects.toMatchObject({ codigo: "mision_bloqueada" });
    await registrarIntento(db, userId, intento("m1", "t1"));
    await expect(registrarIntento(db, userId, intento("m2", "t3"))).rejects.toMatchObject({ codigo: "mision_bloqueada" });
    await registrarIntento(db, userId, intento("m1", "t2"));
    expect(await registrarIntento(db, userId, intento("m2", "t3"))).toMatchObject({ misionAprobada: true });
  });

  it("rechaza intentos en un caso cuyo caso anterior en la ruta no está completo", async () => {
    const { userId, rutaId } = await prepararCaso();
    const [siguiente] = await db
      .insert(casos)
      .values({ slug: "stock", titulo: "Stock", cargo: "A", empresa: "E", entregable: "R", misiones: [{ slug: "s1", titulo: "S1", tareas: ["x"] }] })
      .returning({ id: casos.id });
    await db.insert(rutaCasos).values({ rutaId, casoId: siguiente.id, orden: 1 });
    const enStock = { caso: "stock", mision: "s1", tarea: "x", aprobada: true };
    await expect(registrarIntento(db, userId, enStock)).rejects.toMatchObject({ codigo: "caso_bloqueado" });
    await db.insert(casoInscripciones).values({ userId, casoId: (await db.select().from(casos).where(eq(casos.slug, "ventas")))[0].id, completadoEn: new Date() });
    expect(await registrarIntento(db, userId, enStock)).toMatchObject({ misionAprobada: true });
    expect((await obtenerProgresoCaso(db, userId, "stock"))?.bloqueadoPor).toBeNull();
  });

  it("obtenerProgresoCaso informa el caso que falta completar", async () => {
    const { userId, rutaId } = await prepararCaso();
    const [siguiente] = await db
      .insert(casos)
      .values({ slug: "stock", titulo: "Stock", cargo: "A", empresa: "E", entregable: "R", misiones: [] })
      .returning({ id: casos.id });
    await db.insert(rutaCasos).values({ rutaId, casoId: siguiente.id, orden: 1 });
    expect((await obtenerProgresoCaso(db, userId, "stock"))?.bloqueadoPor).toEqual({ slug: "ventas", titulo: "Ventas" });
  });
```
6. En `"sincronizarIntentos"` cambiar el lote por uno que incluya un intento desordenado:
```ts
    const lote = [intento("m1", "t1"), intento("m2", "t3"), intento("m1", "t2"), intento("m1", "t2"), { ...intento("m1", "t1"), caso: "borrado" }];
    expect(await sincronizarIntentos(db, userId, lote)).toEqual({ aplicados: 3, rechazados: 2 });
```

En `apps/web/src/app/api/progreso/route.test.ts`:
- en el test `"registra un intento y devuelve el progreso del caso"`, cambiar la expectativa de `consultar` por:
```ts
    expect(await (await consultar("ventas")).json()).toEqual({
      misiones: { m1: { estado: "aprobada", tareasAprobadas: ["t1"], fallidos: 0 } },
      entregable: null,
      completo: false,
      bloqueadoPor: null,
    });
```
- agregar al final del `describe`:
```ts
  it("responde 409 si la misión anterior no está aprobada", async () => {
    await iniciarSesion();
    await db.update(casos).set({ misiones: [{ slug: "m0", titulo: "M0", tareas: ["t0"] }, { slug: "m1", titulo: "M1", tareas: ["t1"] }] });
    const respuesta = await enviar(POST, aprobado);
    expect(respuesta.status).toBe(409);
    expect(await respuesta.json()).toEqual({ error: "mision_bloqueada" });
  });
```

En `apps/web/src/app/api/tutor/route.test.ts`:
- agregar `misionProgreso` al import de `@syntaxerror/db/schema`;
- dentro de `iniciarSesion`, antes del `return`, habilitar el tutor en la misión de prueba:
```ts
  const [caso] = await db.select({ id: casos.id }).from(casos);
  await db.insert(misionProgreso).values({ userId: usuario.id, casoId: caso.id, mision: "01-clientes-de-regiones", fallidos: 3 });
```
- agregar al final del `describe`:
```ts
  it("preguntas: sin los intentos suficientes responde 403 sin llamar a la IA", async () => {
    const [usuario] = await db.insert(users).values({ email: `sin-intentos-${Date.now()}@correo.cl` }).returning({ id: users.id });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
    const respuesta = await preguntar(pregunta());
    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual({ error: "tutor_bloqueado", fallidos: 0, umbral: 3 });
    expect(encolarTutor).not.toHaveBeenCalled();
  });
```

- [ ] **Step 3: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/progreso src/lib/tutor/acceso.test.ts src/app/api/progreso src/app/api/tutor`
Expected: FAIL. No se resuelven `./ayudas`, `./requisitos` ni `./acceso`, y los tests nuevos de orden y de 403 fallan.

- [ ] **Step 4: Crear `apps/web/src/lib/progreso/ayudas.ts`**

```ts
// Umbrales de la ayuda escalonada (propuesta pedagógica, sección 6). El equipo los ajusta aquí.
export const INTENTOS_PARA_PISTA = 2;
export const INTENTOS_PARA_TUTOR = 3;
export const INTENTOS_PARA_TUTOR_SIN_GUIA = 5;

// La primera pista llega tras INTENTOS_PARA_PISTA fallidos; después, una más por cada intento fallido.
export function pistasDisponibles(fallidos: number, total: number): number {
  if (fallidos < INTENTOS_PARA_PISTA) return 0;
  return Math.min(total, fallidos - INTENTOS_PARA_PISTA + 1);
}

export function umbralTutor(sinGuia: boolean): number {
  return sinGuia ? INTENTOS_PARA_TUTOR_SIN_GUIA : INTENTOS_PARA_TUTOR;
}

export function tutorHabilitado({ fallidos, aprobada, sinGuia }: { fallidos: number; aprobada: boolean; sinGuia: boolean }): boolean {
  return aprobada || fallidos >= umbralTutor(sinGuia);
}
```

- [ ] **Step 5: Crear `apps/web/src/lib/progreso/requisitos.ts`**

```ts
import { and, desc, eq, inArray, isNotNull, lt } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { casoInscripciones, casos, rutaCasos, rutas } from "@syntaxerror/db/schema";

export type CasoCorto = { slug: string; titulo: string };
export type OpcionesRequisitos = { incluirBorradores: boolean };

// Solo el caso inmediatamente anterior de cada ruta visible que contiene al caso: ese, a su vez, exigió el suyo.
export async function casosRequeridos(db: DbClient, casoId: string, { incluirBorradores }: OpcionesRequisitos): Promise<(CasoCorto & { id: string })[]> {
  const posiciones = await db
    .select({ rutaId: rutaCasos.rutaId, orden: rutaCasos.orden })
    .from(rutaCasos)
    .innerJoin(rutas, eq(rutas.id, rutaCasos.rutaId))
    .where(and(eq(rutaCasos.casoId, casoId), incluirBorradores ? undefined : eq(rutas.estado, "publicada")));
  const requeridos = new Map<string, CasoCorto & { id: string }>();
  for (const { rutaId, orden } of posiciones) {
    const [anterior] = await db
      .select({ id: casos.id, slug: casos.slug, titulo: casos.titulo })
      .from(rutaCasos)
      .innerJoin(casos, eq(casos.id, rutaCasos.casoId))
      .where(and(eq(rutaCasos.rutaId, rutaId), lt(rutaCasos.orden, orden)))
      .orderBy(desc(rutaCasos.orden))
      .limit(1);
    if (anterior) requeridos.set(anterior.id, anterior);
  }
  return [...requeridos.values()];
}

export async function casoPendiente(db: DbClient, userId: string, casoId: string, opciones: OpcionesRequisitos): Promise<CasoCorto | null> {
  const requeridos = await casosRequeridos(db, casoId, opciones);
  if (requeridos.length === 0) return null;
  const completos = await db
    .select({ casoId: casoInscripciones.casoId })
    .from(casoInscripciones)
    .where(and(eq(casoInscripciones.userId, userId), inArray(casoInscripciones.casoId, requeridos.map((caso) => caso.id)), isNotNull(casoInscripciones.completadoEn)));
  const hechos = new Set(completos.map((fila) => fila.casoId));
  const pendiente = requeridos.find((caso) => !hechos.has(caso.id));
  return pendiente ? { slug: pendiente.slug, titulo: pendiente.titulo } : null;
}
```

- [ ] **Step 6: Actualizar `apps/web/src/lib/progreso/servicio.ts`**

Aplicar estos cambios, conservando el resto del archivo:

1. Agregar a los imports:
```ts
import { casoPendiente, type CasoCorto, type OpcionesRequisitos } from "./requisitos";
```
2. Reemplazar las primeras definiciones de tipos por:
```ts
export type CodigoErrorProgreso = "caso_no_existe" | "mision_no_existe" | "tarea_no_existe" | "mision_bloqueada" | "caso_bloqueado";

const SOLO_PUBLICADAS: OpcionesRequisitos = { incluirBorradores: false };

export function estadoHttp(codigo: CodigoErrorProgreso): 404 | 409 {
  return codigo.endsWith("_no_existe") ? 404 : 409;
}
```
   `ErrorProgreso` queda igual.
3. Reemplazar `EstadoMision` y `ProgresoCaso` por:
```ts
export type EstadoMision = { estado: "en_curso" | "aprobada"; tareasAprobadas: string[]; fallidos: number };
export type ProgresoCaso = { misiones: Record<string, EstadoMision>; entregable: string | null; completo: boolean; bloqueadoPor: CasoCorto | null };
```
4. En `registrarIntento`:
   - cambiar la firma a `export async function registrarIntento(db: AppDb, userId: string, intento: IntentoTarea, opciones: OpcionesRequisitos = SOLO_PUBLICADAS)`;
   - justo después de `if (!mision.tareas.includes(intento.tarea)) throw new ErrorProgreso("tarea_no_existe");`, agregar:
```ts
    // El servidor es la autoridad sobre el orden: la misión anterior aprobada y el caso anterior completo.
    const indice = caso.misiones.findIndex((candidata) => candidata.slug === mision.slug);
    if (indice > 0) {
      const [previa] = await tx
        .select({ estado: misionProgreso.estado })
        .from(misionProgreso)
        .where(and(eq(misionProgreso.userId, userId), eq(misionProgreso.casoId, caso.id), eq(misionProgreso.mision, caso.misiones[indice - 1].slug)));
      if (previa?.estado !== "aprobada") throw new ErrorProgreso("mision_bloqueada");
    }
    if (await casoPendiente(tx, userId, caso.id, opciones)) throw new ErrorProgreso("caso_bloqueado");
```
   - en el `.set({ intentos: fila.intentos + 1, ... })`, agregar `fallidos: fila.fallidos + (intento.aprobada ? 0 : 1),`.
5. En `obtenerProgresoCaso`:
   - cambiar la firma a `export async function obtenerProgresoCaso(db: AppDb, userId: string, slug: string, opciones: OpcionesRequisitos = SOLO_PUBLICADAS): Promise<ProgresoCaso | null>`;
   - en la consulta de `misionProgreso`, agregar `fallidos: misionProgreso.fallidos` al `select`;
   - agregar `casoPendiente(db, userId, caso.id, opciones)` como cuarto elemento del `Promise.all`, desestructurado como `bloqueadoPor`;
   - en el `map` de `misiones`, agregar `fallidos: fila.fallidos`;
   - agregar `bloqueadoPor` al objeto devuelto.
6. En `sincronizarIntentos`, cambiar la firma a `(db: AppDb, userId: string, intentos: IntentoTarea[], opciones: OpcionesRequisitos = SOLO_PUBLICADAS)`, y la llamada interna a `registrarIntento(db, userId, intento, opciones)`.
7. En `guardarEntregable`, agregar el cuarto parámetro `opciones: OpcionesRequisitos = SOLO_PUBLICADAS`. En esta task no lo usa: la Task 5 reemplaza la función.

- [ ] **Step 7: Exportar `incluirBorradores` en `apps/web/src/lib/contenido.ts`**

Cambiar `function incluirBorradores(): boolean {` por `export function incluirBorradores(): boolean {`.

- [ ] **Step 8: Crear `apps/web/src/lib/tutor/acceso.ts`**

```ts
import { and, eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { casos, misionProgreso } from "@syntaxerror/db/schema";
import { tutorHabilitado, umbralTutor } from "@/lib/progreso/ayudas";

export type EstadoTutor = { habilitado: boolean; fallidos: number; umbral: number };

export async function estadoTutor(db: DbClient, userId: string, casoSlug: string, mision: { slug: string; sinGuia: boolean }): Promise<EstadoTutor> {
  const [fila] = await db
    .select({ estado: misionProgreso.estado, fallidos: misionProgreso.fallidos })
    .from(misionProgreso)
    .innerJoin(casos, eq(casos.id, misionProgreso.casoId))
    .where(and(eq(misionProgreso.userId, userId), eq(casos.slug, casoSlug), eq(misionProgreso.mision, mision.slug)));
  const fallidos = fila?.fallidos ?? 0;
  return {
    habilitado: tutorHabilitado({ fallidos, aprobada: fila?.estado === "aprobada", sinGuia: mision.sinGuia }),
    fallidos,
    umbral: umbralTutor(mision.sinGuia),
  };
}
```

- [ ] **Step 9: Usar las reglas en las rutas**

`apps/web/src/app/api/progreso/route.ts`:
- agregar `import { incluirBorradores } from "@/lib/contenido";` y agregar `estadoHttp` al import de `@/lib/progreso/servicio`;
- en `GET`, llamar a `obtenerProgresoCaso(getDb(), userId, caso, { incluirBorradores: incluirBorradores() })`;
- en `POST`, llamar a `registrarIntento(db, userId, parsed.data, { incluirBorradores: incluirBorradores() })`;
- cambiar `{ status: 404 }` del `catch` por `{ status: estadoHttp(error.codigo) }`.

`apps/web/src/app/api/progreso/sync/route.ts`:
- agregar `import { incluirBorradores } from "@/lib/contenido";`;
- llamar a `sincronizarIntentos(db, userId, parsed.data.intentos, { incluirBorradores: incluirBorradores() })`.

`apps/web/src/app/api/entregables/route.ts`:
- agregar `estadoHttp` al import de `@/lib/progreso/servicio`;
- cambiar `{ status: 404 }` del `catch` por `{ status: estadoHttp(error.codigo) }`.

`apps/web/src/app/api/tutor/preguntas/route.ts`:
- agregar `import { estadoTutor } from "@/lib/tutor/acceso";`;
- justo después de `if (!caso || !mision) return ...404`, agregar:
```ts
  // Primero intentar: el tutor se habilita tras los intentos fallidos de la misión (propuesta, sección 6).
  const acceso = await estadoTutor(getDb(), userId, caso.slug, { slug: mision.slug, sinGuia: mision.sinGuia ?? false });
  if (!acceso.habilitado) {
    return NextResponse.json({ error: "tutor_bloqueado", fallidos: acceso.fallidos, umbral: acceso.umbral }, { status: 403 });
  }
```

`mision.sinGuia` existirá desde la Task 3. Hasta entonces, el `?? false` y el tipo `Mision` sin esa propiedad harían fallar `tsc`. Para que esta task compile sola, agregar ahora `sinGuia?: boolean` al tipo `Mision` en `packages/content/src/tipos.ts`. La Task 3 lo vuelve obligatorio.

- [ ] **Step 10: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected:
- PASS en todos los paquetes, incluidos los tests nuevos de `ayudas`, `requisitos` y `acceso`;
- los de `servicio` (orden, fallidos y sincronización desordenada), `progreso` (409) y `tutor` (403);
- `tsc` sin errores.

Si otro test del repositorio aprueba una misión sin haber aprobado la anterior (por ejemplo, `puntos/servicio.test.ts` con más de una misión), ajústalo para que apruebe en orden. La regla es de negocio, no se relaja en los tests.

- [ ] **Step 11: Commit**

```bash
git add packages/db packages/content/src/tipos.ts apps/web/src/lib/progreso apps/web/src/lib/tutor/acceso.ts apps/web/src/lib/tutor/acceso.test.ts apps/web/src/lib/contenido.ts apps/web/src/app/api/progreso apps/web/src/app/api/entregables/route.ts apps/web/src/app/api/tutor
git commit -m "feat(recorrido): orden obligatorio de misiones y casos, intentos fallidos y tutor despues de intentar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Bloqueo, pistas y tutor en el navegador

**Files:**
- Modify: `apps/web/src/lib/progreso/cliente.ts`, `apps/web/src/lib/progreso/cliente.test.ts`
- Create: `apps/web/src/lib/progreso/requisitos-contenido.ts`
- Test: `apps/web/src/lib/progreso/requisitos-contenido.test.ts`
- Modify:
  - `apps/web/src/components/mision/mision-provider.tsx`
  - `apps/web/src/components/mision/panel-tarea.tsx`
  - `apps/web/src/components/mision/sql-task.tsx`
  - `apps/web/src/components/mision/sheet-task.tsx`
  - `apps/web/src/components/mision/python-task.tsx`
  - `apps/web/src/components/mision/tutor.tsx`
  - `apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx`

**Interfaces:**
- Consumes:
  - `EstadoMision` con `fallidos` y `ProgresoCaso.bloqueadoPor` (Task 1);
  - `CasoCorto` (`@/lib/progreso/requisitos`);
  - `pistasDisponibles`, `tutorHabilitado`, `umbralTutor` e `INTENTOS_PARA_PISTA` (`@/lib/progreso/ayudas`);
  - `rutasParaPublicar()` y `casosParaPublicar()`.
- Produces en `@/lib/progreso/cliente`:
  - `ProgresoVisible`, que suma `bloqueadoPor: CasoCorto | null`, y sus misiones, que suman `fallidos`;
  - `leerFallidos(almacen, caso, mision): Record<string, number>`;
  - `sumarFallido(almacen, caso, mision, tarea): number`.
- Produces en `@/lib/progreso/requisitos-contenido`: `requisitosDelCaso(rutas, casos, slug): CasoCorto[]`. Es la misma regla de la Task 1, calculada desde el contenido para las páginas estáticas.
- Produces en `MisionProvider`:
  - props nuevas: `anterior: MisionAnterior | null`, `requisitos: CasoCorto[]` y `sinGuia: boolean`;
  - en el contexto: `listo`, `bloqueo: Bloqueo | null`, `fallidosMision`, `fallidosDe(id)` y `sinGuia`;
  - `type MisionAnterior = { slug; titulo; tareas: string[] }`;
  - `type Bloqueo = { tipo: "mision"; mision: { slug; titulo } } | { tipo: "caso"; caso: CasoCorto; sesion: boolean }`.
- Produces en `PanelTarea` la prop nueva `id`. Con bloqueo, sus controles quedan desactivados y se muestra un aviso con enlace. Las pistas se liberan según los intentos fallidos de la tarea.
- Produces en `Tutor` la prop `sinGuia`. Sin los intentos suficientes, muestra cuántos faltan en vez del formulario.

- [ ] **Step 1: Escribir los tests que fallan**

`apps/web/src/lib/progreso/requisitos-contenido.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { Caso, Ruta } from "@syntaxerror/content/tipos";
import { requisitosDelCaso } from "./requisitos-contenido";

const ruta = (slug: string, casos: string[]) => ({ slug, titulo: slug, cargo: "A", descripcion: "D", estado: "publicada", casos }) as Ruta;
const caso = (slug: string) => ({ slug, titulo: slug.toUpperCase() }) as Caso;
const CASOS = ["oficio", "planillas", "sql", "suelto"].map(caso);

describe("requisitosDelCaso", () => {
  it("devuelve el caso anterior de cada ruta, sin repetir", () => {
    const rutas = [ruta("analista", ["oficio", "planillas", "sql"]), ruta("otra", ["oficio", "planillas"])];
    expect(requisitosDelCaso(rutas, CASOS, "oficio")).toEqual([]);
    expect(requisitosDelCaso(rutas, CASOS, "planillas")).toEqual([{ slug: "oficio", titulo: "OFICIO" }]);
    expect(requisitosDelCaso(rutas, CASOS, "sql")).toEqual([{ slug: "planillas", titulo: "PLANILLAS" }]);
    expect(requisitosDelCaso(rutas, CASOS, "suelto")).toEqual([]);
  });
});
```

En `apps/web/src/lib/progreso/cliente.test.ts`:
- cambiar el import por `import { cargarProgreso, leerFallidos, leerPendientes, reportarTarea, sincronizarPendientes, sumarFallido, type Almacen } from "./cliente";`;
- en `"une lo del servidor con lo pendiente en localStorage"`:
  - agregar `fallidos: 2` a `servidor.misiones.m1` y `bloqueadoPor: null` a `servidor`;
  - reemplazar el `toEqual` por:
```ts
    expect(progreso).toEqual({
      sesion: true,
      misiones: { m1: { estado: "aprobada", tareasAprobadas: ["t1", "t2"], fallidos: 2 } },
      entregable: null,
      completo: false,
      certificados: [],
      bloqueadoPor: null,
    });
```
- en `"sin sesión usa solo localStorage"`, reemplazar el `toEqual` por:
```ts
    expect(progreso).toEqual({
      sesion: false,
      misiones: { m2: { estado: "aprobada", tareasAprobadas: ["t3"], fallidos: 0 } },
      entregable: null,
      completo: false,
      certificados: [],
      bloqueadoPor: null,
    });
```
- agregar al final:
```ts
describe("intentos fallidos por tarea", () => {
  it("cuenta por tarea y se lee por misión, también sin almacenamiento", () => {
    const almacen = almacenEnMemoria();
    expect(sumarFallido(almacen, "ventas", "m1", "t1")).toBe(1);
    expect(sumarFallido(almacen, "ventas", "m1", "t1")).toBe(2);
    expect(sumarFallido(almacen, "ventas", "m1", "t2")).toBe(1);
    expect(sumarFallido(almacen, "ventas", "m2", "t3")).toBe(1);
    expect(leerFallidos(almacen, "ventas", "m1")).toEqual({ t1: 2, t2: 1 });
    expect(sumarFallido(null, "ventas", "m9", "x")).toBe(1);
    expect(sumarFallido(null, "ventas", "m9", "x")).toBe(2);
    expect(leerFallidos(null, "ventas", "m9")).toEqual({ x: 2 });
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/progreso/cliente.test.ts src/lib/progreso/requisitos-contenido.test.ts`
Expected: FAIL. No existen `leerFallidos`, `sumarFallido` ni `./requisitos-contenido`, y faltan `fallidos` y `bloqueadoPor`.

- [ ] **Step 3: Crear `apps/web/src/lib/progreso/requisitos-contenido.ts`**

```ts
import type { Caso, Ruta } from "@syntaxerror/content/tipos";
import type { CasoCorto } from "./requisitos";

// Misma regla que casosRequeridos (Task 1), calculada desde el contenido para las páginas estáticas.
export function requisitosDelCaso(rutas: Ruta[], casos: Caso[], slug: string): CasoCorto[] {
  const requeridos = new Map<string, CasoCorto>();
  for (const ruta of rutas) {
    const posicion = ruta.casos.indexOf(slug);
    if (posicion <= 0) continue;
    const anterior = casos.find((caso) => caso.slug === ruta.casos[posicion - 1]);
    if (anterior) requeridos.set(anterior.slug, { slug: anterior.slug, titulo: anterior.titulo });
  }
  return [...requeridos.values()];
}
```

- [ ] **Step 4: Actualizar `apps/web/src/lib/progreso/cliente.ts`**

1. Agregar al inicio: `import type { CasoCorto } from "./requisitos";`.
2. En `ProgresoVisible`, agregar `bloqueadoPor: CasoCorto | null;`.
3. En `cargarProgreso`:
   - el tipo de `servidor` pasa a `Omit<ProgresoVisible, "sesion"> | null`, sin cambios de lógica;
   - el objeto que se arma por misión pasa a ser:
```ts
    misiones[mision] = {
      estado: tareas.length > 0 && tareas.every((tarea) => aprobadas.has(tarea)) ? "aprobada" : "en_curso",
      tareasAprobadas: [...aprobadas],
      fallidos: delServidor?.fallidos ?? 0,
    };
```
   - agregar `bloqueadoPor: servidor?.bloqueadoPor ?? null,` al objeto devuelto.
4. Agregar al final del archivo:
```ts
// Intentos fallidos por tarea, para liberar las pistas. Es un empujón pedagógico, no seguridad:
// las pistas ya vienen en la página. Sin almacenamiento disponible, se cuenta en memoria.
const CLAVE_FALLIDOS = "syntaxerror:fallidos";
const fallidosEnMemoria: Record<string, number> = {};

function leerMapaFallidos(almacen: Almacen | null): Record<string, number> {
  if (!almacen) return fallidosEnMemoria;
  try {
    const valor: unknown = JSON.parse(almacen.getItem(CLAVE_FALLIDOS) ?? "{}");
    return valor && typeof valor === "object" ? (valor as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function leerFallidos(almacen: Almacen | null, caso: string, mision: string): Record<string, number> {
  const prefijo = `${caso}/${mision}/`;
  return Object.fromEntries(
    Object.entries(leerMapaFallidos(almacen))
      .filter(([clave]) => clave.startsWith(prefijo))
      .map(([clave, cantidad]) => [clave.slice(prefijo.length), cantidad])
  );
}

export function sumarFallido(almacen: Almacen | null, caso: string, mision: string, tarea: string): number {
  const mapa = leerMapaFallidos(almacen);
  const clave = `${caso}/${mision}/${tarea}`;
  mapa[clave] = (mapa[clave] ?? 0) + 1;
  if (almacen) {
    try {
      almacen.setItem(CLAVE_FALLIDOS, JSON.stringify(mapa));
    } catch {}
  }
  return mapa[clave];
}
```

- [ ] **Step 5: Correr los tests**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/progreso/cliente.test.ts src/lib/progreso/requisitos-contenido.test.ts`
Expected: PASS.

- [ ] **Step 6: Reemplazar `apps/web/src/components/mision/mision-provider.tsx`**

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { OpcionesPython } from "@syntaxerror/engines/python";
import { cargarProgreso, dependenciasNavegador, leerFallidos, reportarTarea, sumarFallido } from "@/lib/progreso/cliente";
import type { CasoCorto } from "@/lib/progreso/requisitos";
import { PythonProvider } from "./python-contexto";

export type MisionAnterior = { slug: string; titulo: string; tareas: string[] };
export type Bloqueo = { tipo: "mision"; mision: { slug: string; titulo: string } } | { tipo: "caso"; caso: CasoCorto; sesion: boolean };

type ContextoMision = {
  caso: string;
  mision: string;
  sinGuia: boolean;
  listo: boolean;
  bloqueo: Bloqueo | null;
  completa: boolean;
  fallidosMision: number;
  tareaAprobada: (id: string) => boolean;
  fallidosDe: (id: string) => number;
  registrarResultado: (id: string, aprobada: boolean) => void;
};

const Contexto = createContext<ContextoMision | null>(null);

export function MisionProvider({
  caso,
  mision,
  tareas,
  python,
  anterior,
  requisitos,
  sinGuia,
  children,
}: {
  caso: string;
  mision: string;
  tareas: string[];
  python: OpcionesPython | null;
  anterior: MisionAnterior | null;
  requisitos: CasoCorto[];
  sinGuia: boolean;
  children: ReactNode;
}) {
  const [aprobadas, setAprobadas] = useState<ReadonlySet<string>>(new Set());
  const [listo, setListo] = useState(false);
  const [bloqueo, setBloqueo] = useState<Bloqueo | null>(null);
  const [fallidosServidor, setFallidosServidor] = useState(0);
  const [fallidosSesion, setFallidosSesion] = useState(0);
  const [fallidosPorTarea, setFallidosPorTarea] = useState<Record<string, number>>({});
  const claveTareas = tareas.join("|");

  useEffect(() => {
    let vigente = true;
    const deps = dependenciasNavegador();
    setFallidosPorTarea(leerFallidos(deps.almacen, caso, mision));
    const tareasPorMision: Record<string, string[]> = { [mision]: claveTareas ? claveTareas.split("|") : [] };
    if (anterior) tareasPorMision[anterior.slug] = anterior.tareas;
    void cargarProgreso(caso, tareasPorMision, deps).then((progreso) => {
      if (!vigente) return;
      const propia = progreso.misiones[mision];
      if (propia && propia.tareasAprobadas.length > 0) setAprobadas((actuales) => new Set([...actuales, ...propia.tareasAprobadas]));
      setFallidosServidor(propia?.fallidos ?? 0);
      // Con sesión manda el servidor; sin sesión no hay casos completos, así que cualquier requisito bloquea.
      const casoPendiente = progreso.sesion ? progreso.bloqueadoPor : (requisitos[0] ?? null);
      if (casoPendiente) setBloqueo({ tipo: "caso", caso: casoPendiente, sesion: progreso.sesion });
      else if (anterior && progreso.misiones[anterior.slug]?.estado !== "aprobada") setBloqueo({ tipo: "mision", mision: { slug: anterior.slug, titulo: anterior.titulo } });
      else setBloqueo(null);
      setListo(true);
    });
    return () => {
      vigente = false;
    };
  }, [caso, mision, claveTareas, anterior, requisitos]);

  const registrarResultado = useCallback(
    (id: string, aprobada: boolean) => {
      if (aprobada) {
        setAprobadas((actuales) => new Set(actuales).add(id));
      } else {
        setFallidosSesion((cantidad) => cantidad + 1);
        const total = sumarFallido(dependenciasNavegador().almacen, caso, mision, id);
        setFallidosPorTarea((actuales) => ({ ...actuales, [id]: total }));
      }
      void reportarTarea({ caso, mision, tarea: id, aprobada }, dependenciasNavegador());
    },
    [caso, mision]
  );

  const valor = useMemo<ContextoMision>(
    () => ({
      caso,
      mision,
      sinGuia,
      listo,
      bloqueo,
      completa: tareas.length > 0 && tareas.every((tarea) => aprobadas.has(tarea)),
      fallidosMision: fallidosServidor + fallidosSesion,
      tareaAprobada: (id) => aprobadas.has(id),
      fallidosDe: (id) => fallidosPorTarea[id] ?? 0,
      registrarResultado,
    }),
    [caso, mision, sinGuia, listo, bloqueo, tareas, aprobadas, fallidosServidor, fallidosSesion, fallidosPorTarea, registrarResultado]
  );

  return <Contexto.Provider value={valor}>{python ? <PythonProvider opciones={python}>{children}</PythonProvider> : children}</Contexto.Provider>;
}

export function useMision(): ContextoMision {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useMision debe usarse dentro de MisionProvider");
  return contexto;
}

export function useMisionOpcional(): ContextoMision | null {
  return useContext(Contexto);
}
```

- [ ] **Step 7: Reemplazar `apps/web/src/components/mision/panel-tarea.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Badge } from "@syntaxerror/ui/components/badge";
import { Button } from "@syntaxerror/ui/components/button";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { INTENTOS_PARA_PISTA, pistasDisponibles } from "@/lib/progreso/ayudas";
import { useMision, type Bloqueo } from "./mision-provider";

function AvisoBloqueo({ bloqueo, caso }: { bloqueo: Bloqueo; caso: string }) {
  const clase = "rounded-md border border-border bg-surface-raised p-3 text-sm leading-6";
  if (bloqueo.tipo === "mision") {
    return (
      <p role="status" className={clase}>
        Para resolver esta tarea, primero aprueba la misión{" "}
        <Link className="font-bold text-primary hover:underline" href={`/casos/${caso}/${bloqueo.mision.slug}`}>{`«${bloqueo.mision.titulo}»`}</Link>. Puedes leerla igual.
      </p>
    );
  }
  if (!bloqueo.sesion) {
    return (
      <p role="status" className={clase}>
        Para resolver este caso necesitas una cuenta y haber completado{" "}
        <Link className="font-bold text-primary hover:underline" href={`/casos/${bloqueo.caso.slug}`}>{`«${bloqueo.caso.titulo}»`}</Link>.{" "}
        <Link className="font-bold text-primary hover:underline" href={`/login?callbackUrl=${encodeURIComponent(`/casos/${caso}`)}`}>Entrar</Link>
      </p>
    );
  }
  return (
    <p role="status" className={clase}>
      Este caso se habilita al completar{" "}
      <Link className="font-bold text-primary hover:underline" href={`/casos/${bloqueo.caso.slug}`}>{`«${bloqueo.caso.titulo}»`}</Link>. Puedes leer la misión igual.
    </p>
  );
}

export function PanelTarea({
  id,
  titulo,
  enunciado,
  aprobada,
  resultado,
  pistas,
  acciones,
  children,
}: {
  id: string;
  titulo: string;
  enunciado?: string;
  aprobada: boolean;
  resultado: ResultadoTarea | null;
  pistas: string[];
  acciones: ReactNode;
  children: ReactNode;
}) {
  const { caso, listo, bloqueo, fallidosDe } = useMision();
  const [pistasVistas, setPistasVistas] = useState(0);
  const fallidos = fallidosDe(id);
  const disponibles = pistasDisponibles(fallidos, pistas.length);
  return (
    <section className="card grid gap-4 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-primary">{`> ${titulo}`}</p>
        {aprobada ? <Badge>Aprobada</Badge> : null}
      </header>
      {enunciado ? <p className="leading-7">{enunciado}</p> : null}
      {bloqueo ? <AvisoBloqueo bloqueo={bloqueo} caso={caso} /> : null}
      {/* Leer sí, resolver no: con bloqueo (o mientras carga el progreso) los controles quedan desactivados. */}
      <fieldset disabled={!listo || bloqueo !== null} className="grid min-w-0 gap-4 border-0 p-0">
        {children}
        <div className="flex flex-wrap gap-3">
          {acciones}
          {pistasVistas < disponibles ? (
            <Button type="button" variant="ghost" onClick={() => setPistasVistas((vistas) => vistas + 1)}>
              Ver pista
            </Button>
          ) : null}
        </div>
      </fieldset>
      {pistas.length > 0 && disponibles === 0 && !aprobada && !bloqueo ? (
        <p className="text-sm text-muted-foreground">{`Primero intenta: las pistas aparecen después de ${INTENTOS_PARA_PISTA} intentos. Llevas ${fallidos}.`}</p>
      ) : null}
      {pistasVistas > 0 ? (
        <ol className="grid list-decimal gap-1 pl-5 text-sm text-muted-foreground">
          {pistas.slice(0, pistasVistas).map((pista) => <li key={pista}>{pista}</li>)}
        </ol>
      ) : null}
      {resultado ? (
        <p role="status" className={resultado.aprobada ? "rounded-md border border-primary/40 bg-primary/10 p-3 text-sm font-bold" : "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-destructive"}>
          {resultado.aprobada ? "¡Tarea aprobada!" : (resultado.diagnostico ?? "Todavía no. Revisa tu respuesta.")}
        </p>
      ) : null}
    </section>
  );
}
```

En `sql-task.tsx`, `sheet-task.tsx` y `python-task.tsx`, cambiar `<PanelTarea titulo=` por `<PanelTarea id={id} titulo=`.

- [ ] **Step 8: El tutor espera los intentos, en `apps/web/src/components/mision/tutor.tsx`**

1. Agregar a los imports:
```ts
import { tutorHabilitado, umbralTutor } from "@/lib/progreso/ayudas";
import { useMisionOpcional } from "./mision-provider";
```
2. Cambiar la firma a `export function Tutor({ caso, mision, sinGuia = false }: { caso: string; mision: string; sinGuia?: boolean }) {`.
3. Después de `const socketRef = useRef<Socket | null>(null);`, agregar:
```ts
  const contexto = useMisionOpcional();
  const fallidos = contexto?.fallidosMision ?? 0;
  const habilitado = !contexto || tutorHabilitado({ fallidos, aprobada: contexto.completa, sinGuia });
```
4. En `enviar`, justo después del bloque `if (respuesta.status === 401) { ... }`, agregar:
```ts
    if (respuesta.status === 403) {
      setAviso("Todavía no: el tutor se habilita después de intentar la tarea.");
      return;
    }
```
5. En el JSX, el bloque `{sesion === "no" ? ( ... ) : ( <> ... </> )}` pasa a tener tres casos. Reemplazar la línea `) : (` que separa el enlace de entrar del fragmento `<>` por:
```tsx
      ) : !habilitado ? (
        <p role="status" className="text-sm leading-6">
          {`Primero intenta resolver la tarea. El tutor se habilita con ${umbralTutor(sinGuia)} intentos fallidos en esta misión; llevas ${fallidos}.`}
        </p>
      ) : (
```

- [ ] **Step 9: La página de la misión entrega orden y requisitos**

En `apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx`:
- agregar a los imports:
```ts
import { requisitosDelCaso } from "@/lib/progreso/requisitos-contenido";
```
- cambiar el import de `@/lib/contenido` por `import { casosParaPublicar, obtenerCaso, rutasParaPublicar } from "@/lib/contenido";`;
- después de `const siguiente = caso.misiones[indice + 1];`, agregar:
```ts
  const requisitos = requisitosDelCaso(await rutasParaPublicar(), await casosParaPublicar(), caso.slug);
  const sinGuia = mision.sinGuia ?? false;
```
- reemplazar el bloque desde `<MisionProvider` hasta `<Tutor caso={caso.slug} mision={mision.slug} />` (ambos incluidos) por:
```tsx
      <MisionProvider
        caso={caso.slug}
        mision={mision.slug}
        tareas={tareasDeMision(mision).map((tarea) => tarea.props.id)}
        python={usaPython ? { paquetes: paquetesPython(mision), archivos: archivosPython(caso) } : null}
        anterior={anterior ? { slug: anterior.slug, titulo: anterior.titulo, tareas: tareasDeMision(anterior).map((tarea) => tarea.props.id) } : null}
        requisitos={requisitos}
        sinGuia={sinGuia}
      >
        <article className="grid gap-6"><Contenido components={componentesMision(caso)} /></article>
        <PreguntaDocente caso={caso.slug} mision={mision.slug} />
        <Tutor caso={caso.slug} mision={mision.slug} sinGuia={sinGuia} />
      </MisionProvider>
```

El tutor y la pregunta a docentes pasan a estar dentro del proveedor: el tutor lee de ahí los intentos fallidos.

- [ ] **Step 10: Correr los tests, el typecheck y el build**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected:
- PASS y `tsc` sin errores;
- `/casos/[caso]/[mision]` sigue estática (`○` o `●`) y el build no falla por `dynamic = "error"`.

- [ ] **Step 11: Probar en el navegador**

Con `docker compose up -d --build`, sin sesión:
1. `/casos/demo-motor/02-total-de-ventas` muestra «Para resolver esta tarea, primero aprueba la misión «Clientes de regiones»», con la hoja desactivada.
2. En `/casos/demo-motor/01-clientes-de-regiones`, al validar una consulta mala, el aviso dice «Llevas 1». Tras el segundo intento aparece `Ver pista`.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/lib/progreso apps/web/src/components/mision "apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx"
git commit -m "feat(recorrido): misiones bloqueadas hasta aprobar la anterior, pistas y tutor despues de intentar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Misión sin guía

**Files:**
- Modify: `packages/content/src/esquemas.ts`, `packages/content/src/cargar.ts`, `packages/content/src/tipos.ts`, `packages/content/src/validar.ts`
- Modify: `packages/content/test/fixtures/valido/casos/ventas/misiones/03-python.mdx`
- Test: `packages/content/src/validar.test.ts`, `packages/content/src/cargar.test.ts`
- Modify: `apps/web/src/lib/tutor/contexto.ts`, `apps/web/src/lib/tutor/contexto.test.ts`
- Modify: `apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx`

**Interfaces:**
- Consumes: `validarContenido` (Fase 2) y `contextoDeMision` (Fase 3b).
- Produces en el contenido: el frontmatter acepta `sinGuia: true` (por defecto `false`) y `Mision.sinGuia: boolean` pasa a ser obligatorio.
- Produces en `validarContenido` tres reglas nuevas:
  - una misión sin guía no puede tener `<Concepto>`, `<SqlEjemplo>` ni `<PythonEjemplo>`;
  - sus tareas no pueden tener pistas;
  - en todo caso de una ruta publicada, la última misión debe ser sin guía.
- Produces en `contextoDeMision`: para una misión sin guía, agrega la instrucción de responder con preguntas.
- Produces en la página de misión: la etiqueta «Misión sin guía» y su explicación.

- [ ] **Step 1: Marcar la misión final del fixture**

En `packages/content/test/fixtures/valido/casos/ventas/misiones/03-python.mdx`, agregar `sinGuia: true` al frontmatter, después de `tiempo: 8`.

La ruta del fixture está publicada: con la regla nueva, su última misión debe ser sin guía. `03-python` ya cumple el resto (no tiene concepto, ejemplos ni pistas).

- [ ] **Step 2: Escribir los tests que fallan**

En `packages/content/src/cargar.test.ts`, en el test que revisa las misiones del fixture, agregar después de `expect(caso.misiones[0]).toMatchObject(...)`:
```ts
    expect(caso.misiones.map((mision) => mision.sinGuia)).toEqual([false, false, true]);
```

En `packages/content/src/validar.test.ts`, agregar dentro del `describe("validarContenido", ...)`:
```ts
  it("una misión sin guía no puede tener concepto, ejemplos ni pistas", async () => {
    const filtrar = mision("01-filtrar");
    filtrar.sinGuia = true;
    const problemas = await validar();
    expect(problemas).toContain("casos/ventas/misiones/01-filtrar.mdx: una misión sin guía no puede tener <Concepto>");
    expect(problemas).toContain('casos/ventas/misiones/01-filtrar.mdx: una misión sin guía no puede tener pistas (tarea "fuera-de-santiago")');
  });

  it("la última misión de un caso publicado debe ser sin guía; en borrador no se exige", async () => {
    mision("03-python").sinGuia = false;
    expect(await validar()).toContain("casos/ventas: la última misión (03-python) debe ser sin guía: agrega sinGuia: true a su frontmatter");
    contenido.rutas[0].estado = "borrador";
    expect(await validar()).toEqual([]);
  });
```

En `apps/web/src/lib/tutor/contexto.test.ts`, agregar:
```ts
  it("en una misión sin guía pide responder con preguntas", () => {
    expect(contextoDeMision(caso, caso.misiones[2])).toContain("Esta es una misión sin guía");
    expect(contextoDeMision(caso, caso.misiones[0])).not.toContain("misión sin guía");
  });
```

- [ ] **Step 3: Verificar que fallan**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content test; pnpm --filter web exec vitest run src/lib/tutor/contexto.test.ts"`
Expected: FAIL, porque `sinGuia` no existe en el esquema ni en la misión.

- [ ] **Step 4: Implementar en el paquete de contenido**

`packages/content/src/esquemas.ts`: reemplazar `frontmatterSchema` por:
```ts
export const frontmatterSchema = z.object({
  titulo: texto,
  tiempo: z.number().int().positive(),
  // La misión final de cada caso: sin concepto, ejemplos ni pistas (propuesta pedagógica, sección 5).
  sinGuia: z.boolean().default(false),
});
```

`packages/content/src/tipos.ts`: cambiar el tipo `Mision` por:
```ts
export type Mision = { slug: string; titulo: string; tiempo: number; sinGuia: boolean; fuente: string; bloques: Bloque[] };
```

`packages/content/src/cargar.ts`: en el `return` de `cargarMision`, agregar `sinGuia: frontmatter.sinGuia,` después de `tiempo: frontmatter.tiempo,`.

`packages/content/src/validar.ts`:
- agregar después de `const MAXIMO_PALABRAS_BRIEF = 150;`:
```ts
const BLOQUES_DE_GUIA = new Set(["Concepto", "SqlEjemplo", "PythonEjemplo"]);
```
- dentro del `for (const mision of caso.misiones)`, después del chequeo de ids repetidos, agregar:
```ts
      if (mision.sinGuia) {
        for (const bloque of mision.bloques) {
          if (BLOQUES_DE_GUIA.has(bloque.tipo)) problemas.push(`${donde}: una misión sin guía no puede tener <${bloque.tipo}>`);
        }
        for (const tarea of tareas) {
          if (tarea.props.pistas.length > 0) problemas.push(`${donde}: una misión sin guía no puede tener pistas (tarea "${tarea.props.id}")`);
        }
      }
```
- después del `for (const mision of caso.misiones) { ... }`, todavía dentro del `for` de casos, agregar:
```ts
    const publicado = contenido.rutas.some((ruta) => ruta.estado === "publicada" && ruta.casos.includes(caso.slug));
    const ultima = caso.misiones.at(-1);
    if (publicado && ultima && !ultima.sinGuia) {
      problemas.push(`casos/${caso.slug}: la última misión (${ultima.slug}) debe ser sin guía: agrega sinGuia: true a su frontmatter`);
    }
```

En `packages/content/src/tipos.ts`, `sinGuia` deja de ser opcional, como se anticipó en la Task 1. Busca los usos de `mision.sinGuia ?? false` en `apps/web` (la ruta del tutor y la página de misión) y simplifícalos a `mision.sinGuia`.

- [ ] **Step 5: Instrucción al tutor, en `apps/web/src/lib/tutor/contexto.ts`**

Justo después de `` `Misión: ${mision.titulo}.`, `` en el arreglo `lineas`, agregar:
```ts
    ...(mision.sinGuia
      ? [
          "Esta es una misión sin guía: la persona debe demostrar lo aprendido en el caso. No le indiques qué función, cláusula o paso usar; responde con preguntas que la hagan pensar y revisar lo que ya aprendió.",
        ]
      : []),
```

- [ ] **Step 6: Etiqueta en la página de la misión**

En `apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx`, dentro del `<header>` y después del `<h1>`, agregar:
```tsx
        {sinGuia ? (
          <p className="card border-primary p-3 text-sm leading-6">
            <span className="badge mr-2">Misión sin guía</span>
            Aquí demuestras lo aprendido en el caso: no hay concepto, ejemplos ni pistas. El tutor te acompaña con preguntas después de varios intentos.
          </p>
        ) : null}
```

- [ ] **Step 7: Correr los tests, el typecheck y el validador del contenido real**

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && cd apps/web && pnpm exec tsc --noEmit -p . && cd ../.. && pnpm --filter @syntaxerror/content validate"`
Expected:
- PASS;
- `tsc` sin errores;
- el contenido real valida sin problemas (la ruta `data-analyst` está en borrador, así que `demo-motor` no exige misión sin guía).

- [ ] **Step 8: Commit**

```bash
git add packages/content apps/web/src/lib/tutor "apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx" apps/web/src/app/api/tutor
git commit -m "feat(recorrido): mision sin guia al final de cada caso publicado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Verificación de repositorios en GitHub

**Files:**
- Modify: `packages/content/src/esquemas.ts`, `packages/content/src/tipos.ts`, `packages/content/src/cargar.ts`, `packages/content/src/cargar.test.ts`
- Modify: `content/casos/demo-motor/caso.yaml`
- Create: `apps/web/src/lib/entregables/github.ts`, `apps/web/src/lib/entregables/verificador.ts`
- Test: `apps/web/src/lib/entregables/github.test.ts`
- Modify: `apps/web/src/lib/progreso/esquemas.ts`

**Interfaces:**
- Produces en `@syntaxerror/content/esquemas`:
  - `RUBRICA_BASE: string[]`;
  - `casoSchema` acepta `archivos` (extensiones requeridas, como `.sql`; por defecto `[]`) y `rubrica` (por defecto `RUBRICA_BASE`).
- Produces en el tipo `Caso`: `archivos: string[]` y `rubrica: string[]`.
- Produces en `@/lib/entregables/github`:
  - `type Repositorio = { dueno: string; nombre: string }`;
  - `type ResultadoVerificacion = { ok: true; archivos: number } | { ok: false; problemas: string[]; reintentable: boolean }`;
  - `type Verificador = (repo: Repositorio, requisitos: { archivos: string[] }) => Promise<ResultadoVerificacion>`;
  - `parsearRepositorio(url): Repositorio | null`, que acepta `.git`, la barra final y rutas internas como `/tree/main`;
  - `urlRepositorio(repo): string`;
  - `crearVerificadorGithub({ fetch, token?, timeoutMs? }): Verificador`;
  - `verificadorPrueba: Verificador`.
- Produces en `@/lib/entregables/verificador`: `verificadorDesdeEntorno(): Verificador`. Usa el de prueba si `ENTREGABLES_VERIFICACION=prueba`; si no, el de GitHub, con `GITHUB_TOKEN` opcional.
- Produces en `entregableSchema`: la URL debe ser un repositorio de GitHub.

- [ ] **Step 1: Agregar `archivos` y `rubrica` al caso**

`packages/content/src/esquemas.ts`:
- antes de `casoSchema`, agregar:
```ts
// Rúbrica común para revisar entregables (propuesta pedagógica, sección 9). Un caso puede reemplazarla.
export const RUBRICA_BASE = [
  "Responde la pregunta del encargo del caso.",
  "El README explica qué se hizo, con qué datos y cómo revisarlo.",
  "Las conclusiones se apoyan en los datos y en el análisis.",
];
```
- agregar dentro de `casoSchema`, después de `entregable: ...,`:
```ts
  archivos: z.array(z.string().regex(/^\.[a-z0-9]+$/, "cada archivo requerido es una extensión, por ejemplo .sql")).default([]),
  rubrica: z.array(texto).min(1, "la rúbrica necesita al menos un criterio").default(RUBRICA_BASE),
```

`packages/content/src/tipos.ts`: agregar `archivos: string[];` y `rubrica: string[];` al tipo `Caso`, después de `entregable: string;`.

`packages/content/src/cargar.ts`: en el `return` de `cargarCaso`, agregar `archivos: datos.archivos,` y `rubrica: datos.rubrica,` después de `entregable: datos.entregable,`.

`packages/content/src/cargar.test.ts`: en el test que revisa el caso del fixture, agregar:
```ts
    expect(caso.archivos).toEqual([]);
    expect(caso.rubrica).toHaveLength(3);
```

`content/casos/demo-motor/caso.yaml`: agregar al final:
```yaml
archivos:
  - .sql
```

Si `tsc` marca objetos `Caso` armados a mano en tests de `apps/web` (por ejemplo, con `as Caso`), agrégales `archivos: []` y `rubrica: []`.

- [ ] **Step 2: Escribir el test que falla, `apps/web/src/lib/entregables/github.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { crearVerificadorGithub, parsearRepositorio, urlRepositorio, verificadorPrueba } from "./github";

type Respuestas = Record<string, { status: number; cuerpo?: unknown } | Error>;

function fetchFalso(respuestas: Respuestas) {
  const pedidas: string[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    pedidas.push(url);
    expect(new Headers(init?.headers).get("User-Agent")).toBe("syntaxerror.cl");
    const respuesta = respuestas[url.replace("https://api.github.com", "")];
    if (!respuesta) return new Response("{}", { status: 404 });
    if (respuesta instanceof Error) throw respuesta;
    return new Response(JSON.stringify(respuesta.cuerpo ?? {}), { status: respuesta.status });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, pedidas };
}

const REPO = { dueno: "ana", nombre: "ventas" };
const arbol = (...rutas: string[]) => ({ tree: rutas.map((path) => ({ path, type: "blob" })) });
const repoPublico = { status: 200, cuerpo: { private: false, default_branch: "main" } };

describe("parsearRepositorio", () => {
  it("acepta el enlace del repositorio con variantes comunes", () => {
    for (const url of [
      "https://github.com/ana/ventas",
      "https://github.com/ana/ventas/",
      "https://github.com/ana/ventas.git",
      "https://www.github.com/ana/ventas",
      "https://github.com/ana/ventas/tree/main/sql",
      "  https://github.com/ana/ventas  ",
    ]) {
      expect(parsearRepositorio(url)).toEqual(REPO);
    }
    expect(urlRepositorio(REPO)).toBe("https://github.com/ana/ventas");
  });

  it("rechaza lo que no es un repositorio de GitHub", () => {
    for (const url of ["http://github.com/ana/ventas", "https://github.com/ana", "https://gitlab.com/ana/ventas", "github.com/ana/ventas", "https://github.com/-ana/ventas", "https://github.com/ana/..", "mi repo"]) {
      expect(parsearRepositorio(url)).toBeNull();
    }
  });
});

describe("crearVerificadorGithub", () => {
  it("aprueba un repositorio público con README y los archivos pedidos", async () => {
    const { fetch, pedidas } = fetchFalso({
      "/repos/ana/ventas": repoPublico,
      "/repos/ana/ventas/git/trees/main?recursive=1": { status: 200, cuerpo: arbol("README.md", "sql/consultas.SQL", "datos.csv") },
    });
    expect(await crearVerificadorGithub({ fetch })(REPO, { archivos: [".sql"] })).toEqual({ ok: true, archivos: 3 });
    expect(pedidas).toHaveLength(2);
  });

  it("explica en español qué falta", async () => {
    const { fetch } = fetchFalso({
      "/repos/ana/ventas": repoPublico,
      "/repos/ana/ventas/git/trees/main?recursive=1": { status: 200, cuerpo: arbol("docs/README.md", "analisis.py") },
    });
    expect(await crearVerificadorGithub({ fetch })(REPO, { archivos: [".sql", ".py"] })).toEqual({
      ok: false,
      problemas: ["Falta el README en la carpeta principal del repositorio.", "Falta al menos un archivo .sql con tu trabajo."],
      reintentable: false,
    });
  });

  it("repositorio inexistente, privado o vacío", async () => {
    expect(await crearVerificadorGithub(fetchFalso({}))(REPO, { archivos: [] })).toMatchObject({
      ok: false,
      problemas: ["No encontramos el repositorio. Revisa el enlace y que el repositorio sea público."],
    });
    expect(await crearVerificadorGithub(fetchFalso({ "/repos/ana/ventas": { status: 200, cuerpo: { private: true, default_branch: "main" } } }))(REPO, { archivos: [] })).toMatchObject({
      ok: false,
      problemas: ["El repositorio es privado: hazlo público para que podamos revisarlo."],
    });
    expect(
      await crearVerificadorGithub(fetchFalso({ "/repos/ana/ventas": repoPublico, "/repos/ana/ventas/git/trees/main?recursive=1": { status: 409 } }))(REPO, { archivos: [] })
    ).toMatchObject({ ok: false, problemas: ["El repositorio está vacío: sube tus archivos."] });
  });

  it("si GitHub no responde o limita las consultas, no deja pasar y pide reintentar", async () => {
    const esperado = { ok: false, problemas: ["No pudimos revisar GitHub en este momento. Intenta de nuevo en unos minutos."], reintentable: true };
    expect(await crearVerificadorGithub(fetchFalso({ "/repos/ana/ventas": { status: 403 } }))(REPO, { archivos: [] })).toEqual(esperado);
    expect(await crearVerificadorGithub(fetchFalso({ "/repos/ana/ventas": { status: 500 } }))(REPO, { archivos: [] })).toEqual(esperado);
    expect(await crearVerificadorGithub(fetchFalso({ "/repos/ana/ventas": new Error("timeout") }))(REPO, { archivos: [] })).toEqual(esperado);
  });

  it("envía el token si existe", async () => {
    let autorizacion: string | null = null;
    const fetch = (async (_url: string, init?: RequestInit) => {
      autorizacion = new Headers(init?.headers).get("Authorization");
      return new Response("{}", { status: 404 });
    }) as unknown as typeof globalThis.fetch;
    await crearVerificadorGithub({ fetch, token: "secreto" })(REPO, { archivos: [] });
    expect(autorizacion).toBe("Bearer secreto");
  });
});

describe("verificadorPrueba", () => {
  it("acepta cualquier repositorio salvo los que dicen vacio", async () => {
    expect(await verificadorPrueba(REPO, { archivos: [".sql"] })).toEqual({ ok: true, archivos: 1 });
    expect(await verificadorPrueba({ dueno: "ana", nombre: "repo-vacio" }, { archivos: [] })).toMatchObject({ ok: false });
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/entregables`
Expected: FAIL, porque no se puede resolver `./github`.

- [ ] **Step 4: Crear `apps/web/src/lib/entregables/github.ts`**

```ts
export type Repositorio = { dueno: string; nombre: string };
export type ResultadoVerificacion = { ok: true; archivos: number } | { ok: false; problemas: string[]; reintentable: boolean };
export type Verificador = (repo: Repositorio, requisitos: { archivos: string[] }) => Promise<ResultadoVerificacion>;

// Dueño con las reglas de GitHub (alfanumérico y guiones, sin empezar con guion, hasta 39). Se aceptan
// .git, la barra final y rutas internas (por ejemplo /tree/main), que se ignoran.
const PATRON = /^https:\/\/(?:www\.)?github\.com\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]{1,100})(?:\/.*)?$/;

export function parsearRepositorio(url: string): Repositorio | null {
  const coincidencia = PATRON.exec(url.trim());
  if (!coincidencia) return null;
  const nombre = coincidencia[2].replace(/\.git$/, "");
  if (!nombre || nombre === "." || nombre === "..") return null;
  return { dueno: coincidencia[1], nombre };
}

export function urlRepositorio({ dueno, nombre }: Repositorio): string {
  return `https://github.com/${dueno}/${nombre}`;
}

const noDisponible = (): ResultadoVerificacion => ({
  ok: false,
  problemas: ["No pudimos revisar GitHub en este momento. Intenta de nuevo en unos minutos."],
  reintentable: true,
});
const rechazo = (...problemas: string[]): ResultadoVerificacion => ({ ok: false, problemas, reintentable: false });

export function crearVerificadorGithub({ fetch, token, timeoutMs = 8_000 }: { fetch: typeof globalThis.fetch; token?: string; timeoutMs?: number }): Verificador {
  const api = (ruta: string) =>
    fetch(`https://api.github.com${ruta}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "syntaxerror.cl", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });

  return async ({ dueno, nombre }, { archivos }) => {
    try {
      const repo = await api(`/repos/${dueno}/${nombre}`);
      // Sin token, GitHub responde 404 también para los privados.
      if (repo.status === 404) return rechazo("No encontramos el repositorio. Revisa el enlace y que el repositorio sea público.");
      if (!repo.ok) return noDisponible();
      const datos = (await repo.json()) as { private?: boolean; default_branch?: string };
      if (datos.private) return rechazo("El repositorio es privado: hazlo público para que podamos revisarlo.");

      const arbol = await api(`/repos/${dueno}/${nombre}/git/trees/${encodeURIComponent(datos.default_branch ?? "main")}?recursive=1`);
      if (arbol.status === 404 || arbol.status === 409) return rechazo("El repositorio está vacío: sube tus archivos.");
      if (!arbol.ok) return noDisponible();
      const { tree = [] } = (await arbol.json()) as { tree?: { path: string; type: string }[] };
      const rutas = tree.filter((nodo) => nodo.type === "blob").map((nodo) => nodo.path);

      const problemas: string[] = [];
      if (!rutas.some((ruta) => /^readme(\.[a-z0-9]+)?$/i.test(ruta))) problemas.push("Falta el README en la carpeta principal del repositorio.");
      for (const extension of archivos) {
        if (!rutas.some((ruta) => ruta.toLowerCase().endsWith(extension))) problemas.push(`Falta al menos un archivo ${extension} con tu trabajo.`);
      }
      return problemas.length > 0 ? rechazo(...problemas) : { ok: true, archivos: rutas.length };
    } catch {
      return noDisponible();
    }
  };
}

// Para desarrollo y e2e (ENTREGABLES_VERIFICACION=prueba): no llama a GitHub.
export const verificadorPrueba: Verificador = async ({ nombre }) =>
  nombre.includes("vacio") ? rechazo("Falta el README en la carpeta principal del repositorio.") : { ok: true, archivos: 1 };
```

`apps/web/src/lib/entregables/verificador.ts`:
```ts
import { crearVerificadorGithub, verificadorPrueba, type Verificador } from "./github";

export function verificadorDesdeEntorno(): Verificador {
  if (process.env.ENTREGABLES_VERIFICACION === "prueba") return verificadorPrueba;
  return crearVerificadorGithub({ fetch: globalThis.fetch, token: process.env.GITHUB_TOKEN?.trim() || undefined });
}
```

- [ ] **Step 5: El enlace debe ser de GitHub, en `apps/web/src/lib/progreso/esquemas.ts`**

Agregar `import { parsearRepositorio } from "@/lib/entregables/github";` y reemplazar `entregableSchema` por:
```ts
export const entregableSchema = z.object({
  caso: slug,
  url: z
    .string()
    .trim()
    .max(500)
    .refine((url) => parsearRepositorio(url) !== null, "El enlace debe ser un repositorio de GitHub: https://github.com/tu-usuario/tu-repositorio"),
});
```

- [ ] **Step 6: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && cd apps/web && pnpm exec tsc --noEmit -p . && cd ../.. && pnpm --filter @syntaxerror/content validate"`
Expected:
- PASS: 7 tests nuevos en `entregables` y los de `content`, con `archivos` y `rubrica`;
- `tsc` sin errores;
- el contenido real valida.

- [ ] **Step 7: Commit**

```bash
git add packages/content content/casos/demo-motor/caso.yaml apps/web/src/lib/entregables apps/web/src/lib/progreso/esquemas.ts
git commit -m "feat(entregables): verificacion de repositorios en github y archivos y rubrica por caso

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Entregables en revisión

**Files:**
- Modify: `packages/db/src/schema.ts`, `packages/db/src/audit.ts`
- Create: `packages/db/drizzle/0007_<nombre>.sql` (generada)
- Modify: `packages/queue/src/emails.ts`, `apps/worker/src/emails/mensajes.ts`, `apps/worker/src/emails/mensajes.test.ts`
- Modify: `apps/web/src/lib/progreso/servicio.ts`, `apps/web/src/lib/progreso/servicio.test.ts`, `apps/web/src/lib/puntos/servicio.test.ts`
- Create: `apps/web/src/lib/entregables/revision.ts`
- Test: `apps/web/src/lib/entregables/revision.test.ts`
- Modify: `apps/web/src/app/api/entregables/route.ts`, `apps/web/src/app/api/entregables/route.test.ts`
- Create: `apps/web/src/app/api/revision/entregables/[id]/route.ts`
- Modify: `apps/web/src/lib/rate-limit.ts`, `apps/web/src/lib/admin/etiquetas.ts`, `apps/web/src/app/api/progreso/route.test.ts`

**Interfaces:**
- Consumes:
  - `Verificador`, `parsearRepositorio` y `urlRepositorio` (Task 4);
  - `casoPendiente` (Task 1);
  - `resolverDocente` (`@/lib/preguntas-profesor`);
  - `listarAdmins` y `esDocente` (`@/lib/roles`);
  - `otorgarCertificados` y `otorgarPuntos`;
  - `exigirDocente`, `esUuid`, `metaDeRequest`, `checkRateLimit` y `encolarSinFallar`.
- Produces en la base, en `entregables`:
  - `estado` (`pendiente` | `aprobado` | `observado`; `pendiente` por defecto);
  - `verificadoEn`, `comentario`, `criterios` (`boolean[]`), `revisadoPor` y `revisadoEn`.
- Produces en la bitácora: la acción `deliverable_reviewed` y el destino `deliverable`.
- Produces los emails:
  - `entregable-por-revisar` (`alumno`, `caso`, `enlace`);
  - `entregable-observado` (`caso`, `comentario`, `enlace`).
- Produces en `@/lib/progreso/servicio`:
  - códigos de error nuevos: `misiones_pendientes` y `entregable_aprobado` (409);
  - `type RevisionEntregable = { estado: "pendiente" | "aprobado" | "observado"; comentario: string | null }`;
  - `ProgresoCaso`, que suma `revision: RevisionEntregable | null`;
  - `type ResultadoEntrega = { estado: "en_revision" } | { estado: "no_verificado"; problemas: string[]; reintentable: boolean }`;
  - `enviarEntregable(db, userId, { caso, url, archivos }, { verificar }, opciones?): Promise<ResultadoEntrega>`, que reemplaza a `guardarEntregable`;
  - `recalcularCaso(db, userId, casoSlug): Promise<{ casoCompleto: boolean }>`.
  - Un caso completo exige ahora el entregable `aprobado`.
- Produces en `@/lib/entregables/revision`:
  - `type FilaEntregable = { id; estudiante: { nombre; email }; caso: { slug; titulo }; url; enviadoEn: Date }`;
  - `puedeRevisar(db, revisor, { alumnoId, casoId }): Promise<boolean>`;
  - `listarEntregablesPorRevisar(db, revisor): Promise<FilaEntregable[]>`;
  - `avisarRevision(db, { alumnoId, casoSlug }, { encolar }): Promise<void>`;
  - `revisarEntregable(db, { entregableId, revisor, decision, criterios, comentario }, { rubricaDe, encolar, meta })`, que devuelve `{ ok: true; certificados } | { ok: false; motivo: "no_existe" | "prohibido" | "rubrica_incompleta" | "falta_comentario" }`.
- Produces la API:
  - `POST /api/entregables` responde 200 `{ estado: "en_revision" }`, o 400, 401, 404, 409, 422 (`no_verificado` con `problemas`) o 429;
  - `POST /api/revision/entregables/[id]` recibe `{ decision: "aprobado" | "observado", criterios: boolean[], comentario: string | null }` y responde 200 `{ certificados }`, o 400, 401, 403 o 404.
- Límite nuevo: `entregables`, 10 envíos por hora por persona (cada envío consulta GitHub).

- [ ] **Step 1: Columnas, bitácora y emails**

`packages/db/src/schema.ts`: dentro de `entregables`, después de `url: text("url").notNull(),`, agregar:
```ts
    // pendiente → (revisión con rúbrica) → aprobado u observado. Solo aprobado completa el caso.
    estado: text("estado").notNull().default("pendiente"),
    verificadoEn: timestamp("verificado_en"),
    comentario: text("comentario"),
    criterios: jsonb("criterios").notNull().$type<boolean[]>().default([]),
    revisadoPor: uuid("revisado_por").references(() => users.id, { onDelete: "set null" }),
    revisadoEn: timestamp("revisado_en"),
```

Run: `npm run db:generate`
Expected: crea `packages/db/drizzle/0007_<nombre>.sql` con los `ALTER TABLE "entregables" ADD COLUMN ...`.

`packages/db/src/audit.ts`: agregar `"deliverable_reviewed",` al final de `AUDIT_ACTIONS`, y `| "deliverable"` a `AuditTargetType`.

`apps/web/src/lib/admin/etiquetas.ts`: agregar `deliverable_reviewed: "Entregable revisado",` a `ETIQUETAS_ACCION`.

`packages/queue/src/emails.ts`: agregar a la unión `TrabajoEmail`:
```ts
  | (Destinatario & { tipo: "entregable-por-revisar"; alumno: string; caso: string; enlace: string })
  | (Destinatario & { tipo: "entregable-observado"; caso: string; comentario: string; enlace: string })
```

`apps/worker/src/emails/mensajes.ts`: agregar al `switch`:
```ts
    case "entregable-por-revisar":
      return plantillaSyntaxError({
        asunto: "Hay un entregable por revisar",
        estado: { etiqueta: "INFO", mensaje: "Entregable en revisión" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`${trabajo.alumno} envió su entregable del caso ${trabajo.caso}.`, "Revísalo con la rúbrica del caso para aprobarlo o pedir cambios."],
        enlace: { texto: "Revisar entregables", url: trabajo.enlace },
        comandoCierre: "git diff --review",
      });
    case "entregable-observado":
      return plantillaSyntaxError({
        asunto: "Tu entregable necesita cambios",
        estado: { etiqueta: "WARNING", mensaje: "Entregable con observaciones" },
        saludo: saludo(trabajo.nombre),
        parrafos: [`Revisaron tu entregable del caso ${trabajo.caso} y te piden algunos cambios:`, `«${trabajo.comentario}»`, "Haz los ajustes en tu repositorio y vuelve a enviarlo desde la página del caso."],
        enlace: { texto: "Ir al caso", url: trabajo.enlace },
        comandoCierre: "git commit --amend",
      });
```

`apps/worker/src/emails/mensajes.test.ts`: agregar al final del arreglo `casos`:
```ts
  [{ tipo: "entregable-por-revisar", para: "rosa@correo.cl", nombre: "Rosa", alumno: "Ana (ana@correo.cl)", caso: "Ventas", enlace }, "Hay un entregable por revisar"],
  [{ tipo: "entregable-observado", para: "ana@correo.cl", nombre: "Ana", caso: "Ventas", comentario: "Falta explicar las conclusiones.", enlace }, "Tu entregable necesita cambios"],
```

`apps/web/src/lib/rate-limit.ts`: agregar `| "entregables"` a `RateLimitKey` y `entregables: { points: 10, duration: 3600 },` a `LIMITER_CONFIGS`.

- [ ] **Step 2: Escribir los tests que fallan**

En `apps/web/src/lib/progreso/servicio.test.ts`:
- reemplazar `guardarEntregable` por `enviarEntregable` y agregar `recalcularCaso` al import de `./servicio`; agregar `entregables` al import de `@syntaxerror/db/schema`; agregar `import { verificadorPrueba } from "@/lib/entregables/github";`;
- en el test de `sincronizarIntentos` y en el de la ruta `/api/progreso`, agregar `revision: null,` a los `toEqual` de `obtenerProgresoCaso`;
- reemplazar todo el `describe("guardarEntregable", ...)` por:
```ts
describe("enviarEntregable", () => {
  const verificar = { verificar: verificadorPrueba };
  const enviar = (userId: string, url = "https://github.com/alumna/ventas") => enviarEntregable(db, userId, { caso: "ventas", url, archivos: [] }, verificar);
  const aprobarTodo = async (userId: string) => {
    for (const [mision, tarea] of [["m1", "t1"], ["m1", "t2"], ["m2", "t3"]]) await registrarIntento(db, userId, intento(mision, tarea));
  };

  it("exige todas las misiones aprobadas antes de enviar", async () => {
    const { userId } = await prepararCaso();
    await expect(enviar(userId)).rejects.toMatchObject({ codigo: "misiones_pendientes" });
  });

  it("verificado, queda pendiente sin completar el caso; aprobado, el caso y la ruta se completan", async () => {
    const { userId, casoId, rutaId } = await prepararCaso();
    await aprobarTodo(userId);
    expect(await enviar(userId, "https://github.com/alumna/ventas/tree/main")).toEqual({ estado: "en_revision" });
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toMatchObject({
      completo: false,
      entregable: "https://github.com/alumna/ventas",
      revision: { estado: "pendiente", comentario: null },
    });
    expect(await recalcularCaso(db, userId, "ventas")).toEqual({ casoCompleto: false });

    await db.update(entregables).set({ estado: "aprobado" });
    expect(await recalcularCaso(db, userId, "ventas")).toEqual({ casoCompleto: true });
    const [inscripcion] = await db.select().from(casoInscripciones).where(eq(casoInscripciones.casoId, casoId));
    expect(inscripcion.completadoEn).toBeInstanceOf(Date);
    const [enRuta] = await db.select().from(rutaInscripciones).where(eq(rutaInscripciones.rutaId, rutaId));
    expect(enRuta.completadoEn).toBeInstanceOf(Date);
  });

  it("si la verificación falla no guarda nada y devuelve los problemas", async () => {
    const { userId } = await prepararCaso();
    await aprobarTodo(userId);
    expect(await enviar(userId, "https://github.com/alumna/repo-vacio")).toEqual({
      estado: "no_verificado",
      problemas: ["Falta el README en la carpeta principal del repositorio."],
      reintentable: false,
    });
    expect(await db.select().from(entregables)).toEqual([]);
  });

  it("un entregable observado se puede reenviar y vuelve a pendiente; uno aprobado no", async () => {
    const { userId } = await prepararCaso();
    await aprobarTodo(userId);
    await enviar(userId);
    await db.update(entregables).set({ estado: "observado", comentario: "Falta el README" });
    expect(await enviar(userId, "https://github.com/alumna/ventas-v2")).toEqual({ estado: "en_revision" });
    expect((await obtenerProgresoCaso(db, userId, "ventas"))?.revision).toEqual({ estado: "pendiente", comentario: null });
    await db.update(entregables).set({ estado: "aprobado" });
    await expect(enviar(userId, "https://github.com/alumna/otra")).rejects.toMatchObject({ codigo: "entregable_aprobado" });
    const [fila] = await db.select().from(entregables);
    expect(fila.url).toBe("https://github.com/alumna/ventas-v2");
  });
});
```

En `apps/web/src/lib/puntos/servicio.test.ts`:
- reemplazar el import de `guardarEntregable` por `recalcularCaso`, y agregar `entregables` al import de schema;
- reemplazar el test `"completar el caso suma 50 más, una sola vez"` por:
```ts
  it("completar el caso (entregable aprobado) suma 50 más, una sola vez", async () => {
    const userId = await preparar();
    await aprobar(userId);
    const [caso] = await db.select({ id: casos.id }).from(casos);
    await db.insert(entregables).values({ userId, casoId: caso.id, url: "https://github.com/ana/ventas", estado: "aprobado" });
    await recalcularCaso(db, userId, "ventas");
    await recalcularCaso(db, userId, "ventas");
    expect((await obtenerNivel(db, userId)).puntos).toBe(60);
  });
```

`apps/web/src/lib/entregables/revision.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, casoInscripciones, casos, certificados, claseCasos, claseInscripciones, clases, entregables, misionProgreso, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import type { Rol } from "@/lib/roles";
import { avisarRevision, listarEntregablesPorRevisar, revisarEntregable } from "./revision";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const RUBRICA = ["Responde la pregunta.", "README claro."];
const deps = { encolar, meta: SIN_META, rubricaDe: async () => RUBRICA };

async function persona(email: string, rol: Rol, nombre: string | null = null) {
  const [fila] = await db.insert(users).values({ email, role: rol, name: nombre }).returning({ id: users.id });
  return { id: fila.id, email, nombre, rol };
}

async function escenario() {
  const ana = await persona("ana@correo.cl", "student", "Ana");
  const rosa = await persona("rosa@correo.cl", "teacher", "Rosa");
  const otra = await persona("otra@correo.cl", "teacher");
  const admin = await persona("admin@correo.cl", "admin", "Admin");
  const [caso] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "E", entregable: "R", misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }] })
    .returning({ id: casos.id });
  await db.insert(casoInscripciones).values({ userId: ana.id, casoId: caso.id });
  await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m1", estado: "aprobada", tareasAprobadas: ["t1"] });
  const [entregable] = await db.insert(entregables).values({ userId: ana.id, casoId: caso.id, url: "https://github.com/ana/ventas" }).returning({ id: entregables.id });
  return { ana, rosa, otra, admin, casoId: caso.id, entregableId: entregable.id };
}

async function enClaseDeRosa(alumnoId: string, profesorId: string, casoId: string) {
  const [ruta] = await db.insert(rutas).values({ slug: "r", titulo: "R", cargo: "A", descripcion: "R" }).returning({ id: rutas.id });
  const [clase] = await db.insert(clases).values({ profesorId, rutaId: ruta.id, titulo: "3°A", codigo: "ABC234" }).returning({ id: clases.id });
  await db.insert(claseCasos).values({ claseId: clase.id, casoId });
  await db.insert(claseInscripciones).values({ claseId: clase.id, userId: alumnoId, estado: "activa" });
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("revisión de entregables", () => {
  it("lista los pendientes a administración y a la docente de la clase, no a otra docente", async () => {
    const { ana, rosa, otra, admin, casoId } = await escenario();
    expect(await listarEntregablesPorRevisar(db, admin)).toHaveLength(1);
    expect(await listarEntregablesPorRevisar(db, rosa)).toEqual([]);
    await enClaseDeRosa(ana.id, rosa.id, casoId);
    expect(await listarEntregablesPorRevisar(db, rosa)).toEqual([
      { id: expect.any(String), estudiante: { nombre: "Ana", email: "ana@correo.cl" }, caso: { slug: "ventas", titulo: "Ventas" }, url: "https://github.com/ana/ventas", enviadoEn: expect.any(Date) },
    ]);
    expect(await listarEntregablesPorRevisar(db, otra)).toEqual([]);
  });

  it("avisa a la docente de la clase o, si no hay, a administración", async () => {
    const { ana, rosa, casoId } = await escenario();
    await avisarRevision(db, { alumnoId: ana.id, casoSlug: "ventas" }, { encolar });
    expect(enviados.map((email) => [email.tipo, email.para])).toEqual([["entregable-por-revisar", "admin@correo.cl"]]);
    enviados.length = 0;
    await enClaseDeRosa(ana.id, rosa.id, casoId);
    await avisarRevision(db, { alumnoId: ana.id, casoSlug: "ventas" }, { encolar });
    expect(enviados.map((email) => email.para)).toEqual(["rosa@correo.cl"]);
  });

  it("aprobar exige la rúbrica completa, completa el caso y emite el certificado una sola vez", async () => {
    const { admin, entregableId } = await escenario();
    const revisar = (criterios: boolean[]) => revisarEntregable(db, { entregableId, revisor: admin, decision: "aprobado", criterios, comentario: null }, deps);
    expect(await revisar([true, false])).toEqual({ ok: false, motivo: "rubrica_incompleta" });
    expect(await revisar([true])).toEqual({ ok: false, motivo: "rubrica_incompleta" });
    expect(await revisar([true, true])).toEqual({ ok: true, certificados: [{ codigo: expect.any(String), tipo: "caso", titulo: "Ventas" }] });
    expect(await revisar([true, true])).toEqual({ ok: false, motivo: "no_existe" });
    expect(await db.select().from(certificados)).toHaveLength(1);
    expect(enviados.map((email) => email.tipo)).toEqual(["certificado-emitido"]);
    expect((await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action)).toEqual(["deliverable_reviewed"]);
  });

  it("pedir cambios exige un comentario y avisa por email", async () => {
    const { admin, entregableId } = await escenario();
    const observar = (comentario: string | null) => revisarEntregable(db, { entregableId, revisor: admin, decision: "observado", criterios: [false, true], comentario }, deps);
    expect(await observar("corto")).toEqual({ ok: false, motivo: "falta_comentario" });
    expect(await observar("Falta explicar las conclusiones en el README.")).toEqual({ ok: true, certificados: [] });
    expect(enviados).toEqual([
      { tipo: "entregable-observado", para: "ana@correo.cl", nombre: "Ana", caso: "Ventas", comentario: "Falta explicar las conclusiones en el README.", enlace: expect.stringContaining("/casos/ventas") },
    ]);
    const [fila] = await db.select().from(entregables);
    expect(fila).toMatchObject({ estado: "observado", criterios: [false, true], revisadoPor: admin.id });
  });

  it("una docente que no es de la clase no puede revisar", async () => {
    const { otra, entregableId } = await escenario();
    expect(await revisarEntregable(db, { entregableId, revisor: otra, decision: "aprobado", criterios: [true, true], comentario: null }, deps)).toEqual({ ok: false, motivo: "prohibido" });
  });
});
```

Reemplazar `apps/web/src/app/api/entregables/route.test.ts` por:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, entregables, misionProgreso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");
vi.stubEnv("ENTREGABLES_VERIFICACION", "prueba");

const { POST } = await import("./route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const MISIONES = ["01-clientes-de-regiones", "02-total-de-ventas", "03-ticket-promedio"];

function enviar(cuerpo: unknown) {
  return POST(new Request("http://localhost:3000/api/entregables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));
}

async function iniciarSesion({ aprobarTodo }: { aprobarTodo: boolean }) {
  const [usuario] = await db.insert(users).values({ email: `alumna-${crypto.randomUUID()}@correo.cl` }).returning({ id: users.id });
  const [caso] = await db.select({ id: casos.id }).from(casos);
  if (aprobarTodo) {
    await db.insert(misionProgreso).values(MISIONES.map((mision) => ({ userId: usuario.id, casoId: caso.id, mision, estado: "aprobada" as const })));
  }
  vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
}

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
  await db.insert(casos).values({
    slug: "demo-motor",
    titulo: "Demo",
    cargo: "Analista",
    empresa: "Distribuidora",
    entregable: "Repositorio",
    misiones: MISIONES.map((slug) => ({ slug, titulo: slug, tareas: ["t"] })),
  });
});
afterAll(() => close());

describe("POST /api/entregables", () => {
  it("responde 401 sin sesión y 400 si no es un repositorio de GitHub", async () => {
    expect((await enviar({ caso: "demo-motor", url: "https://github.com/ana/demo" })).status).toBe(401);
    await iniciarSesion({ aprobarTodo: true });
    expect((await enviar({ caso: "demo-motor", url: "https://gitlab.com/ana/demo" })).status).toBe(400);
    expect((await enviar({ caso: "demo-motor", url: "mi repo" })).status).toBe(400);
  });

  it("responde 409 si faltan misiones y 404 si el caso no existe", async () => {
    await iniciarSesion({ aprobarTodo: false });
    const respuesta = await enviar({ caso: "demo-motor", url: "https://github.com/ana/demo" });
    expect(respuesta.status).toBe(409);
    expect(await respuesta.json()).toEqual({ error: "misiones_pendientes" });
    expect((await enviar({ caso: "otro", url: "https://github.com/ana/demo" })).status).toBe(404);
  });

  it("verificado, queda en revisión; si la verificación falla responde 422 con los problemas", async () => {
    await iniciarSesion({ aprobarTodo: true });
    const vacio = await enviar({ caso: "demo-motor", url: "https://github.com/ana/repo-vacio" });
    expect(vacio.status).toBe(422);
    expect(await vacio.json()).toEqual({ error: "no_verificado", problemas: ["Falta el README en la carpeta principal del repositorio."], reintentable: false });
    const respuesta = await enviar({ caso: "demo-motor", url: "https://github.com/ana/demo" });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ estado: "en_revision" });
    const [fila] = await db.select().from(entregables);
    expect(fila).toMatchObject({ url: "https://github.com/ana/demo", estado: "pendiente" });
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/progreso src/lib/puntos src/lib/entregables src/app/api/entregables`
Expected: FAIL. No existen `enviarEntregable`, `recalcularCaso` ni `./revision`, y la ruta todavía usa `guardarEntregable`.

- [ ] **Step 4: Actualizar `apps/web/src/lib/progreso/servicio.ts`**

1. Agregar a los imports:
```ts
import { parsearRepositorio, urlRepositorio, type Verificador } from "@/lib/entregables/github";
```
   Agregar `ne` al import de `drizzle-orm`.
2. Ampliar el código de error:
```ts
export type CodigoErrorProgreso =
  | "caso_no_existe"
  | "mision_no_existe"
  | "tarea_no_existe"
  | "mision_bloqueada"
  | "caso_bloqueado"
  | "misiones_pendientes"
  | "entregable_aprobado";
```
3. Agregar los tipos y ampliar `ProgresoCaso`:
```ts
export type RevisionEntregable = { estado: "pendiente" | "aprobado" | "observado"; comentario: string | null };
export type ProgresoCaso = {
  misiones: Record<string, EstadoMision>;
  entregable: string | null;
  revision: RevisionEntregable | null;
  completo: boolean;
  bloqueadoPor: CasoCorto | null;
};
export type ResultadoEntrega = { estado: "en_revision" } | { estado: "no_verificado"; problemas: string[]; reintentable: boolean };
```
4. En `actualizarCompletitud`, reemplazar la consulta del entregable y el cálculo de `completo` por:
```ts
  const [entregable] = await tx
    .select({ estado: entregables.estado })
    .from(entregables)
    .where(and(eq(entregables.userId, userId), eq(entregables.casoId, caso.id)));
  // El caso se completa con todas las misiones aprobadas y el entregable aprobado por una persona con la rúbrica.
  const completo = caso.misiones.length > 0 && caso.misiones.every((mision) => slugsAprobados.has(mision.slug)) && entregable?.estado === "aprobado";
```
5. Reemplazar la función `guardarEntregable` completa por:
```ts
export async function enviarEntregable(
  db: AppDb,
  userId: string,
  entrada: { caso: string; url: string; archivos: string[] },
  { verificar }: { verificar: Verificador },
  opciones: OpcionesRequisitos = SOLO_PUBLICADAS
): Promise<ResultadoEntrega> {
  const caso = await buscarCaso(db, entrada.caso);
  if (await casoPendiente(db, userId, caso.id, opciones)) throw new ErrorProgreso("caso_bloqueado");
  const aprobadas = await db
    .select({ mision: misionProgreso.mision })
    .from(misionProgreso)
    .where(and(eq(misionProgreso.userId, userId), eq(misionProgreso.casoId, caso.id), eq(misionProgreso.estado, "aprobada")));
  const slugs = new Set(aprobadas.map((fila) => fila.mision));
  if (caso.misiones.length === 0 || !caso.misiones.every((mision) => slugs.has(mision.slug))) throw new ErrorProgreso("misiones_pendientes");
  const [actual] = await db.select({ estado: entregables.estado }).from(entregables).where(and(eq(entregables.userId, userId), eq(entregables.casoId, caso.id)));
  if (actual?.estado === "aprobado") throw new ErrorProgreso("entregable_aprobado");

  const repositorio = parsearRepositorio(entrada.url);
  if (!repositorio) return { estado: "no_verificado", problemas: ["El enlace debe ser un repositorio de GitHub."], reintentable: false };
  const verificacion = await verificar(repositorio, { archivos: entrada.archivos });
  if (!verificacion.ok) return { estado: "no_verificado", problemas: verificacion.problemas, reintentable: verificacion.reintentable };

  const ahora = new Date();
  const datos = { url: urlRepositorio(repositorio), estado: "pendiente", verificadoEn: ahora, comentario: null, criterios: [], revisadoPor: null, revisadoEn: null, actualizadoEn: ahora };
  await db.transaction(async (tx) => {
    await inscribir(tx, userId, caso.id);
    // El `where` evita pisar un entregable que otra request aprobó entremedio.
    await tx
      .insert(entregables)
      .values({ userId, casoId: caso.id, ...datos })
      .onConflictDoUpdate({ target: [entregables.userId, entregables.casoId], set: datos, setWhere: ne(entregables.estado, "aprobado") });
  });
  return { estado: "en_revision" };
}

export async function recalcularCaso(db: AppDb, userId: string, casoSlug: string): Promise<{ casoCompleto: boolean }> {
  return db.transaction(async (tx) => {
    const caso = await buscarCaso(tx, casoSlug);
    const casoCompleto = await actualizarCompletitud(tx, userId, caso);
    if (casoCompleto) await otorgarPuntos(tx, { userId, casoId: caso.id, clave: CLAVE_CASO, motivo: "caso_completo", cantidad: PUNTOS.caso });
    return { casoCompleto };
  });
}
```
6. En `obtenerProgresoCaso`:
   - en la consulta del entregable, seleccionar `{ url: entregables.url, estado: entregables.estado, comentario: entregables.comentario }`;
   - agregar al objeto devuelto:
```ts
    revision: entregable ? { estado: entregable.estado as RevisionEntregable["estado"], comentario: entregable.comentario } : null,
```

- [ ] **Step 5: Crear `apps/web/src/lib/entregables/revision.ts`**

```ts
import { and, asc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { casos, entregables, users } from "@syntaxerror/db/schema";
import { otorgarCertificados } from "@/lib/certificados/otorgar";
import type { CertificadoEmitido } from "@/lib/certificados/servicio";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { resolverDocente } from "@/lib/preguntas-profesor";
import { recalcularCaso } from "@/lib/progreso/servicio";
import { listarAdmins, type Persona, type Rol } from "@/lib/roles";
import { absoluteUrl } from "@/lib/seo";

export type Revisor = { id: string; email: string; rol: Rol };
export type FilaEntregable = { id: string; estudiante: { nombre: string | null; email: string }; caso: { slug: string; titulo: string }; url: string; enviadoEn: Date };
export type ResultadoRevision = { ok: true; certificados: CertificadoEmitido[] } | { ok: false; motivo: "no_existe" | "prohibido" | "rubrica_incompleta" | "falta_comentario" };

const describir = (persona: { nombre: string | null; email: string }) => (persona.nombre ? `${persona.nombre} (${persona.email})` : persona.email);

// Revisa administración, o la docente de una clase activa de la persona con ese caso habilitado.
export async function puedeRevisar(db: AppDb, revisor: Revisor, { alumnoId, casoId }: { alumnoId: string; casoId: string }): Promise<boolean> {
  if (revisor.rol === "admin") return true;
  if (revisor.rol !== "teacher") return false;
  return (await resolverDocente(db, { alumnoId, casoId })).profesorId === revisor.id;
}

export async function listarEntregablesPorRevisar(db: AppDb, revisor: Revisor): Promise<FilaEntregable[]> {
  const filas = await db
    .select({
      id: entregables.id,
      alumnoId: entregables.userId,
      casoId: entregables.casoId,
      nombre: users.name,
      email: users.email,
      casoSlug: casos.slug,
      casoTitulo: casos.titulo,
      url: entregables.url,
      enviadoEn: entregables.actualizadoEn,
    })
    .from(entregables)
    .innerJoin(users, eq(users.id, entregables.userId))
    .innerJoin(casos, eq(casos.id, entregables.casoId))
    .where(eq(entregables.estado, "pendiente"))
    .orderBy(asc(entregables.actualizadoEn));
  const visibles: FilaEntregable[] = [];
  for (const fila of filas) {
    if (!(await puedeRevisar(db, revisor, { alumnoId: fila.alumnoId, casoId: fila.casoId }))) continue;
    visibles.push({ id: fila.id, estudiante: { nombre: fila.nombre, email: fila.email }, caso: { slug: fila.casoSlug, titulo: fila.casoTitulo }, url: fila.url, enviadoEn: fila.enviadoEn });
  }
  return visibles;
}

export async function avisarRevision(db: AppDb, { alumnoId, casoSlug }: { alumnoId: string; casoSlug: string }, { encolar }: { encolar: Encolar }): Promise<void> {
  const [fila] = await db
    .select({ casoId: casos.id, casoTitulo: casos.titulo, nombre: users.name, email: users.email })
    .from(casos)
    .innerJoin(users, eq(users.id, alumnoId))
    .where(eq(casos.slug, casoSlug));
  if (!fila) return;
  const { profesorId } = await resolverDocente(db, { alumnoId, casoId: fila.casoId });
  const destinatarios: Persona[] = profesorId
    ? await db.select({ id: users.id, email: users.email, nombre: users.name }).from(users).where(eq(users.id, profesorId))
    : await listarAdmins(db);
  for (const persona of destinatarios) {
    await encolar({ tipo: "entregable-por-revisar", para: persona.email, nombre: persona.nombre, alumno: describir(fila), caso: fila.casoTitulo, enlace: absoluteUrl("/profesor/entregables") });
  }
}

export async function revisarEntregable(
  db: AppDb,
  { entregableId, revisor, decision, criterios, comentario }: { entregableId: string; revisor: Revisor; decision: "aprobado" | "observado"; criterios: boolean[]; comentario: string | null },
  { rubricaDe, encolar, meta }: { rubricaDe: (casoSlug: string) => Promise<string[] | null>; encolar: Encolar; meta: MetaRequest }
): Promise<ResultadoRevision> {
  const [fila] = await db
    .select({
      alumnoId: entregables.userId,
      casoId: entregables.casoId,
      estado: entregables.estado,
      casoSlug: casos.slug,
      casoTitulo: casos.titulo,
      email: users.email,
      nombre: users.name,
    })
    .from(entregables)
    .innerJoin(casos, eq(casos.id, entregables.casoId))
    .innerJoin(users, eq(users.id, entregables.userId))
    .where(eq(entregables.id, entregableId));
  if (!fila || fila.estado !== "pendiente") return { ok: false, motivo: "no_existe" };
  if (!(await puedeRevisar(db, revisor, { alumnoId: fila.alumnoId, casoId: fila.casoId }))) return { ok: false, motivo: "prohibido" };

  const rubrica = (await rubricaDe(fila.casoSlug)) ?? [];
  if (decision === "aprobado" && (rubrica.length === 0 || criterios.length !== rubrica.length || !criterios.every(Boolean))) {
    return { ok: false, motivo: "rubrica_incompleta" };
  }
  const texto = comentario?.trim() || null;
  if (decision === "observado" && (!texto || texto.length < 10)) return { ok: false, motivo: "falta_comentario" };

  // Se vuelve a exigir "pendiente": de dos revisiones simultáneas, solo una se aplica.
  const revisadas = await db
    .update(entregables)
    .set({ estado: decision, criterios, comentario: texto, revisadoPor: revisor.id, revisadoEn: new Date() })
    .where(and(eq(entregables.id, entregableId), eq(entregables.estado, "pendiente")))
    .returning({ id: entregables.id });
  if (revisadas.length === 0) return { ok: false, motivo: "no_existe" };

  await insertAuditLogEntry(db, {
    actorId: revisor.id,
    actorEmail: revisor.email,
    action: "deliverable_reviewed",
    targetType: "deliverable",
    targetId: entregableId,
    metadata: { decision, caso: fila.casoSlug },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  if (decision === "aprobado") {
    const { casoCompleto } = await recalcularCaso(db, fila.alumnoId, fila.casoSlug);
    return { ok: true, certificados: casoCompleto ? await otorgarCertificados(db, fila.alumnoId, fila.casoSlug, encolar) : [] };
  }
  await encolar({ tipo: "entregable-observado", para: fila.email, nombre: fila.nombre, caso: fila.casoTitulo, comentario: texto!, enlace: absoluteUrl(`/casos/${fila.casoSlug}`) });
  return { ok: true, certificados: [] };
}
```

- [ ] **Step 6: Las rutas**

Reemplazar `apps/web/src/app/api/entregables/route.ts` por:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { incluirBorradores, obtenerCaso } from "@/lib/contenido";
import { encolarSinFallar } from "@/lib/emails";
import { avisarRevision } from "@/lib/entregables/revision";
import { verificadorDesdeEntorno } from "@/lib/entregables/verificador";
import { entregableSchema } from "@/lib/progreso/esquemas";
import { enviarEntregable, ErrorProgreso, estadoHttp } from "@/lib/progreso/servicio";
import { checkRateLimit } from "@/lib/rate-limit";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = entregableSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "url_invalida" }, { status: 400 });
  const caso = await obtenerCaso(parsed.data.caso);
  if (!caso) return NextResponse.json({ error: "caso_no_existe" }, { status: 404 });
  const limite = await checkRateLimit("entregables", userId);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  try {
    const db = getDb();
    const resultado = await enviarEntregable(
      db,
      userId,
      { caso: caso.slug, url: parsed.data.url, archivos: caso.archivos },
      { verificar: verificadorDesdeEntorno() },
      { incluirBorradores: incluirBorradores() }
    );
    if (resultado.estado === "no_verificado") {
      return NextResponse.json({ error: "no_verificado", problemas: resultado.problemas, reintentable: resultado.reintentable }, { status: 422 });
    }
    await avisarRevision(db, { alumnoId: userId, casoSlug: caso.slug }, { encolar: encolarSinFallar });
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof ErrorProgreso) return NextResponse.json({ error: error.codigo }, { status: estadoHttp(error.codigo) });
    throw error;
  }
}
```

`apps/web/src/app/api/revision/entregables/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { obtenerCaso } from "@/lib/contenido";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { encolarSinFallar } from "@/lib/emails";
import { revisarEntregable } from "@/lib/entregables/revision";
import { exigirDocente } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({
  decision: z.enum(["aprobado", "observado"]),
  criterios: z.array(z.boolean()).max(20),
  comentario: z.string().max(2000).nullable(),
});
const ESTADOS = { no_existe: 404, prohibido: 403, rubrica_incompleta: 400, falta_comentario: 400 } as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await revisarEntregable(
    getDb(),
    { entregableId: id, revisor: usuario, ...parsed.data },
    { rubricaDe: async (slug) => (await obtenerCaso(slug))?.rubrica ?? null, encolar: encolarSinFallar, meta: metaDeRequest(request) }
  );
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: ESTADOS[resultado.motivo] });
  return NextResponse.json({ certificados: resultado.certificados });
}
```

- [ ] **Step 7: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && for p in apps/web apps/worker packages/queue packages/db; do (cd \$p && pnpm exec tsc --noEmit -p .) || exit 1; done"`
Expected:
- PASS: `revision` (5 tests), `enviarEntregable` (4), la ruta de entregables (3), y los emails nuevos del worker (2 en `it.each`);
- `tsc` sin errores.

Si algún otro test marcaba un caso como completo solo con un entregable (por ejemplo, `portafolio.test.ts` o `perfil.test.ts`), revisa que inserte directamente `casoInscripciones.completadoEn`. Si llamaba a `guardarEntregable`, cámbialo para insertar el entregable con `estado: "aprobado"` y llamar a `recalcularCaso`.

- [ ] **Step 8: Commit**

```bash
git add packages/db packages/queue apps/worker apps/web/src/lib/progreso apps/web/src/lib/puntos apps/web/src/lib/entregables apps/web/src/lib/rate-limit.ts apps/web/src/lib/admin/etiquetas.ts apps/web/src/app/api/entregables apps/web/src/app/api/revision apps/web/src/app/api/progreso
git commit -m "feat(entregables): entregables verificados en revision con rubrica antes del certificado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Pantallas del entregable y de la revisión

**Files:**
- Modify: `apps/web/src/lib/certificados/servicio.ts`, `apps/web/src/lib/certificados/servicio.test.ts`
- Modify: `apps/web/src/app/api/progreso/route.ts`, `apps/web/src/lib/progreso/cliente.ts`
- Modify: `apps/web/src/components/mision/panel-caso.tsx`, `apps/web/src/app/(misiones)/casos/[caso]/page.tsx`
- Create: `apps/web/src/components/comunidad/formulario-revision.tsx`, `apps/web/src/app/(dashboard)/profesor/entregables/page.tsx`
- Modify:
  - `apps/web/src/app/(dashboard)/profesor/page.tsx`
  - `apps/web/src/app/(dashboard)/admin/layout.tsx`
  - `apps/web/src/lib/admin/resumen.ts`
  - `apps/web/src/lib/admin/resumen.test.ts`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`

**Interfaces:**
- Consumes:
  - `ProgresoCaso` con `revision` y `bloqueadoPor` (Tasks 1 y 5);
  - `requisitosDelCaso` (Task 2);
  - `listarEntregablesPorRevisar` y `POST /api/revision/entregables/[id]` (Task 5);
  - `RUBRICA_BASE` y `Caso.rubrica` (Task 4).
- Produces en `@/lib/certificados/servicio`: `certificadosDelCaso(db, userId, casoSlug): Promise<CertificadoEmitido[]>`, con el del caso y los de sus rutas.
- Produces en la API: `GET /api/progreso` suma `certificados`. Así la página del caso los muestra al volver después de la aprobación.
- Produces en `ProgresoVisible`: `revision: RevisionEntregable | null`.
- Produces en `PanelCaso`:
  - el aviso de caso bloqueado y las misiones sin guía marcadas;
  - el entregable en cinco estados: sin enviar, en revisión, observado (con el comentario), aprobado (caso completo y certificados), y el aviso cuando faltan misiones;
  - los problemas de la verificación.
- Produces la página `/profesor/entregables`, para docentes y administración, con la rúbrica y los botones `Aprobar entregable` y `Pedir cambios`.
- Produces en `ResumenAdmin`: `entregablesPorRevisar`.

- [ ] **Step 1: Escribir los tests que fallan**

En `apps/web/src/lib/certificados/servicio.test.ts`:
- agregar `certificadosDelCaso` al import de `./servicio`;
- agregar:
```ts
describe("certificadosDelCaso", () => {
  it("devuelve el certificado del caso y los de sus rutas", async () => {
    const userId = await escenario();
    expect(await certificadosDelCaso(db, userId, "ventas")).toEqual([]);
    await emitirCertificadosDelCaso(db, userId, "ventas");
    expect((await certificadosDelCaso(db, userId, "ventas")).map(({ tipo, titulo }) => ({ tipo, titulo })).sort((a, b) => a.tipo.localeCompare(b.tipo))).toEqual([
      { tipo: "caso", titulo: "Ventas de marzo" },
      { tipo: "ruta", titulo: "Data Analyst" },
    ]);
    expect(await certificadosDelCaso(db, userId, "otro")).toEqual([]);
  });
});
```

En `apps/web/src/lib/admin/resumen.test.ts`:
- agregar `entregables` al import de schema;
- antes del `expect`, agregar:
```ts
    await db.insert(entregables).values([
      { userId: ana.id, casoId: caso.id, url: "https://github.com/ana/ventas" },
      { userId: beto.id, casoId: caso.id, url: "https://github.com/beto/ventas", estado: "aprobado" },
    ]);
```
- agregar `entregablesPorRevisar: 1,` al objeto esperado.

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/certificados src/lib/admin/resumen.test.ts`
Expected: FAIL, porque no existen `certificadosDelCaso` ni `entregablesPorRevisar`.

- [ ] **Step 3: Implementar**

`apps/web/src/lib/certificados/servicio.ts`:
- cambiar el import de `drizzle-orm` por `import { and, asc, desc, eq, inArray, isNotNull, or } from "drizzle-orm";`;
- agregar al final:
```ts
export async function certificadosDelCaso(db: AppDb, userId: string, casoSlug: string): Promise<CertificadoEmitido[]> {
  const [caso] = await db.select({ id: casos.id }).from(casos).where(eq(casos.slug, casoSlug));
  if (!caso) return [];
  const rutasDelCaso = (await db.select({ rutaId: rutaCasos.rutaId }).from(rutaCasos).where(eq(rutaCasos.casoId, caso.id))).map((fila) => fila.rutaId);
  const delCaso = eq(certificados.casoId, caso.id);
  const filas = await db
    .select({ codigo: certificados.codigo, tipo: certificados.tipo, titulo: certificados.titulo })
    .from(certificados)
    .where(and(eq(certificados.userId, userId), rutasDelCaso.length > 0 ? or(delCaso, inArray(certificados.rutaId, rutasDelCaso)) : delCaso))
    .orderBy(asc(certificados.emitidoEn));
  return filas.map((fila) => ({ codigo: fila.codigo, tipo: fila.tipo as TipoCertificado, titulo: fila.titulo }));
}
```

`apps/web/src/lib/admin/resumen.ts`:
- agregar `entregables` al import de schema;
- agregar `entregablesPorRevisar: number;` a `ResumenAdmin`;
- agregar `total(db.select({ total: count() }).from(entregables).where(eq(entregables.estado, "pendiente"))),` al final del `Promise.all`, desestructurado como `entregablesPorRevisar`;
- agregar `entregablesPorRevisar` al objeto devuelto.

`apps/web/src/app/api/progreso/route.ts`, en `GET`:
- agregar `import { certificadosDelCaso } from "@/lib/certificados/servicio";`;
- reemplazar `return NextResponse.json(progreso, ...)` por:
```ts
  const certificados = await certificadosDelCaso(getDb(), userId, caso);
  return NextResponse.json({ ...progreso, certificados }, { headers: { "Cache-Control": "no-store" } });
```

`apps/web/src/lib/progreso/cliente.ts`:
- cambiar el import de tipos de `./servicio` por `import type { EstadoMision, RevisionEntregable } from "./servicio";`;
- agregar `revision: RevisionEntregable | null;` a `ProgresoVisible`;
- agregar `revision: servidor?.revision ?? null,` al objeto que devuelve `cargarProgreso`.

En `apps/web/src/lib/progreso/cliente.test.ts`, agregar `revision: null,` a los dos `toEqual` de `cargarProgreso`.

- [ ] **Step 4: Correr los tests**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/certificados src/lib/admin/resumen.test.ts src/lib/progreso`
Expected: PASS.

- [ ] **Step 5: Reemplazar `apps/web/src/components/mision/panel-caso.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { cargarProgreso, dependenciasNavegador, type ProgresoVisible } from "@/lib/progreso/cliente";
import type { CasoCorto } from "@/lib/progreso/requisitos";

type MisionDelCaso = { slug: string; titulo: string; tiempo: number; tareas: string[]; sinGuia: boolean };

const MENSAJES_409: Record<string, string> = {
  misiones_pendientes: "Aprueba todas las misiones antes de enviar tu entregable.",
  entregable_aprobado: "Tu entregable ya fue aprobado.",
  caso_bloqueado: "Primero completa el caso anterior de la ruta.",
};

function etiquetaEstado(estado: "en_curso" | "aprobada" | undefined): string {
  if (estado === "aprobada") return "Aprobada";
  if (estado === "en_curso") return "En curso";
  return "Pendiente";
}

export function PanelCaso({ caso, misiones, entregable, requisitos }: { caso: string; misiones: MisionDelCaso[]; entregable: string; requisitos: CasoCorto[] }) {
  const [progreso, setProgreso] = useState<ProgresoVisible | null>(null);
  const [url, setUrl] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const tareasPorMision = useMemo(() => Object.fromEntries(misiones.map((mision) => [mision.slug, mision.tareas])), [misiones]);

  useEffect(() => {
    let vigente = true;
    void cargarProgreso(caso, tareasPorMision, dependenciasNavegador()).then((cargado) => {
      if (!vigente) return;
      setProgreso(cargado);
      if (cargado.entregable) setUrl(cargado.entregable);
    });
    return () => {
      vigente = false;
    };
  }, [caso, tareasPorMision]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje(null);
    setProblemas([]);
    try {
      const respuesta = await fetch("/api/entregables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caso, url }) });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string; problemas?: string[] };
      if (respuesta.ok) {
        setProgreso((actual) => (actual ? { ...actual, entregable: url, revision: { estado: "pendiente", comentario: null } } : actual));
        setMensaje("Recibimos tu entregable. Te avisaremos por email cuando lo revisen.");
      } else if (respuesta.status === 422) setProblemas(datos.problemas ?? []);
      else if (respuesta.status === 400) setMensaje("El enlace debe ser un repositorio de GitHub: https://github.com/tu-usuario/tu-repositorio");
      else if (respuesta.status === 409) setMensaje(MENSAJES_409[datos.error ?? ""] ?? "No pudimos enviar tu entregable.");
      else if (respuesta.status === 429) setMensaje("Enviaste varios entregables seguidos. Espera un rato antes de volver a intentarlo.");
      else setMensaje("No pudimos enviar tu entregable. Intenta de nuevo.");
    } catch {
      setMensaje("No pudimos enviar tu entregable. Revisa tu conexión.");
    } finally {
      setEnviando(false);
    }
  }

  const casoPendiente = progreso ? (progreso.sesion ? progreso.bloqueadoPor : (requisitos[0] ?? null)) : null;
  const todasAprobadas = misiones.every((mision) => progreso?.misiones[mision.slug]?.estado === "aprobada");
  const revision = progreso?.revision ?? null;
  const volverAqui = `/login?callbackUrl=${encodeURIComponent(`/casos/${caso}`)}`;

  const formulario = (
    <form className="grid gap-3" onSubmit={enviar}>
      <Label>
        Enlace a tu repositorio de GitHub
        <Input name="url" type="url" required placeholder="https://github.com/tu-usuario/tu-repositorio" value={url} onChange={(evento) => setUrl(evento.target.value)} />
      </Label>
      <div><Button type="submit" disabled={enviando}>{enviando ? "Revisando tu repositorio…" : "Enviar a revisión"}</Button></div>
    </form>
  );

  return (
    <div className="grid gap-8">
      {casoPendiente ? (
        <p role="status" className="card p-4 text-sm leading-6">
          Puedes recorrer este caso, pero sus tareas se habilitan al completar{" "}
          <Link className="font-bold text-primary hover:underline" href={`/casos/${casoPendiente.slug}`}>{`«${casoPendiente.titulo}»`}</Link>.
          {progreso && !progreso.sesion ? <> <Link className="font-bold text-primary hover:underline" href={volverAqui}>Entrar</Link></> : null}
        </p>
      ) : null}
      <ol className="grid gap-3">
        {misiones.map((mision, indice) => (
          <li key={mision.slug}>
            <Link href={`/casos/${caso}/${mision.slug}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
              <span>
                <span className="block font-mono text-xs text-muted-foreground">{`Misión ${indice + 1} · ${mision.tiempo} min${mision.sinGuia ? " · sin guía" : ""}`}</span>
                <span className="block font-bold">{mision.titulo}</span>
              </span>
              <span data-testid={`estado-${mision.slug}`} className="badge">{etiquetaEstado(progreso?.misiones[mision.slug]?.estado)}</span>
            </Link>
          </li>
        ))}
      </ol>
      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Tu entregable</h2>
        <p className="leading-7 text-muted-foreground">{entregable}</p>
        {progreso?.completo ? <p role="status" className="font-bold text-primary">Caso completo</p> : null}
        {progreso?.certificados.length ? (
          <ul className="grid gap-2">
            {progreso.certificados.map((certificado) => (
              <li key={certificado.codigo}>
                <Link className="font-bold text-primary hover:underline" href={`/certificados/${certificado.codigo}`}>
                  Ver certificado de {certificado.tipo === "ruta" ? "ruta" : "caso"}: {certificado.titulo}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {!progreso ? null : !progreso.sesion ? (
          <p className="text-sm">Para enviar tu entregable necesitas una cuenta. <Link className="font-bold text-primary hover:underline" href={volverAqui}>Entrar</Link></p>
        ) : revision?.estado === "aprobado" ? (
          <p className="text-sm">
            Entregable aprobado: <a className="font-bold text-primary hover:underline" href={progreso.entregable ?? "#"} target="_blank" rel="noopener noreferrer">{progreso.entregable}</a>
          </p>
        ) : revision?.estado === "pendiente" ? (
          <p role="status" className="text-sm leading-6">
            Tu entregable está en revisión. Te avisaremos por email cuando lo revisen. Enviaste:{" "}
            <a className="font-bold text-primary hover:underline" href={progreso.entregable ?? "#"} target="_blank" rel="noopener noreferrer">{progreso.entregable}</a>
          </p>
        ) : !todasAprobadas ? (
          <p className="text-sm text-muted-foreground">Aprueba todas las misiones, incluida la misión sin guía, para enviar tu entregable a revisión.</p>
        ) : (
          <>
            {revision?.estado === "observado" ? (
              <div role="status" className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6">
                <p className="font-bold">Tu docente pidió cambios:</p>
                <p className="whitespace-pre-wrap">{revision.comentario}</p>
                <p>Haz los ajustes en tu repositorio y vuelve a enviarlo.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Revisaremos que tu repositorio sea público, tenga un README y los archivos del caso. Luego, una persona lo revisa con la rúbrica del caso.</p>
            )}
            {formulario}
          </>
        )}

        {problemas.length > 0 ? (
          <div role="alert" className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <p className="font-bold">No pudimos aceptar tu entregable:</p>
            <ul className="list-disc pl-5">{problemas.map((problema) => <li key={problema}>{problema}</li>)}</ul>
          </div>
        ) : null}
        {mensaje ? <p role="status" className="text-sm font-bold">{mensaje}</p> : null}
      </section>
    </div>
  );
}
```

En `apps/web/src/app/(misiones)/casos/[caso]/page.tsx`:
- agregar `import { requisitosDelCaso } from "@/lib/progreso/requisitos-contenido";`;
- cambiar el import de `@/lib/contenido` por `import { casosParaPublicar, obtenerCaso, rutasParaPublicar } from "@/lib/contenido";`;
- después de `if (!caso) notFound();`, agregar `const requisitos = requisitosDelCaso(await rutasParaPublicar(), await casosParaPublicar(), caso.slug);`;
- reemplazar la línea de `<PanelCaso ... />` por:
```tsx
      <PanelCaso
        caso={caso.slug}
        entregable={caso.entregable}
        requisitos={requisitos}
        misiones={caso.misiones.map((mision) => ({ slug: mision.slug, titulo: mision.titulo, tiempo: mision.tiempo, sinGuia: mision.sinGuia, tareas: tareasDeMision(mision).map((tarea) => tarea.props.id) }))}
      />
```

- [ ] **Step 6: La revisión, para docentes y administración**

`apps/web/src/components/comunidad/formulario-revision.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

const MENSAJES: Record<string, string> = {
  rubrica_incompleta: "Para aprobar, marca todos los criterios de la rúbrica.",
  falta_comentario: "Para pedir cambios, explica qué debe mejorar (al menos 10 caracteres).",
  no_existe: "Este entregable ya fue revisado.",
  prohibido: "No puedes revisar este entregable.",
};

export function FormularioRevision({ entregableId, rubrica }: { entregableId: string; rubrica: string[] }) {
  const router = useRouter();
  const [criterios, setCriterios] = useState<boolean[]>(() => rubrica.map(() => false));
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function revisar(decision: "aprobado" | "observado") {
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson(`/api/revision/entregables/${entregableId}`, "POST", { decision, criterios, comentario: comentario.trim() || null });
    setEnviando(false);
    if (respuesta.ok || respuesta.status === 404) {
      if (!respuesta.ok) setAviso(MENSAJES.no_existe);
      router.refresh();
      return;
    }
    setAviso(MENSAJES[respuesta.error ?? ""] ?? "No se pudo guardar la revisión. Intenta de nuevo.");
  }

  return (
    <div className="grid gap-3">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold">Rúbrica</legend>
        {rubrica.map((criterio, indice) => (
          <label key={criterio} className="flex items-start gap-2 text-sm leading-6">
            <input
              type="checkbox"
              className="mt-1.5"
              checked={criterios[indice]}
              onChange={(evento) => setCriterios((actuales) => actuales.map((valor, posicion) => (posicion === indice ? evento.target.checked : valor)))}
            />
            {criterio}
          </label>
        ))}
      </fieldset>
      <label className="grid gap-1 text-sm font-bold">
        Comentario para la persona (obligatorio si pides cambios)
        <textarea
          value={comentario}
          onChange={(evento) => setComentario(evento.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={enviando} onClick={() => void revisar("aprobado")}>Aprobar entregable</Button>
        <Button type="button" variant="ghost" disabled={enviando} onClick={() => void revisar("observado")}>Pedir cambios</Button>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </div>
  );
}
```

`apps/web/src/app/(dashboard)/profesor/entregables/page.tsx`:
```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RUBRICA_BASE } from "@syntaxerror/content/esquemas";
import { getDb } from "@syntaxerror/db/client";
import { FormularioRevision } from "@/components/comunidad/formulario-revision";
import { casosParaPublicar } from "@/lib/contenido";
import { listarEntregablesPorRevisar } from "@/lib/entregables/revision";
import { esDocente } from "@/lib/roles";
import { obtenerUsuarioActual } from "@/lib/sesion";

export const metadata = { title: "Entregables por revisar" };

const fecha = (valor: Date) => valor.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" });

export default async function EntregablesPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?callbackUrl=/profesor/entregables");
  if (!esDocente(usuario)) notFound();
  const [lista, casos] = await Promise.all([listarEntregablesPorRevisar(getDb(), usuario), casosParaPublicar()]);
  const rubricaDe = (slug: string) => casos.find((caso) => caso.slug === slug)?.rubrica ?? RUBRICA_BASE;

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-12 sm:px-6">
      <nav className="text-sm"><Link className="font-bold text-primary hover:underline" href="/profesor">← Panel docente</Link></nav>
      <p className="font-mono text-sm font-bold text-primary">{"> git review"}</p>
      <h1 className="text-3xl font-black">Entregables por revisar</h1>
      <p className="leading-7 text-muted-foreground">
        La plataforma ya verificó que cada repositorio es público, tiene README y los archivos del caso. Abre el repositorio y revísalo con la rúbrica: para aprobar, deben cumplirse todos los criterios.
      </p>
      {lista.length === 0 ? (
        <p className="text-muted-foreground">No hay entregables por revisar.</p>
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
    </main>
  );
}
```

Enlaces y resumen:
- `apps/web/src/app/(dashboard)/profesor/page.tsx`: junto al enlace a las preguntas de estudiantes, agregar `<Link className="font-bold text-primary hover:underline" href="/profesor/entregables">Revisar entregables</Link>`.
- `apps/web/src/app/(dashboard)/admin/layout.tsx`: agregar `{ href: "/profesor/entregables", texto: "Entregables" },` a `SECCIONES`, después de `Reportes`.
- `apps/web/src/app/(dashboard)/admin/page.tsx`: en la sección `Por revisar`, agregar:
```tsx
          <Tarjeta href="/profesor/entregables" valor={resumen.entregablesPorRevisar} texto="Entregables por revisar" alerta />
```

- [ ] **Step 7: Correr los tests, el typecheck y el build**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected:
- PASS y `tsc` sin errores;
- `/casos/[caso]` y `/casos/[caso]/[mision]` siguen estáticas;
- `/profesor/entregables` es dinámica (`ƒ`).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/certificados apps/web/src/lib/admin apps/web/src/lib/progreso apps/web/src/app/api/progreso/route.ts apps/web/src/components/mision/panel-caso.tsx apps/web/src/components/comunidad/formulario-revision.tsx "apps/web/src/app/(misiones)/casos/[caso]/page.tsx" "apps/web/src/app/(dashboard)/profesor" "apps/web/src/app/(dashboard)/admin"
git commit -m "feat(entregables): estados del entregable en el caso y revision con rubrica para docentes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: E2E del recorrido, entorno y README

**Files:**
- Modify: `docker-compose.yml`
- Create: `e2e/tests/revision.ts`, `e2e/tests/recorrido.spec.ts`
- Modify: `e2e/tests/misiones.spec.ts`, `e2e/tests/cuenta.spec.ts`, `e2e/tests/tutor.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: todo lo anterior, `nuevaPagina` e `ip` (`e2e/tests/fixtures.ts`), y el admin de desarrollo (`admin@local.test`, clave `admin123456`).
- Produces en `e2e/tests/revision.ts`: `entrarComoAdmin(page)` y `aprobarEntregable(admin, email)`.
- Produces 3 e2e nuevos y la actualización de los que completaban un caso o usaban el tutor sin intentar.

- [ ] **Step 1: Verificación de prueba en desarrollo y e2e**

En `docker-compose.yml`, dentro de `environment` del servicio `web`, agregar:
```yaml
      ENTREGABLES_VERIFICACION: prueba
```
En producción no se define: la plataforma consulta GitHub. Si hay muchas entregas por hora, se agrega `GITHUB_TOKEN` (límite de 5.000 consultas por hora en vez de 60).

- [ ] **Step 2: Ayudas compartidas, `e2e/tests/revision.ts`**

```ts
import { expect, type Page } from "./fixtures";

// El admin de desarrollo lo crea db-setup (SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD).
export async function entrarComoAdmin(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@local.test");
  await page.locator('input[name="password"]').fill("admin123456");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function aprobarEntregable(admin: Page, email: string) {
  await admin.goto("/profesor/entregables");
  const tarjeta = admin.locator("li", { hasText: email });
  for (const criterio of await tarjeta.getByRole("checkbox").all()) await criterio.check();
  await tarjeta.getByRole("button", { name: "Aprobar entregable" }).click();
  await expect(tarjeta).toHaveCount(0);
}
```

- [ ] **Step 3: Escribir `e2e/tests/recorrido.spec.ts`**

```ts
import { expect, test, type Page } from "./fixtures";
import { entrarComoAdmin } from "./revision";

const CASO = "/casos/demo-motor";
const MISION_SQL = `${CASO}/01-clientes-de-regiones`;
const MISION_HOJA = `${CASO}/02-total-de-ventas`;

async function validarYEsperar(page: Page) {
  const reportado = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;
}

test("una misión se lee pero no se resuelve hasta aprobar la anterior", async ({ page }) => {
  await page.goto(MISION_HOJA);
  await expect(page.getByText("Para resolver esta tarea, primero aprueba la misión", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Validar" })).toBeDisabled();
});

test("las pistas aparecen después de dos intentos fallidos", async ({ page }) => {
  await page.goto(MISION_SQL);
  await expect(page.getByRole("button", { name: "Ver pista" })).toHaveCount(0);
  await page.getByLabel("Consulta SQL").fill("SELECT nombre FROM clientes");
  await validarYEsperar(page);
  await expect(page.getByText("Llevas 1.", { exact: false })).toBeVisible();
  await validarYEsperar(page);
  await page.getByRole("button", { name: "Ver pista" }).click();
  await expect(page.getByText("Parte con SELECT nombre, ciudad FROM clientes.")).toBeVisible();
});

test("un repositorio sin README no pasa y una observación vuelve a quien entregó", async ({ page, ip, nuevaPagina }) => {
  const email = `recorrido-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
  await page.goto("/registro");
  await page.locator('input[name="name"]').fill("Fernanda Lagos");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  for (const [mision, tarea] of [["01-clientes-de-regiones", "clientes-fuera-de-santiago"], ["02-total-de-ventas", "total-marzo"], ["03-ticket-promedio", "ticket-promedio"]]) {
    const respuesta = await page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso: "demo-motor", mision, tarea, aprobada: true },
    });
    expect(respuesta.ok()).toBe(true);
  }

  await page.goto(CASO);
  const enlace = page.getByLabel("Enlace a tu repositorio de GitHub");
  await enlace.fill("https://github.com/fernanda/repo-vacio");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Falta el README en la carpeta principal del repositorio.")).toBeVisible();
  await enlace.fill("https://github.com/fernanda/demo-motor");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto("/profesor/entregables");
  const tarjeta = admin.locator("li", { hasText: email });
  await tarjeta.getByLabel("Comentario para la persona", { exact: false }).fill("Falta explicar tus conclusiones en el README.");
  await tarjeta.getByRole("button", { name: "Pedir cambios" }).click();
  await expect(tarjeta).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("Tu docente pidió cambios:")).toBeVisible();
  await expect(page.getByText("Falta explicar tus conclusiones en el README.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar a revisión" })).toBeVisible();
});
```

- [ ] **Step 4: Actualizar los e2e que completaban un caso o usaban el tutor**

`e2e/tests/misiones.spec.ts`:
- agregar `import { aprobarEntregable, entrarComoAdmin } from "./revision";`;
- cambiar `registrarse` para que devuelva el email: guardarlo en una constante antes de llenar el campo, `return email;` al final, y su tipo de retorno a `Promise<string>`;
- en el test `"con sesión: aprueba las tres misiones y completa el caso con su entregable"`:
  - agregar `nuevaPagina` a sus parámetros (`async ({ page, nuevaPagina }) =>`);
  - guardar el resultado como `const email = await registrarse(page, "/dashboard");`;
  - reemplazar todo lo que va desde `await page.getByLabel("Enlace a tu entregable")` hasta el final del test por:
```ts
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill("https://github.com/valentina/demo-motor");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await aprobarEntregable(admin, email);

  await page.reload();
  await expect(page.getByText("Caso completo", { exact: true })).toBeVisible();
  await page.getByLabel("5 estrellas").check();
  await page.getByLabel("Comentario (opcional)").fill("Muy práctico para aprender SQL.");
  await page.getByRole("button", { name: "Publicar reseña" }).click();
  await expect(page.getByText("Gracias. Tu comentario se publicará cuando lo revisemos.")).toBeVisible();
```

`e2e/tests/cuenta.spec.ts`, en el test `"completar el caso emite el certificado, se verifica en público y aparece en el portafolio"`:
- agregar `import { aprobarEntregable, entrarComoAdmin } from "./revision";` al archivo;
- agregar `nuevaPagina` a los parámetros del test;
- reemplazar las tres líneas desde `await page.getByLabel("Enlace a tu entregable")` hasta `await page.getByRole("link", { name: /Ver certificado de caso/ }).click();` por:
```ts
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill("https://github.com/josefa/demo-motor");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await aprobarEntregable(admin, email);
  await page.reload();
  await page.getByRole("link", { name: /Ver certificado de caso/ }).click();
```

`e2e/tests/tutor.spec.ts`, en el test `"el tutor responde con el contexto de la misión y reutiliza la respuesta"`, justo después de `await page.goto(MISION_SQL);`, agregar:
```ts
  await page.getByRole("button", { name: "Preguntar al tutor" }).click();
  await expect(page.getByText("Primero intenta resolver la tarea.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar" }).click();
  for (let intento = 0; intento < 3; intento += 1) {
    const reportado = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
    await page.getByLabel("Consulta SQL").fill("SELECT nombre FROM clientes");
    await page.getByRole("button", { name: "Validar" }).click();
    await reportado;
  }
```

- [ ] **Step 5: Documentar en `README.md`**

Agregar al final:
~~~markdown
## Recorrido y ayudas

Se basa en la propuesta pedagógica aprobada (`docs/propuesta-pedagogica-data-analyst.md`).

- **Orden obligatorio:**
  - La tarea de una misión se habilita al aprobar la anterior, y un caso al completar el caso anterior de su ruta.
  - Todo se puede leer; lo que se bloquea es resolver.
  - El servidor rechaza con 409 los intentos fuera de orden.
- **Primero intentar:**
  - La primera pista aparece tras 2 intentos fallidos de la tarea y luego una por intento.
  - El tutor IA se habilita tras 3 intentos fallidos en la misión (5 en una misión sin guía).
  - Los umbrales están en `apps/web/src/lib/progreso/ayudas.ts`.
- **Misión sin guía:**
  - `sinGuia: true` en el frontmatter.
  - Sin concepto, ejemplos ni pistas.
  - El validador exige que la última misión de todo caso de una ruta publicada lo sea.
- **Entregables:**
  - Deben ser un repositorio de GitHub.
  - Al enviarlo se verifica que sea público, tenga README y los archivos de `archivos` en `caso.yaml`.
  - Luego un docente de la clase, o administración, lo revisa en `/profesor/entregables` con la rúbrica del caso (`rubrica` en `caso.yaml`, con una base común).
  - Solo un entregable aprobado completa el caso y emite el certificado.
  - En local y en e2e, `ENTREGABLES_VERIFICACION=prueba` evita consultar GitHub (un repositorio con `vacio` en el nombre simula uno sin README).
  - En producción conviene definir `GITHUB_TOKEN`.
~~~

- [ ] **Step 6: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `docker compose up -d --build && npm run test:e2e`
Expected: `27 passed` (los 24 anteriores, ya actualizados, y los 3 de recorrido).

Run: `npm run test:e2e`
Expected: otra vez `27 passed`.

Run: `docker compose down && npm run test:e2e:prod`
Expected: `27 passed` contra el build de producción.

Run: `for p in /casos/demo-motor /casos/demo-motor/01-clientes-de-regiones; do curl -s -o /dev/null localhost:3000$p; curl -s -D - -o /dev/null localhost:3000$p | grep -i x-nextjs-cache; done`
Expected: `x-nextjs-cache: HIT` dos veces.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml down`

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml e2e README.md
git commit -m "test(e2e): orden de misiones, pistas despues de intentar y entregables revisados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

- **Fase 3e2 (Consolas):**
  - el editor con sintaxis coloreada, autocompletado y explicaciones;
  - los errores en español con sugerencia;
  - las tablas de pandas visibles;
  - el contrato común de los motores.
- **Fase 4 (contenido):** el caso 0 "Herramientas del oficio" y los 5 casos de Data Analyst, escritos con estas reglas: la misión sin guía al final, el repaso intercalado, `archivos` y una `rubrica` por caso.
