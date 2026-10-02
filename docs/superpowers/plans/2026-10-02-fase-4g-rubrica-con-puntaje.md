# Fase 4g: Rúbrica con puntaje. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revisar los entregables con la rúbrica estándar del equipo, con puntaje y no con casillas.
- **La rúbrica:** tres dimensiones (claridad del README y la explicación, ejecución técnica del análisis y coherencia de las conclusiones), cada una con puntaje 1 (Insuficiente), 2 (Aceptable) o 3 (Destacado).
- **La regla:** se aprueba con al menos 2 en las tres.
- **Si alguna queda en 1:**
  - la persona recibe el comentario puntual de esa dimensión;
  - corrige el repositorio y lo reenvía sin penalización;
  - el entregable vuelve a pasar por la revisión.

**Architecture:**
- **La rúbrica estándar:** vive en `@syntaxerror/content/rubrica`, un módulo sin dependencias que usan el validador, el servidor y el navegador. Define las dimensiones, sus nombres, los niveles, el puntaje para aprobar y una rúbrica base.
- **Cada caso describe qué se espera en cada dimensión:** `rubrica` en `caso.yaml` pasa de una lista de criterios a un objeto con `claridad`, `ejecucion` y `coherencia`. Las seis rúbricas se reescriben conservando lo que pedía cada criterio.
- **La decisión la toma la regla, no quien revisa:** quien revisa pone los puntajes y `evaluarRubrica` decide.
  - Con 2 o más en las tres, el entregable queda aprobado.
  - Si hay un 1, queda observado, y esa dimensión exige un comentario de al menos 10 caracteres.
- **Base de datos:** `entregables.criterios` (booleanos) se reemplaza por `puntajes` y `observaciones`, ambos `jsonb` por dimensión. Son dos migraciones: drizzle-kit pregunta si es un renombre cuando en una sola se agrega y se quita una columna.
- **Lo que ve la persona:**
  - antes de enviar, la rúbrica del caso en su página ("Cómo se revisa tu entregable");
  - después de la revisión, el puntaje y el comentario de cada dimensión, sea que se aprobó o se pidieron cambios;
  - por email, una observación por párrafo, empezando por lo que hay que corregir.
- **El reenvío sin penalización ya existe** (Fase 3): al reenviar, la revisión anterior se borra y el entregable vuelve a pendiente.

**Tech Stack:** Next.js 15, Drizzle ORM con drizzle-kit, zod, Vitest 4 y Playwright 1.55.

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`, secciones 9 (cómo se evalúa) y 15 (decisiones del equipo), con la regla de aprobación acordada el 2026-10-02.

## Global Constraints

**Copia literal:** cada archivo completo de este plan (`.ts`, `.tsx`, `.yaml` y `.sql`) se copia exactamente como está, con sus comentarios. Antes de cada commit, cada archivo completo se compara con `diff` contra el plan.

**Entorno y texto**
- Todo se ejecuta con `docker compose run --rm tools ...`.
- El paquete de la app se llama `web`.
- `npm run test:e2e` corre contra el build de producción.
- El texto visible va en español de Chile, tratando de tú, sin voseo y con lenguaje neutro.

**Regla de aprobación**
- Es la del equipo y no se ajusta: 2 o más en las tres dimensiones.
- El servidor la aplica siempre (`evaluarRubrica`). El formulario solo la anticipa, para que quien revisa vea el resultado antes de enviar.

**Migraciones**
- Se generan con drizzle-kit en dos pasos, con nombres fijos (`--name`), sin editarlas a mano.
- Los `meta/*_snapshot.json` que genera drizzle-kit se commitean tal cual.

**Páginas:** `/casos/[caso]` sigue siendo estática (`x-nextjs-cache: HIT`), ahora con la rúbrica.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Alguien envía la revisión por la API sin el formulario,** con un puntaje faltante, un 4, un 0 o un 1 sin comentario. Responde 400 con `puntajes_incompletos` o `falta_observacion`, y el entregable sigue pendiente. Las pruebas de `evaluarRubrica` y `revisarEntregable` cubren cada caso, en la Task 1.
2. **Un 1 con el comentario puesto en otra dimensión.** No basta: el comentario tiene que estar en la dimensión insuficiente. Probado en `rubrica.test.ts`.
3. **La persona reenvía después de una observación.** La revisión anterior se borra (puntajes, observaciones y comentario), y el entregable vuelve a pendiente y a la lista de quien revisa. Probado en `servicio.test.ts` y en el e2e de recorrido.
4. **Un entregable aprobado antes de esta fase,** que tiene `puntajes` vacío por la migración. El panel muestra "Entregable aprobado" sin puntajes ni errores (`ResultadoRevision` solo lista las dimensiones con puntaje).
5. **Un `caso.yaml` con la rúbrica antigua, como lista, o con una dimensión faltante.** El validador lo rechaza con un mensaje que dice qué se espera. Probado en `cargar.test.ts`.

## Estructura de archivos

```
packages/content/src/rubrica.ts (+ export en package.json)   dimensiones, niveles, regla y rúbrica base
packages/content/src/esquemas.ts, tipos.ts (+ tests)          rubrica como objeto por dimensión
content/casos/*/caso.yaml (6)                                 rúbricas reescritas en tres dimensiones
packages/db/src/schema.ts, drizzle/0007, 0008                 puntajes y observaciones en vez de criterios
packages/queue/src/emails.ts, apps/worker/src/emails/         el email lleva una observación por párrafo
apps/web/src/lib/entregables/rubrica.ts (+ test)              evaluarRubrica y observacionesParaLaPersona
apps/web/src/lib/entregables/revision.ts (+ test)             la decisión sale de la rúbrica
apps/web/src/app/api/revision/entregables/[id]/route.ts       recibe puntajes y observaciones
apps/web/src/lib/progreso/servicio.ts, cliente.ts (+ test)    la persona recibe puntajes y observaciones
apps/web/src/components/comunidad/formulario-revision.tsx     puntaje por dimensión
apps/web/src/components/mision/resultado-revision.tsx         lo que ve la persona
apps/web/src/components/mision/rubrica-del-caso.tsx           la rúbrica en la página del caso
apps/web/src/components/mision/panel-caso.tsx, páginas del caso y del docente
e2e/tests/revision.ts, progreso.ts, recorrido.spec.ts, README.md
```

---

### Task 1: La rúbrica estándar y la regla de aprobación

**Files:**
- Create: `packages/content/src/rubrica.ts`
- Modify: `packages/content/package.json`
- Create: `apps/web/src/lib/entregables/rubrica.ts`
- Test: `apps/web/src/lib/entregables/rubrica.test.ts`

**Interfaces:**
- Produces en `@syntaxerror/content/rubrica`:
  - `DIMENSIONES`, `Dimension` y `NOMBRES_DIMENSION`;
  - `PUNTAJES`, `Puntaje` y `NIVELES` (nombre y descripción de cada nivel);
  - `PUNTAJE_PARA_APROBAR = 2`;
  - `Rubrica = Record<Dimension, string>` y `RUBRICA_BASE`.
- Produces en `@/lib/entregables/rubrica`:
  - los tipos `Puntajes`, `Observaciones` y `Evaluacion`;
  - `LARGO_MINIMO_OBSERVACION = 10`;
  - `evaluarRubrica(puntajes, observaciones): Evaluacion`;
  - `observacionesParaLaPersona(puntajes, observaciones, comentario): string[]`.

Esta task solo agrega código: el resto de la app todavía no lo usa.

- [ ] **Step 1: Escribir las pruebas**

`apps/web/src/lib/entregables/rubrica.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { evaluarRubrica, observacionesParaLaPersona } from "./rubrica";

describe("evaluarRubrica", () => {
  it("aprueba con 2 o más en las tres dimensiones", () => {
    expect(evaluarRubrica({ claridad: 2, ejecucion: 3, coherencia: 2 }, {})).toEqual({
      ok: true,
      decision: "aprobado",
      puntajes: { claridad: 2, ejecucion: 3, coherencia: 2 },
      observaciones: {},
    });
  });

  it("con un 1 pide cambios y guarda los comentarios sin espacios de más", () => {
    expect(evaluarRubrica({ claridad: 3, ejecucion: 1, coherencia: 2 }, { ejecucion: "  El notebook falla en la celda 4.  ", claridad: "   " })).toEqual({
      ok: true,
      decision: "observado",
      puntajes: { claridad: 3, ejecucion: 1, coherencia: 2 },
      observaciones: { ejecucion: "El notebook falla en la celda 4." },
    });
  });

  it("exige un puntaje de 1 a 3 en cada dimensión", () => {
    expect(evaluarRubrica({ claridad: 2, ejecucion: 2 }, {})).toEqual({ ok: false, motivo: "puntajes_incompletos", dimension: "coherencia" });
    expect(evaluarRubrica({ claridad: 4, ejecucion: 2, coherencia: 2 }, {})).toEqual({ ok: false, motivo: "puntajes_incompletos", dimension: "claridad" });
    expect(evaluarRubrica({ claridad: 0, ejecucion: 2, coherencia: 2 }, {})).toMatchObject({ ok: false, motivo: "puntajes_incompletos" });
  });

  it("una dimensión insuficiente necesita su comentario, de al menos 10 caracteres", () => {
    expect(evaluarRubrica({ claridad: 1, ejecucion: 2, coherencia: 2 }, {})).toEqual({ ok: false, motivo: "falta_observacion", dimension: "claridad" });
    expect(evaluarRubrica({ claridad: 1, ejecucion: 2, coherencia: 2 }, { claridad: "corto" })).toEqual({ ok: false, motivo: "falta_observacion", dimension: "claridad" });
    expect(evaluarRubrica({ claridad: 1, ejecucion: 2, coherencia: 2 }, { coherencia: "Este comentario está en otra dimensión." })).toMatchObject({ ok: false, motivo: "falta_observacion" });
  });
});

describe("observacionesParaLaPersona", () => {
  it("parte por lo que hay que corregir y termina con el comentario general", () => {
    const puntajes = { claridad: 3, ejecucion: 1, coherencia: 2 } as const;
    expect(observacionesParaLaPersona(puntajes, { claridad: "Muy buen README.", ejecucion: "El notebook falla en la celda 4." }, "Vas bien.")).toEqual([
      "Ejecución técnica del análisis (Insuficiente): El notebook falla en la celda 4.",
      "Claridad del README y la explicación (Destacado): Muy buen README.",
      "Comentario general: Vas bien.",
    ]);
    expect(observacionesParaLaPersona(puntajes, { ejecucion: "El notebook falla en la celda 4." }, null)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/entregables/rubrica.test.ts`
Expected: FAIL, "Failed to resolve import ./rubrica".

- [ ] **Step 3: Implementar**

`packages/content/src/rubrica.ts`:
```ts
// Rúbrica estándar del equipo (propuesta pedagógica, sección 9): las mismas tres dimensiones en todos los casos,
// cada una con puntaje de 1 a 3. Cada caso describe qué se espera en cada dimensión para su entregable.
export const DIMENSIONES = ["claridad", "ejecucion", "coherencia"] as const;
export type Dimension = (typeof DIMENSIONES)[number];

export const NOMBRES_DIMENSION: Record<Dimension, string> = {
  claridad: "Claridad del README y la explicación",
  ejecucion: "Ejecución técnica del análisis",
  coherencia: "Coherencia de las conclusiones",
};

export const PUNTAJES = [1, 2, 3] as const;
export type Puntaje = (typeof PUNTAJES)[number];

export const NIVELES: Record<Puntaje, { nombre: string; descripcion: string }> = {
  1: { nombre: "Insuficiente", descripcion: "No cumple lo que se espera: falta algo central o hay errores que cambian el resultado." },
  2: { nombre: "Aceptable", descripcion: "Cumple lo que se espera en esta dimensión." },
  3: { nombre: "Destacado", descripcion: "Lo cumple y va más allá: podría mostrarse como ejemplo." },
};

// Se aprueba con al menos este puntaje en cada dimensión (decisión del equipo, 2026-10-02).
export const PUNTAJE_PARA_APROBAR: Puntaje = 2;

export type Rubrica = Record<Dimension, string>;

// Para los casos que no describen su rúbrica.
export const RUBRICA_BASE: Rubrica = {
  claridad: "El README explica qué se hizo, con qué datos y cómo revisarlo.",
  ejecucion: "Los archivos del caso resuelven el encargo y se pueden revisar: consultas, fórmulas o código que funcionan.",
  coherencia: "Las conclusiones responden la pregunta del encargo y se apoyan en los datos.",
};
```

En `packages/content/package.json`, agrega a `exports`, después de `"./esquemas"`:
```json
    "./rubrica": "./src/rubrica.ts",
```

`apps/web/src/lib/entregables/rubrica.ts`:
```ts
import { DIMENSIONES, NIVELES, NOMBRES_DIMENSION, PUNTAJE_PARA_APROBAR, PUNTAJES, type Dimension, type Puntaje } from "@syntaxerror/content/rubrica";

export type Puntajes = Partial<Record<Dimension, number>>;
export type Observaciones = Partial<Record<Dimension, string>>;
export type Evaluacion =
  | { ok: true; decision: "aprobado" | "observado"; puntajes: Record<Dimension, Puntaje>; observaciones: Observaciones }
  | { ok: false; motivo: "puntajes_incompletos" | "falta_observacion"; dimension: Dimension };

export const LARGO_MINIMO_OBSERVACION = 10;

const esPuntaje = (valor: unknown): valor is Puntaje => PUNTAJES.includes(valor as Puntaje);

// La regla del equipo (2026-10-02): se aprueba con 2 o más en las tres dimensiones. Con un 1 se piden cambios, y esa
// dimensión necesita un comentario puntual para que la persona sepa qué corregir antes de reenviar.
export function evaluarRubrica(puntajes: Puntajes, observaciones: Observaciones): Evaluacion {
  const completos = {} as Record<Dimension, Puntaje>;
  const limpias: Observaciones = {};
  for (const dimension of DIMENSIONES) {
    const puntaje = puntajes[dimension];
    if (!esPuntaje(puntaje)) return { ok: false, motivo: "puntajes_incompletos", dimension };
    completos[dimension] = puntaje;
    const texto = observaciones[dimension]?.trim();
    if (texto) limpias[dimension] = texto;
    if (puntaje < PUNTAJE_PARA_APROBAR && (texto ?? "").length < LARGO_MINIMO_OBSERVACION) return { ok: false, motivo: "falta_observacion", dimension };
  }
  const aprobado = DIMENSIONES.every((dimension) => completos[dimension] >= PUNTAJE_PARA_APROBAR);
  return { ok: true, decision: aprobado ? "aprobado" : "observado", puntajes: completos, observaciones: limpias };
}

// Lo que recibe la persona cuando se piden cambios: primero las dimensiones por corregir, después el resto de los
// comentarios y al final el comentario general.
export function observacionesParaLaPersona(puntajes: Record<Dimension, Puntaje>, observaciones: Observaciones, comentario: string | null): string[] {
  const ordenadas = [...DIMENSIONES].sort((a, b) => puntajes[a] - puntajes[b]);
  const lineas = ordenadas
    .filter((dimension) => observaciones[dimension])
    .map((dimension) => `${NOMBRES_DIMENSION[dimension]} (${NIVELES[puntajes[dimension]].nombre}): ${observaciones[dimension]}`);
  return comentario ? [...lineas, `Comentario general: ${comentario}`] : lineas;
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec vitest run src/lib/entregables/rubrica.test.ts && pnpm --filter web exec tsc --noEmit && pnpm --filter @syntaxerror/content exec tsc --noEmit"`
Expected: PASS (5 pruebas) y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/rubrica.ts packages/content/package.json apps/web/src/lib/entregables/rubrica.ts apps/web/src/lib/entregables/rubrica.test.ts
git commit -m "feat(rubrica): dimensiones estandar del equipo y regla de aprobacion con 2 o mas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Revisar con puntaje, de punta a punta

**Files:**
- Modify: `packages/content/src/esquemas.ts`, `packages/content/src/tipos.ts`
- Test: `packages/content/src/cargar.test.ts`, `packages/content/src/sincronizar.test.ts`
- Modify: `content/casos/{herramientas-del-oficio,despachos-rapidos,minimarkets-del-sur,tienda-online-pewen,clinica-cordillera-central,proyecto-final}/caso.yaml`
- Modify: `packages/db/src/schema.ts`
- Create (generadas): `packages/db/drizzle/0007_rubrica_con_puntaje.sql`, `0008_quitar_criterios.sql` y sus `meta/`
- Modify: `packages/queue/src/emails.ts`, `apps/worker/src/emails/mensajes.ts`
- Test: `apps/worker/src/emails/mensajes.test.ts`
- Modify: `apps/web/src/lib/entregables/revision.ts`, `apps/web/src/app/api/revision/entregables/[id]/route.ts`
- Test: `apps/web/src/lib/entregables/revision.test.ts`
- Modify: `apps/web/src/lib/progreso/servicio.ts`, `apps/web/src/lib/progreso/cliente.ts`
- Test: `apps/web/src/lib/progreso/servicio.test.ts`
- Modify: `apps/web/src/components/comunidad/formulario-revision.tsx`, `apps/web/src/components/mision/panel-caso.tsx`
- Create: `apps/web/src/components/mision/resultado-revision.tsx`, `apps/web/src/components/mision/rubrica-del-caso.tsx`
- Modify: `apps/web/src/app/(misiones)/casos/[caso]/page.tsx`, `apps/web/src/app/(dashboard)/profesor/entregables/page.tsx`

**Interfaces:**
- Consumes: todo lo que produce la Task 1.
- Produces:
  - `Caso.rubrica: Rubrica` (antes `string[]`);
  - las columnas `entregables.puntajes` y `entregables.observaciones` (`jsonb`, `{}` por defecto). `criterios` desaparece;
  - `revisarEntregable(db, { entregableId, revisor, puntajes, observaciones, comentario }, { encolar, meta })`, que devuelve:
    - `{ ok: true, decision, certificados }`;
    - o `{ ok: false, motivo: "no_existe" | "prohibido" | "puntajes_incompletos" | "falta_observacion" }`;
  - `POST /api/revision/entregables/[id]`:
    - recibe `{ puntajes: { claridad?, ejecucion?, coherencia? }, observaciones?: {...}, comentario: string | null }`;
    - responde `{ decision, certificados }`, o un 400 con `puntajes_incompletos` o `falta_observacion`;
  - `RevisionEntregable = { estado, puntajes, observaciones, comentario }`;
  - el email `entregable-observado`, con `observaciones: string[]` en vez de `comentario`;
  - `<FormularioRevision entregableId rubrica />` (con `rubrica: Rubrica`), `<ResultadoRevision revision />` y `<RubricaDelCaso rubrica />`.

Los pasos cambian juntos la rúbrica del contenido, la base de datos y la app: por separado, el tipo de `Caso.rubrica` no compila. Las pruebas se corren al final de la task.

- [ ] **Step 1: Las pruebas del contenido, de la revisión y del email**

En `packages/content/src/cargar.test.ts`:

1. Agrega el import, después del de `./cargar`:
```ts
import { RUBRICA_BASE } from "./rubrica";
```
2. En la prueba del caso válido, `expect(caso.rubrica).toHaveLength(3);` pasa a `expect(caso.rubrica).toEqual(RUBRICA_BASE);`.
3. Antes de `it("valida las props de cada bloque", ...)`, agrega:
```ts
  it("la rúbrica describe las tres dimensiones estándar, no una lista de criterios", async () => {
    const lista = await problemasCon((dir) => appendFile(enCaso(dir, "caso.yaml"), 'rubrica:\n  - "Responde la pregunta."\n'));
    expect(lista).toContain("casos/ventas/caso.yaml: rubrica: la rúbrica describe claridad, ejecucion y coherencia");
    const incompleta = await problemasCon((dir) => appendFile(enCaso(dir, "caso.yaml"), 'rubrica:\n  claridad: "README claro."\n  ejecucion: "Consultas correctas."\n'));
    expect(incompleta.some((problema) => problema.startsWith("casos/ventas/caso.yaml: rubrica.coherencia"))).toBe(true);
  });
```

En `packages/content/src/sincronizar.test.ts`:
1. Agrega `import { RUBRICA_BASE } from "./rubrica";` después del import de `./esquemas`.
2. `rubrica: [],` pasa a `rubrica: RUBRICA_BASE,`.

`apps/web/src/lib/entregables/revision.test.ts` completo:
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
const deps = { encolar, meta: SIN_META };
const SUFICIENTE = { claridad: 2, ejecucion: 3, coherencia: 2 };

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

  it("con 2 o más en las tres dimensiones aprueba, completa el caso y emite el certificado una sola vez", async () => {
    const { admin, entregableId } = await escenario();
    const revisar = (puntajes: Record<string, number>) => revisarEntregable(db, { entregableId, revisor: admin, puntajes, observaciones: {}, comentario: null }, deps);
    expect(await revisar({ claridad: 2, ejecucion: 3 })).toEqual({ ok: false, motivo: "puntajes_incompletos" });
    expect(await revisar(SUFICIENTE)).toEqual({ ok: true, decision: "aprobado", certificados: [{ codigo: expect.any(String), tipo: "caso", titulo: "Ventas" }] });
    expect(await revisar(SUFICIENTE)).toEqual({ ok: false, motivo: "no_existe" });
    const [fila] = await db.select().from(entregables);
    expect(fila).toMatchObject({ estado: "aprobado", puntajes: SUFICIENTE, observaciones: {} });
    expect(await db.select().from(certificados)).toHaveLength(1);
    expect(enviados.map((email) => email.tipo)).toEqual(["certificado-emitido"]);
    expect((await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action)).toEqual(["deliverable_reviewed"]);
  });

  it("con un 1 pide cambios, exige el comentario de esa dimensión y avisa por email", async () => {
    const { admin, entregableId } = await escenario();
    const puntajes = { claridad: 3, ejecucion: 2, coherencia: 1 };
    const observar = (observaciones: Record<string, string>) => revisarEntregable(db, { entregableId, revisor: admin, puntajes, observaciones, comentario: " Buen README. " }, deps);
    expect(await observar({ coherencia: "corto" })).toEqual({ ok: false, motivo: "falta_observacion" });
    expect(await observar({ coherencia: "Falta explicar las conclusiones en el README." })).toEqual({ ok: true, decision: "observado", certificados: [] });
    expect(enviados).toEqual([
      {
        tipo: "entregable-observado",
        para: "ana@correo.cl",
        nombre: "Ana",
        caso: "Ventas",
        observaciones: ["Coherencia de las conclusiones (Insuficiente): Falta explicar las conclusiones en el README.", "Comentario general: Buen README."],
        enlace: expect.stringContaining("/casos/ventas"),
      },
    ]);
    const [fila] = await db.select().from(entregables);
    expect(fila).toMatchObject({ estado: "observado", puntajes, observaciones: { coherencia: "Falta explicar las conclusiones en el README." }, comentario: "Buen README.", revisadoPor: admin.id });
  });

  it("una docente que no es de la clase no puede revisar", async () => {
    const { otra, entregableId } = await escenario();
    expect(await revisarEntregable(db, { entregableId, revisor: otra, puntajes: SUFICIENTE, observaciones: {}, comentario: null }, deps)).toEqual({ ok: false, motivo: "prohibido" });
  });
});
```

En `apps/web/src/lib/progreso/servicio.test.ts`, la prueba "un entregable observado se puede reenviar y vuelve a pendiente; uno aprobado no se reemplaza" queda así:
```ts
  it("un entregable observado se puede reenviar y vuelve a pendiente; uno aprobado no se reemplaza", async () => {
    const { userId } = await prepararCaso();
    await aprobarM1(userId);
    await registrarIntento(db, userId, intento("m2", "t3"));
    await enviar(userId);
    await db.update(entregables).set({ estado: "observado", puntajes: { claridad: 1, ejecucion: 2, coherencia: 2 }, observaciones: { claridad: "Falta el README" }, comentario: "Vas bien" });
    expect((await obtenerProgresoCaso(db, userId, "ventas"))?.revision).toEqual({
      estado: "observado",
      puntajes: { claridad: 1, ejecucion: 2, coherencia: 2 },
      observaciones: { claridad: "Falta el README" },
      comentario: "Vas bien",
    });
    expect(await enviar(userId, "https://github.com/alumna/ventas-v2")).toEqual({ estado: "en_revision" });
    expect((await obtenerProgresoCaso(db, userId, "ventas"))?.revision).toEqual({ estado: "pendiente", puntajes: {}, observaciones: {}, comentario: null });
    await db.update(entregables).set({ estado: "aprobado" });
    await expect(enviar(userId, "https://github.com/alumna/otra")).rejects.toMatchObject({ codigo: "entregable_aprobado" });
    const [fila] = await db.select().from(entregables);
    expect(fila.url).toBe("https://github.com/alumna/ventas-v2");
  });
```

En `apps/worker/src/emails/mensajes.test.ts`:

1. El caso de `entregable-observado` en `casos` queda:
```ts
  [
    { tipo: "entregable-observado", para: "ana@correo.cl", nombre: "Ana", caso: "Ventas", observaciones: ["Coherencia de las conclusiones (Insuficiente): falta explicar las conclusiones.", "Comentario general: buen README."], enlace },
    "Tu entregable necesita cambios",
  ],
```
2. Antes de `it("el aviso de cambio nombra el email nuevo", ...)`, agrega:
```ts
  it("el entregable observado trae cada observación en su párrafo", () => {
    const email = construirEmail(casos.find(([trabajo]) => trabajo.tipo === "entregable-observado")![0]);
    expect(email.texto).toContain("\n\nCoherencia de las conclusiones (Insuficiente): falta explicar las conclusiones.\n\nComentario general: buen README.\n");
  });
```

- [ ] **Step 2: La rúbrica del contenido**

En `packages/content/src/esquemas.ts`:

1. Agrega el import, después del de `markdown-requisitos`:
```ts
import { RUBRICA_BASE } from "./rubrica";
```
2. Reemplaza el bloque de `RUBRICA_BASE` (la lista y su comentario) por:
```ts
// Qué se espera en cada dimensión de la rúbrica estándar, descrito para el entregable del caso.
const rubricaSchema = z.object({ claridad: texto, ejecucion: texto, coherencia: texto }, { invalid_type_error: "la rúbrica describe claridad, ejecucion y coherencia" }).strict();
```
3. En `casoSchema`, la línea de `rubrica` queda:
```ts
  rubrica: rubricaSchema.default(RUBRICA_BASE),
```

`packages/content/src/tipos.ts` completo:
```ts
import type { z } from "zod";
import type { Fila } from "@syntaxerror/engines/tipos";
import type { Bloque, rutaSchema } from "./esquemas";
import type { Rubrica } from "./rubrica";

export type Ruta = z.output<typeof rutaSchema>;
export type Tabla = { nombre: string; filas: Fila[]; csv: string };
export type Mision = { slug: string; titulo: string; tiempo: number; sinGuia: boolean; fuente: string; bloques: Bloque[] };
export type Caso = {
  slug: string;
  titulo: string;
  cargo: string;
  empresa: string;
  dataset: string;
  entregable: string;
  archivos: string[];
  rubrica: Rubrica;
  misiones: Mision[];
  datos: Tabla[];
};
export type Contenido = { rutas: Ruta[]; casos: Caso[] };
```

En cada `caso.yaml`, el bloque `rubrica` (y el comentario que lo precede en `proyecto-final`) se reemplaza por el que sigue, justo antes de `misiones:`.

`content/casos/herramientas-del-oficio/caso.yaml` completo:
```yaml
slug: herramientas-del-oficio
titulo: "Herramientas del oficio: GitHub y tu portafolio"
cargo: Persona que empieza a trabajar en tecnología
empresa: Tu propio perfil profesional
dataset: Tus archivos, tus proyectos y tu presentación personal
entregable: Un repositorio público de presentación personal en GitHub, con un README que cuente quién eres, qué estás aprendiendo, qué proyectos tienes y cómo contactarte.
# Solo se pide el README: lo revisa la verificación automática y después una persona con la rúbrica.
archivos: []
# Rúbrica estándar: qué se espera en cada dimensión. Cada una se puntúa de 1 (Insuficiente) a 3 (Destacado), y se aprueba con 2 o más en las tres.
rubrica:
  claridad: "El README presenta a la persona: quién es, qué está aprendiendo, qué busca y cómo contactarla."
  ejecucion: "El README usa bien Markdown (título, secciones, listas, una imagen y enlaces que funcionan) y el historial de commits cuenta qué se hizo, con mensajes claros."
  coherencia: "Lo que el README dice de la persona calza con su perfil: los proyectos que menciona existen y están enlazados."
misiones:
  - 01-tu-primer-repositorio
  - 02-escribe-un-readme
  - 03-archivos-y-commits
  - 04-ordena-tu-proyecto
  - 05-el-readme-de-tu-proyecto
  - 06-tu-perfil-de-github
  - 07-tu-presentacion
```

`content/casos/despachos-rapidos/caso.yaml` completo:
```yaml
slug: despachos-rapidos
titulo: "Despachos Rápidos: ordenar el mes con planillas"
cargo: Analista de datos junior
empresa: Despachos Rápidos
dataset: Despachos de marzo de 2025 y tarifas por comuna (datos generados con un script reproducible)
entregable: Un repositorio en GitHub con tu planilla del análisis (.xlsx), con una hoja de conclusiones, y un README que explique qué encontraste y qué le recomiendas a la dueña.
archivos:
  - .xlsx
# Rúbrica estándar: qué se espera en cada dimensión. Cada una se puntúa de 1 (Insuficiente) a 3 (Destacado), y se aprueba con 2 o más en las tres.
rubrica:
  claridad: "La planilla se entiende: columnas con título y una hoja de conclusiones. El README explica qué se encontró y qué se recomienda."
  ejecucion: "Los cálculos usan fórmulas en vez de números escritos a mano, y los datos limpios están separados de los originales."
  coherencia: "Las respuestas a Carla y la recomendación se apoyan en números que salen de la planilla."
misiones:
  - 01-conoce-la-planilla
  - 02-totales-del-mes
  - 03-condiciones
  - 04-buscar-en-otra-tabla
  - 05-limpiar-los-datos
  - 06-resumir-por-comuna
  - 07-indicadores-de-entrega
  - 08-revisar-la-formula-de-la-ia
  - 09-resumen-para-la-duena
```

`content/casos/minimarkets-del-sur/caso.yaml` completo:
```yaml
slug: minimarkets-del-sur
titulo: "Minimarkets del Sur: responder a gerencia con SQL"
cargo: Analista de datos junior
empresa: Minimarkets del Sur
dataset: Ventas de enero a marzo de 2025 de ocho locales entre Talca y Puerto Montt (datos generados con un script reproducible)
entregable: Un repositorio en GitHub con tus consultas en archivos .sql, cada una con un comentario que diga qué pregunta responde, y un README con lo que encontraste y qué le recomiendas a gerencia.
archivos:
  - .sql
# Rúbrica estándar: qué se espera en cada dimensión. Cada una se puntúa de 1 (Insuficiente) a 3 (Destacado), y se aprueba con 2 o más en las tres.
rubrica:
  claridad: "Cada consulta tiene un comentario que dice qué pregunta responde, y el README explica qué se encontró."
  ejecucion: "Las consultas son correctas y se pueden leer: alias claros, una cláusula por línea y orden explícito cuando importa."
  coherencia: "Lo que afirma el README, por ejemplo qué pasó con Osorno en marzo, se respalda con resultados de las consultas."
misiones:
  - 01-conoce-las-tablas
  - 02-filtrar
  - 03-ordenar-y-limitar
  - 04-resumir-con-group-by
  - 05-filtrar-grupos
  - 06-cruzar-tablas
  - 07-ventas-por-mes
  - 08-preguntas-de-gerencia
```

`content/casos/tienda-online-pewen/caso.yaml` completo:
```yaml
slug: tienda-online-pewen
titulo: "Tienda Online Pewen: analizar ventas con Python y pandas"
cargo: Analista de datos junior
empresa: Tienda Online Pewen
dataset: Pedidos, productos y clientes de julio a diciembre de 2025 (datos generados con un script reproducible)
entregable: Un repositorio en GitHub con tu notebook de análisis (.ipynb, por ejemplo hecho en Google Colab), que cargue y limpie los datos, responda las preguntas de Antonia y cierre con recomendaciones, más un README que resuma lo que encontraste.
archivos:
  - .ipynb
# Rúbrica estándar: qué se espera en cada dimensión. Cada una se puntúa de 1 (Insuficiente) a 3 (Destacado), y se aprueba con 2 o más en las tres.
rubrica:
  claridad: "Cada paso del notebook tiene una explicación breve en texto, y el README resume lo que se encontró."
  ejecucion: "El notebook se ejecuta de principio a fin, y la limpieza está documentada: qué problemas había, cuántas filas afectaba cada uno y qué se hizo."
  coherencia: "Las recomendaciones se apoyan en resultados del notebook, como las devoluciones de Vestuario o el peso de noviembre."
misiones:
  - 01-de-la-planilla-a-python
  - 02-cargar-y-explorar
  - 03-filtrar-y-seleccionar
  - 04-limpiar
  - 05-agrupar-y-resumir
  - 06-cruzar-tablas
  - 07-detectar-patrones
  - 08-revisar-el-codigo-de-la-ia
  - 09-recomendaciones-para-el-negocio
```

`content/casos/clinica-cordillera-central/caso.yaml` completo:
```yaml
slug: clinica-cordillera-central
titulo: "Clínica Cordillera Central: un dashboard para decidir"
cargo: Analista de datos junior en el área de gestión
empresa: Clínica Cordillera Central
dataset: Atenciones de enero a junio de 2025 en cuatro sedes, sin datos de pacientes (datos generados con un script reproducible)
entregable: Un repositorio en GitHub con tu dashboard (el archivo .pbix de Power BI o el enlace público de Looker Studio), capturas de cada página en la carpeta capturas y un README que funcione como guion de una presentación de cinco minutos.
archivos:
  - .png
# Rúbrica estándar: qué se espera en cada dimensión. Cada una se puntúa de 1 (Insuficiente) a 3 (Destacado), y se aprueba con 2 o más en las tres.
rubrica:
  claridad: "El dashboard se lee fácil (lo importante arriba, títulos que dicen la conclusión, colores accesibles) y el README presenta los hallazgos y una recomendación en cinco minutos."
  ejecucion: "Cada indicador está bien definido (qué se cuenta y sobre qué total), se muestra con un gráfico adecuado y los filtros sirven."
  coherencia: "El dashboard responde las preguntas de la gerencia para la audiencia definida, y las capturas respaldan cada hallazgo."
misiones:
  - 01-la-pregunta-del-dashboard
  - 02-preparar-los-datos
  - 03-calcular-indicadores
  - 04-elegir-el-grafico
  - 05-disenar-el-dashboard
  - 06-construir-el-dashboard
  - 07-presentar-en-cinco-minutos
```

`content/casos/proyecto-final/caso.yaml` completo:
```yaml
slug: proyecto-final
titulo: "Proyecto final: tu propio análisis con datos públicos"
cargo: Analista de datos
empresa: Tu propio proyecto
dataset: Un conjunto de datos abiertos chilenos que eliges tú, de una lista de seis fuentes; para practicar, una muestra de matrícula escolar del Maule con el formato de un portal público (datos generados con un script reproducible)
entregable: Un repositorio en GitHub con tus datos y su fuente, el notebook de análisis (.ipynb), los gráficos (.png) y un README que cuente la pregunta, cómo preparaste los datos, lo que encontraste, tus conclusiones y sus limitaciones.
archivos:
  - .ipynb
  - .png
# Rúbrica estándar: qué se espera en cada dimensión. Cada una se puntúa de 1 (Insuficiente) a 3 (Destacado), y se aprueba con 2 o más en las tres.
rubrica:
  claridad: "El README explica la pregunta, los datos con su fuente, cómo se prepararon y lo que se encontró, de modo que lo entiende alguien que no conoce el proyecto."
  ejecucion: "El notebook lee y limpia los datos de forma correcta y repetible, cada decisión de limpieza está documentada y los cálculos responden las preguntas."
  coherencia: "Las conclusiones se apoyan en los resultados y los gráficos, y las limitaciones dicen lo que los datos no permiten afirmar."
misiones:
  - 01-elegir-tus-datos
  - 02-leer-un-archivo-publico
  - 03-revisar-el-analisis-de-la-ia
  - 04-tu-repositorio-y-tus-datos
  - 05-explorar-y-limpiar
  - 06-analizar-y-visualizar
  - 07-conclusiones-y-limitaciones
  - 08-publicar-tu-proyecto
```

- [ ] **Step 3: La base de datos, en dos migraciones**

En `packages/db/src/schema.ts`, en `entregables`, agrega después de `comentario` (deja `criterios` por ahora):
```ts
    // Puntaje de 1 a 3 en cada dimensión de la rúbrica estándar, y el comentario de cada dimensión que lo tenga.
    puntajes: jsonb("puntajes").notNull().$type<Partial<Record<string, number>>>().default({}),
    observaciones: jsonb("observaciones").notNull().$type<Partial<Record<string, string>>>().default({}),
```

Run: `docker compose run --rm -T tools pnpm --filter @syntaxerror/db generate --name rubrica_con_puntaje`

Ahora borra la línea de `criterios` de `entregables`.

Run: `docker compose run --rm -T tools pnpm --filter @syntaxerror/db generate --name quitar_criterios`

Expected: dos archivos, con este contenido exacto.

`packages/db/drizzle/0007_rubrica_con_puntaje.sql`:
```sql
ALTER TABLE "entregables" ADD COLUMN "puntajes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "entregables" ADD COLUMN "observaciones" jsonb DEFAULT '{}'::jsonb NOT NULL;
```

`packages/db/drizzle/0008_quitar_criterios.sql`:
```sql
ALTER TABLE "entregables" DROP COLUMN IF EXISTS "criterios";
```

Si drizzle-kit pregunta "created or renamed", es porque se hizo en un solo paso: vuelve a poner `criterios`, borra lo generado (los `.sql`, sus `meta/*_snapshot.json` y las entradas nuevas de `meta/_journal.json`) y repite los dos pasos.

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/db migrate`
Expected: `[db] migraciones aplicadas`.

- [ ] **Step 4: El email**

En `packages/queue/src/emails.ts`, el tipo de `entregable-observado` queda:
```ts
  // Una observación por dimensión con puntaje insuficiente, más el comentario general si lo hay.
  | (Destinatario & { tipo: "entregable-observado"; caso: string; observaciones: string[]; enlace: string })
```

En `apps/worker/src/emails/mensajes.ts`, los `parrafos` de `entregable-observado` quedan:
```ts
        parrafos: [
          `Revisaron tu entregable del caso ${trabajo.caso} con la rúbrica y te piden algunos cambios:`,
          ...trabajo.observaciones,
          "Haz los ajustes en tu repositorio y vuelve a enviarlo desde la página del caso, sin penalización.",
        ],
```

- [ ] **Step 5: El servidor**

`apps/web/src/lib/entregables/revision.ts` completo:
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
import { evaluarRubrica, observacionesParaLaPersona, type Observaciones, type Puntajes } from "./rubrica";

export type Revisor = { id: string; email: string; rol: Rol };
export type FilaEntregable = { id: string; estudiante: { nombre: string | null; email: string }; caso: { slug: string; titulo: string }; url: string; enviadoEn: Date };
export type ResultadoRevision =
  | { ok: true; decision: "aprobado" | "observado"; certificados: CertificadoEmitido[] }
  | { ok: false; motivo: "no_existe" | "prohibido" | "puntajes_incompletos" | "falta_observacion" };

const describir = (persona: { nombre: string | null; email: string }) => (persona.nombre ? `${persona.nombre} (${persona.email})` : persona.email);

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
  { entregableId, revisor, puntajes, observaciones, comentario }: { entregableId: string; revisor: Revisor; puntajes: Puntajes; observaciones: Observaciones; comentario: string | null },
  { encolar, meta }: { encolar: Encolar; meta: MetaRequest }
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

  // La decisión sale de la rúbrica: quien revisa pone los puntajes y la regla del equipo decide.
  const evaluacion = evaluarRubrica(puntajes, observaciones);
  if (!evaluacion.ok) return { ok: false, motivo: evaluacion.motivo };
  const { decision } = evaluacion;
  const texto = comentario?.trim() || null;

  const revisadas = await db
    .update(entregables)
    .set({ estado: decision, puntajes: evaluacion.puntajes, observaciones: evaluacion.observaciones, comentario: texto, revisadoPor: revisor.id, revisadoEn: new Date() })
    .where(and(eq(entregables.id, entregableId), eq(entregables.estado, "pendiente")))
    .returning({ id: entregables.id });
  if (revisadas.length === 0) return { ok: false, motivo: "no_existe" };

  await insertAuditLogEntry(db, {
    actorId: revisor.id,
    actorEmail: revisor.email,
    action: "deliverable_reviewed",
    targetType: "deliverable",
    targetId: entregableId,
    metadata: { decision, caso: fila.casoSlug, puntajes: evaluacion.puntajes },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  if (decision === "aprobado") {
    const { casoCompleto } = await recalcularCaso(db, fila.alumnoId, fila.casoSlug);
    return { ok: true, decision, certificados: casoCompleto ? await otorgarCertificados(db, fila.alumnoId, fila.casoSlug, encolar) : [] };
  }
  await encolar({
    tipo: "entregable-observado",
    para: fila.email,
    nombre: fila.nombre,
    caso: fila.casoTitulo,
    observaciones: observacionesParaLaPersona(evaluacion.puntajes, evaluacion.observaciones, texto),
    enlace: absoluteUrl(`/casos/${fila.casoSlug}`),
  });
  return { ok: true, decision, certificados: [] };
}
```

`apps/web/src/app/api/revision/entregables/[id]/route.ts` completo:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { encolarSinFallar } from "@/lib/emails";
import { revisarEntregable } from "@/lib/entregables/revision";
import { exigirDocente } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const porDimension = <T extends z.ZodTypeAny>(valor: T) => z.object({ claridad: valor, ejecucion: valor, coherencia: valor }).partial().strict();
const esquema = z.object({
  puntajes: porDimension(z.number().int()),
  observaciones: porDimension(z.string().max(2000)).default({}),
  comentario: z.string().max(2000).nullable(),
});
const ESTADOS = { no_existe: 404, prohibido: 403, puntajes_incompletos: 400, falta_observacion: 400 } as const;

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
    { encolar: encolarSinFallar, meta: metaDeRequest(request) }
  );
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: ESTADOS[resultado.motivo] });
  return NextResponse.json({ decision: resultado.decision, certificados: resultado.certificados });
}
```

En `apps/web/src/lib/progreso/servicio.ts`:

1. Agrega el import, después del de `@/lib/entregables/github`:
```ts
import type { Observaciones, Puntajes } from "@/lib/entregables/rubrica";
```
2. `RevisionEntregable` queda:
```ts
// Lo que la persona ve de la revisión: el estado, el puntaje de cada dimensión, sus comentarios y el comentario general.
export type RevisionEntregable = { estado: "pendiente" | "aprobado" | "observado"; puntajes: Puntajes; observaciones: Observaciones; comentario: string | null };
```
3. En `enviarEntregable`, `datos` queda:
```ts
  // Al reenviar, la revisión anterior se borra: el entregable vuelve a revisarse completo, sin penalización.
  const datos = { url: urlRepositorio(repositorio), estado: "pendiente", verificadoEn: ahora, puntajes: {}, observaciones: {}, comentario: null, revisadoPor: null, revisadoEn: null, actualizadoEn: ahora };
```
4. En `obtenerProgresoCaso`, la consulta del entregable queda:
```ts
    db
      .select({ url: entregables.url, estado: entregables.estado, puntajes: entregables.puntajes, observaciones: entregables.observaciones, comentario: entregables.comentario })
      .from(entregables).where(and(eq(entregables.userId, userId), eq(entregables.casoId, caso.id))),
```
5. En el objeto que devuelve, `revision` queda:
```ts
    revision: entregable
      ? { estado: entregable.estado as RevisionEntregable["estado"], puntajes: entregable.puntajes, observaciones: entregable.observaciones, comentario: entregable.comentario }
      : null,
```

En `apps/web/src/lib/progreso/cliente.ts`:
1. El import de `./servicio` queda `import type { EstadoMision, RevisionEntregable } from "./servicio";`.
2. En `ProgresoVisible`, `revision` queda `revision: RevisionEntregable | null;`.

- [ ] **Step 6: Las pantallas**

`apps/web/src/components/comunidad/formulario-revision.tsx` completo:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIMENSIONES, NIVELES, NOMBRES_DIMENSION, PUNTAJE_PARA_APROBAR, PUNTAJES, type Dimension, type Puntaje, type Rubrica } from "@syntaxerror/content/rubrica";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";
import { LARGO_MINIMO_OBSERVACION } from "@/lib/entregables/rubrica";

const MENSAJES: Record<string, string> = {
  puntajes_incompletos: "Pon un puntaje de 1 a 3 en las tres dimensiones.",
  falta_observacion: `Cada dimensión con 1 (Insuficiente) necesita un comentario de al menos ${LARGO_MINIMO_OBSERVACION} caracteres: es lo que la persona va a corregir.`,
  no_existe: "Este entregable ya fue revisado.",
  prohibido: "No puedes revisar este entregable.",
};

const AREA = "w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-normal leading-6 text-foreground outline-none focus:border-primary";

export function FormularioRevision({ entregableId, rubrica }: { entregableId: string; rubrica: Rubrica }) {
  const router = useRouter();
  const [puntajes, setPuntajes] = useState<Partial<Record<Dimension, Puntaje>>>({});
  const [observaciones, setObservaciones] = useState<Partial<Record<Dimension, string>>>({});
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const completo = DIMENSIONES.every((dimension) => puntajes[dimension] !== undefined);
  const aprueba = completo && DIMENSIONES.every((dimension) => (puntajes[dimension] ?? 0) >= PUNTAJE_PARA_APROBAR);

  async function revisar() {
    setEnviando(true);
    setAviso(null);
    const respuesta = await enviarJson(`/api/revision/entregables/${entregableId}`, "POST", { puntajes, observaciones, comentario: comentario.trim() || null });
    setEnviando(false);
    if (respuesta.ok || respuesta.status === 404) {
      if (!respuesta.ok) setAviso(MENSAJES.no_existe);
      router.refresh();
      return;
    }
    setAviso(MENSAJES[respuesta.error ?? ""] ?? "No se pudo guardar la revisión. Intenta de nuevo.");
  }

  return (
    <div className="grid gap-4" data-entregable-id={entregableId}>
      {DIMENSIONES.map((dimension) => (
        <fieldset key={dimension} className="grid gap-2 rounded-md border border-border p-3">
          <legend className="px-1 text-sm font-bold">{NOMBRES_DIMENSION[dimension]}</legend>
          <p className="text-sm leading-6 text-muted-foreground">{rubrica[dimension]}</p>
          <div className="flex flex-wrap gap-4">
            {PUNTAJES.map((puntaje) => (
              <label key={puntaje} className="flex items-center gap-2 text-sm" title={NIVELES[puntaje].descripcion}>
                <input
                  type="radio"
                  name={`${entregableId}-${dimension}`}
                  value={puntaje}
                  checked={puntajes[dimension] === puntaje}
                  onChange={() => setPuntajes((actuales) => ({ ...actuales, [dimension]: puntaje }))}
                />
                {`${puntaje} · ${NIVELES[puntaje].nombre}`}
              </label>
            ))}
          </div>
          <label className="grid gap-1 text-sm">
            {puntajes[dimension] === 1 ? "Qué debe corregir (obligatorio)" : "Comentario (opcional)"}
            <textarea
              value={observaciones[dimension] ?? ""}
              onChange={(evento) => setObservaciones((actuales) => ({ ...actuales, [dimension]: evento.target.value }))}
              rows={2}
              maxLength={2000}
              className={AREA}
            />
          </label>
        </fieldset>
      ))}
      <label className="grid gap-1 text-sm font-bold">
        Comentario general (opcional)
        <textarea value={comentario} onChange={(evento) => setComentario(evento.target.value)} rows={2} maxLength={2000} className={AREA} />
      </label>
      <p role="status" className="text-sm">
        {!completo
          ? "Pon un puntaje en las tres dimensiones."
          : aprueba
            ? "Resultado: se aprueba (2 o más en las tres dimensiones)."
            : "Resultado: se piden cambios. La persona recibe tus comentarios y puede reenviar sin penalización."}
      </p>
      <div>
        <Button type="button" disabled={enviando || !completo} onClick={() => void revisar()}>Enviar revisión</Button>
      </div>
      {aviso ? <p role="alert" className="text-sm font-bold">{aviso}</p> : null}
    </div>
  );
}
```

`apps/web/src/components/mision/resultado-revision.tsx`:
```tsx
import { DIMENSIONES, NIVELES, NOMBRES_DIMENSION, type Puntaje } from "@syntaxerror/content/rubrica";
import type { RevisionEntregable } from "@/lib/progreso/servicio";

// El puntaje de cada dimensión con su comentario. Un entregable revisado antes de la rúbrica con puntaje no tiene
// puntajes: entonces solo se muestra el comentario general.
export function ResultadoRevision({ revision }: { revision: RevisionEntregable }) {
  const conPuntaje = DIMENSIONES.filter((dimension) => revision.puntajes[dimension] !== undefined);
  return (
    <div className="grid gap-2">
      {conPuntaje.length > 0 ? (
        <dl className="grid gap-2">
          {conPuntaje.map((dimension) => {
            const puntaje = revision.puntajes[dimension] as Puntaje;
            return (
              <div key={dimension} className="grid gap-0.5">
                <dt className="font-bold">{`${NOMBRES_DIMENSION[dimension]}: ${puntaje} · ${NIVELES[puntaje].nombre}`}</dt>
                {revision.observaciones[dimension] ? <dd className="whitespace-pre-wrap">{revision.observaciones[dimension]}</dd> : null}
              </div>
            );
          })}
        </dl>
      ) : null}
      {revision.comentario ? <p className="whitespace-pre-wrap">{`Comentario general: ${revision.comentario}`}</p> : null}
    </div>
  );
}
```

`apps/web/src/components/mision/rubrica-del-caso.tsx`:
```tsx
import { DIMENSIONES, NIVELES, NOMBRES_DIMENSION, PUNTAJE_PARA_APROBAR, PUNTAJES, type Rubrica } from "@syntaxerror/content/rubrica";

// La rúbrica con que se revisa el entregable, a la vista antes de enviarlo: nadie debería enterarse del criterio al
// recibir la nota.
export function RubricaDelCaso({ rubrica }: { rubrica: Rubrica }) {
  return (
    <section aria-labelledby="rubrica-del-caso" className="card grid gap-3 p-5">
      <h2 id="rubrica-del-caso" className="text-xl font-bold">Cómo se revisa tu entregable</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        {`Una persona lo revisa en tres dimensiones, cada una con puntaje de 1 a 3 (${PUNTAJES.map((puntaje) => `${puntaje}: ${NIVELES[puntaje].nombre}`).join(", ")}). Se aprueba con ${PUNTAJE_PARA_APROBAR} o más en las tres. Si una queda en 1, recibes un comentario sobre qué corregir y puedes reenviarlo sin penalización.`}
      </p>
      <dl className="grid gap-3">
        {DIMENSIONES.map((dimension) => (
          <div key={dimension} className="grid gap-0.5">
            <dt className="font-bold">{NOMBRES_DIMENSION[dimension]}</dt>
            <dd className="text-sm leading-6 text-muted-foreground">{rubrica[dimension]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

En `apps/web/src/components/mision/panel-caso.tsx`:

1. Agrega el import, después del de `@/lib/progreso/cliente`:
```tsx
import { ResultadoRevision } from "./resultado-revision";
```
2. Al enviar con éxito, la revisión local queda `revision: { estado: "pendiente", puntajes: {}, observaciones: {}, comentario: null }`.
3. El estado aprobado queda:
```tsx
        ) : revision?.estado === "aprobado" ? (
          <div className="grid gap-3 text-sm leading-6">
            <p>
              Entregable aprobado: <a className="font-bold text-primary hover:underline" href={progreso.entregable ?? "#"} target="_blank" rel="noopener noreferrer">{progreso.entregable}</a>
            </p>
            <ResultadoRevision revision={revision} />
          </div>
```
4. Dentro del aviso de cambios pedidos, el comentario se reemplaza por el resultado:
```tsx
                <p className="font-bold">Tu docente pidió cambios:</p>
                <ResultadoRevision revision={revision} />
                <p>Haz los ajustes en tu repositorio y vuelve a enviarlo, sin penalización.</p>
```

`apps/web/src/app/(misiones)/casos/[caso]/page.tsx` completo:
```tsx
import { notFound } from "next/navigation";
import { tareasDeMision } from "@syntaxerror/content/publicacion";
import { ResenasCaso } from "@/components/comunidad/resenas-caso";
import { DatosDelCaso } from "@/components/mision/datos-del-caso";
import { PanelCaso } from "@/components/mision/panel-caso";
import { RubricaDelCaso } from "@/components/mision/rubrica-del-caso";
import { casosParaPublicar, obtenerCaso, rutasParaPublicar } from "@/lib/contenido";
import { requisitosDelCaso } from "@/lib/progreso/requisitos-contenido";

export const dynamic = "error";
export const dynamicParams = false;
type Parametros = { params: Promise<{ caso: string }> };

export async function generateStaticParams() {
  return (await casosParaPublicar()).map((caso) => ({ caso: caso.slug }));
}

export async function generateMetadata({ params }: Parametros) {
  const caso = await obtenerCaso((await params).caso);
  return { title: caso?.titulo ?? "Caso" };
}

export default async function CasoPage({ params }: Parametros) {
  const caso = await obtenerCaso((await params).caso);
  if (!caso) notFound();
  const requisitos = requisitosDelCaso(await rutasParaPublicar(), await casosParaPublicar(), caso.slug);
  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{`> caso: ${caso.empresa}`}</p>
        <h1 className="text-3xl font-black">{caso.titulo}</h1>
        <p className="leading-7 text-muted-foreground">{`Llegas como ${caso.cargo.toLowerCase()} a ${caso.empresa}. Datos del caso: ${caso.dataset}.`}</p>
      </header>
      <PanelCaso
        caso={caso.slug}
        entregable={caso.entregable}
        requisitos={requisitos}
        misiones={caso.misiones.map((mision) => ({ slug: mision.slug, titulo: mision.titulo, tiempo: mision.tiempo, sinGuia: mision.sinGuia, tareas: tareasDeMision(mision).map((tarea) => tarea.props.id) }))}
      />
      <RubricaDelCaso rubrica={caso.rubrica} />
      <DatosDelCaso caso={caso.slug} datos={caso.datos} />
      <ResenasCaso caso={caso.slug} />
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
        La plataforma ya verificó que cada repositorio es público, tiene README y los archivos del caso. Abre el repositorio y ponle un puntaje de 1 a 3 en cada dimensión de la rúbrica: con 2 o más en las tres se aprueba; con un 1 se piden cambios, y esa dimensión necesita un comentario sobre qué corregir.
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

- [ ] **Step 7: Correr todo**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content validate && pnpm -r --if-present test && for p in @syntaxerror/content @syntaxerror/db @syntaxerror/queue worker web; do pnpm --filter \$p exec tsc --noEmit || exit 1; done"`
Expected:
- `[content] ok: 2 rutas, 7 casos, 51 misiones`;
- PASS en todos los paquetes: content 64, worker 48 y web 330 pruebas;
- sin errores de tipos.

Run: `git grep -n "criterios" -- apps packages e2e/tests/revision.ts`
Expected: solo `cargar.test.ts` ("no una lista de criterios") y las migraciones en `packages/db/drizzle`.

- [ ] **Step 8: Commit**

```bash
git add packages content apps
git commit -m "feat(revision): la rubrica se puntua de 1 a 3 por dimension y la regla del equipo decide

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: e2e, README y propuesta

**Files:**
- Modify: `e2e/tests/revision.ts`, `e2e/tests/progreso.ts`, `e2e/tests/recorrido.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: el formulario y la API de la Task 2.
- Produces:
  - `aprobarEntregable(admin, email)`, que marca "2 · Aceptable" en cada dimensión;
  - `completarCaso`, que aprueba por la API con 2 en las tres.

- [ ] **Step 1: Los helpers**

`e2e/tests/revision.ts` completo:
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
  await expect(tarjeta).toHaveCount(1);
  // Si los puntajes se marcan antes de que la página hidrate, React no los registra y el botón sigue deshabilitado.
  // Se reintenta hasta que el entregable sale de la lista.
  await expect(async () => {
    for (const dimension of await tarjeta.getByRole("group").all()) await dimension.getByLabel("2 · Aceptable").check();
    await tarjeta.getByRole("button", { name: "Enviar revisión" }).click({ timeout: 3_000 });
    await expect(tarjeta).toHaveCount(0, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
}
```

En `e2e/tests/progreso.ts`, el final de `completarCaso`, hasta la llave que cierra la función, queda:
```ts
  // Se aprueba por la API de revisión, con 2 en las tres dimensiones: es más rápido y no depende de que la página
  // hidrate. La revisión con clics en la rúbrica ya la prueban misiones.spec, cuenta.spec y recorrido.spec.
  await admin.goto("/profesor/entregables");
  const tarjeta = admin.locator("li", { hasText: email });
  await expect(tarjeta).toHaveCount(1);
  const entregableId = await tarjeta.locator("[data-entregable-id]").getAttribute("data-entregable-id");
  expect(entregableId, `${caso}: entregable sin id`).not.toBeNull();
  const respuesta = await admin.request.post(`/api/revision/entregables/${entregableId}`, {
    headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
    data: { puntajes: { claridad: 2, ejecucion: 2, coherencia: 2 }, observaciones: {}, comentario: null },
  });
  expect(respuesta.ok(), `${caso}: aprobación de entregable`).toBe(true);
```

- [ ] **Step 2: La observación, de punta a punta**

En `e2e/tests/recorrido.spec.ts`:

1. La prueba se llama "un repositorio sin README no pasa, y con un 1 en la rúbrica la observación vuelve a quien entregó".
2. Después de `await page.goto(CASO);`, agrega:
```ts
  await expect(page.getByRole("heading", { name: "Cómo se revisa tu entregable" })).toBeVisible();
```
3. Desde `const tarjeta = admin.locator(...)` hasta antes del `});` que cierra la prueba queda:
```ts
  const tarjeta = admin.locator("li", { hasText: email });
  // Se reintenta por si los puntajes se marcan antes de que la página hidrate (ver aprobarEntregable).
  await expect(async () => {
    await tarjeta.getByRole("group", { name: "Claridad del README y la explicación" }).getByLabel("3 · Destacado").check();
    await tarjeta.getByRole("group", { name: "Ejecución técnica del análisis" }).getByLabel("2 · Aceptable").check();
    const coherencia = tarjeta.getByRole("group", { name: "Coherencia de las conclusiones" });
    await coherencia.getByLabel("1 · Insuficiente").check();
    await coherencia.getByLabel("Qué debe corregir (obligatorio)").fill("Falta explicar tus conclusiones en el README.");
    await expect(tarjeta.getByText("Resultado: se piden cambios.", { exact: false })).toBeVisible({ timeout: 3_000 });
    await tarjeta.getByRole("button", { name: "Enviar revisión" }).click({ timeout: 3_000 });
    await expect(tarjeta).toHaveCount(0, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });

  await page.reload();
  await expect(page.getByText("Tu docente pidió cambios:")).toBeVisible();
  await expect(page.getByText("Coherencia de las conclusiones: 1 · Insuficiente")).toBeVisible();
  await expect(page.getByText("Falta explicar tus conclusiones en el README.")).toBeVisible();
  await expect(page.getByText("Claridad del README y la explicación: 3 · Destacado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar a revisión" })).toBeVisible();
```

Run: `npm run test:e2e -- tests/recorrido.spec.ts tests/misiones.spec.ts tests/cuenta.spec.ts`
Expected: todas pasan.

- [ ] **Step 3: README**

En `README.md`, en "Entregables", la línea de la revisión se reemplaza por:
```markdown
  - Luego un docente de la clase, o administración, lo revisa en `/profesor/entregables` con la rúbrica estándar (`packages/content/src/rubrica.ts`).
    - Tiene tres dimensiones (claridad, ejecución técnica y coherencia), cada una con puntaje de 1 (Insuficiente) a 3 (Destacado).
    - `rubrica` en `caso.yaml` describe qué se espera en cada dimensión para ese caso, y la página del caso la muestra.
    - La decisión sale de los puntajes (`apps/web/src/lib/entregables/rubrica.ts`): con 2 o más en las tres se aprueba. Con un 1 se piden cambios, esa dimensión necesita un comentario, y la persona corrige y reenvía sin penalización.
```

- [ ] **Step 4: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes (599 pruebas).

Run: `npm run test:e2e`
Expected: `39 passed`. Dos corridas seguidas deben dar lo mismo.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml up -d --force-recreate --wait web && for p in /casos/despachos-rapidos /casos/proyecto-final; do curl -s -o /dev/null localhost:3000$p; curl -s -D - -o /dev/null localhost:3000$p | grep -i x-nextjs-cache; done; docker compose up -d --force-recreate web`
Expected: `x-nextjs-cache: HIT` dos veces. Al final, `web` vuelve a modo desarrollo.

- [ ] **Step 5: Probar como docente y como estudiante**

En local, con el admin de desarrollo:
1. Envía un entregable del Caso 0 y revísalo con un 1 en coherencia y su comentario.
2. Revisa en Mailpit que el email traiga la observación en su párrafo.
3. Reenvíalo y apruébalo con 2 y 3.
4. Revisa que la página del caso muestre los puntajes aprobados.

- [ ] **Step 6: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): revision con puntaje por dimension y observacion que vuelve a la persona

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**La ruta Data Analyst queda completa en contenido y evaluación.** Antes del lanzamiento:
- publicar la ruta (`estado: publicada`);
- configurar `GITHUB_TOKEN` en producción y probar la revisión contra GitHub real;
- recorrer los seis casos como estudiante, y las guías de Power BI, Looker Studio y Colab;
- que el equipo revise la redacción de las seis rúbricas: la propuesta dice que las diseña el equipo interno.

**Fase 5: migración y producción.** Usuarios y datasets de la v1, que se reutilizan pasándolos por el generador; imágenes de producción, despliegue en Railway, Sentry, email real y dominios.

**Más adelante:** la revisión entre pares, cuando una cohorte supere los 50 estudiantes activos en un caso.
