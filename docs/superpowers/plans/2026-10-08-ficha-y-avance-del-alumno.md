# Ficha del alumno y avance enviado: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una ficha de terminal por alumno para el admin. Muestra las trabas, las rutas lección por lección, la actividad y las entregas, y tiene un botón para enviarle su avance por email. Además, una página `/dashboard/avance` donde cada alumno ve lo mismo con un tono amable.

**Architecture:**
- `lib/avance/datos.ts` arma el avance completo de una persona leyendo solo la base, con `avanceDelAlumno`.
- `lib/avance/trabas.ts` calcula las trabas y el siguiente paso con funciones puras.
- `lib/avance/enviar.ts` encola el email `avance` y deja la bitácora `progress_sent`.
- La ficha del admin y la página del alumno usan los mismos componentes de `components/avance/`, con un `modo` que activa los datos internos.

**Tech Stack:** Next 16 (App Router, server components), Drizzle ORM sobre Postgres, BullMQ (cola `emails` y worker), Vitest contra `postgres-test` y Playwright con Mailpit.

**Spec:** `docs/superpowers/specs/2026-10-08-ficha-y-avance-del-alumno-design.md`

**Diferencias con el spec (decididas al planificar):**
1. **Títulos:** salen de `casos.misiones` en la base, que el release sincroniza desde el contenido, y no del contenido compilado. Así `avanceDelAlumno` se prueba sin `CONTENT_DIR`. Una lección guardada que ya no está en `casos.misiones` se omite, como pide el spec.
2. **Siguiente paso:** lo calcula `siguienteDelAvance(avance)` con los mismos datos, en vez de `siguientePaso` de `lib/progreso/continuar`. La regla es la misma: el caso en curso más reciente, su lección en curso o la primera sin aprobar y, si están todas, el entregable. Así no depende de la lista de casos publicados y se prueba sin la base.
3. **La nota en el email:** va como un párrafo que empieza con «Nota del equipo:», porque la plantilla actual del worker solo tiene párrafos. No se agrega un bloque nuevo a la plantilla.

## Global Constraints

- **Umbrales:** `DIAS_INACTIVO = 7` y `FALLIDOS_TRABA = 5`.
- **Envíos:** se permite uno por alumno cada **10 minutos** (`ESPERA_ENVIO_MS = 600_000`). La nota tiene hasta **1000** caracteres (`MAXIMO_NOTA`).
- **Actividad:** `LIMITE_ACTIVIDAD = 20` eventos.
- **Nombres:** la acción de bitácora es `progress_sent`, con la etiqueta "Avance enviado". El tipo de email es `avance` y su asunto, "Tu avance en syntaxError.cl". El enlace del email es `absoluteUrl("/dashboard/avance")`.
- **Qué ve el alumno:** nunca ve el conteo de intentos fallidos, su rol, si es probador ni si confirmó el email.
- **Bitácora:** el envío solo queda registrado si el email se encoló. Si la cola falla, la ruta responde 503 y no escribe nada.
- **Todo se corre en Docker:** `docker compose run --rm tools …`. La web local está en http://localhost:3100, porque el puerto 3000 lo ocupa otro proyecto. La suite e2e se corre con `COMPOSE_FILE` y el override de puerto del scratchpad.
- **Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Estilo:** sigue el del código vecino: comentarios en español, breves y solo donde explican un porqué. Clases de Tailwind como las de `components/admin/*` y `dashboard/page.tsx`.
- **Árbol compartido:** el usuario trabaja en la misma carpeta. No se borran ni revierten archivos ajenos.

## Review Focus

1. **Una persona sin ninguna actividad:** sin rutas, sin progreso y sin entregas. La ficha y `/dashboard/avance` se muestran sin errores, con `0 problemas` y el siguiente paso "Elige una ruta en tu panel". El email también se puede enviar. Lo prueba `datos.test.ts` ("persona nueva") y `trabas.test.ts` ("sin avance").
2. **Una lección guardada que ya no existe en el caso** (se renombró o se borró): se omite y no cuenta para el estado del caso. Lo prueba `datos.test.ts`.
3. **Doble clic en "Enviar avance":** el segundo pedido responde 429 y no llega un segundo email. Lo prueba `route.test.ts`.
4. **Una nota con HTML o con solo espacios:** el HTML se escapa en el email (la plantilla ya escapa los párrafos) y una nota con solo espacios cuenta como si no hubiera nota. Lo prueban `mensajes.test.ts` y `enviar.test.ts`.
5. **La traba de inactividad en el límite:** con exactamente 7 días no aparece y con 8 sí. Lo prueba `trabas.test.ts`.

## Estructura de archivos

```
packages/db/src/audit.ts                                   + "progress_sent"
packages/queue/src/emails.ts                               + tipo "avance"
apps/worker/src/emails/mensajes.ts (+ test)                + case "avance"
apps/web/src/lib/admin/etiquetas.ts                        + etiqueta de progress_sent
apps/web/src/lib/cuenta/enlaces.ts                         + enlaceAvance
apps/web/src/lib/avance/datos.ts (+ test)                  avanceDelAlumno y sus tipos
apps/web/src/lib/avance/trabas.ts (+ test)                 trabasDelAlumno, siguienteDelAvance, haceCuanto
apps/web/src/lib/avance/enviar.ts (+ test)                 enviarAvance, ultimoEnvio, resumenParaEmail
apps/web/src/app/api/admin/usuarios/[id]/avance/route.ts (+ test)
apps/web/src/components/avance/terminal.tsx                SeccionTerminal
apps/web/src/components/avance/git-log-rutas.tsx           GitLogRutas
apps/web/src/components/avance/tail-actividad.tsx          TailActividad
apps/web/src/components/avance/entregas.tsx                ListaEntregas
apps/web/src/components/admin/enviar-avance.tsx            el formulario (cliente)
apps/web/src/app/(dashboard)/admin/usuarios/[id]/page.tsx  la ficha, rehecha
apps/web/src/app/(dashboard)/dashboard/avance/page.tsx     la página del alumno
apps/web/src/app/(dashboard)/dashboard/page.tsx            + enlace "Ver tu avance"
e2e/tests/ficha-alumno.spec.ts
```

---

### Task 1: La acción de bitácora y el email `avance`

**Files:**
- Modify: `packages/db/src/audit.ts` (lista `AUDIT_ACTIONS`)
- Modify: `apps/web/src/lib/admin/etiquetas.ts` (`ETIQUETAS_ACCION`)
- Modify: `packages/queue/src/emails.ts` (unión `TrabajoEmail`)
- Modify: `apps/worker/src/emails/mensajes.ts` (`construirEmail`)
- Test: `apps/worker/src/emails/mensajes.test.ts`

**Interfaces:**
- Produces:
  - `AuditAction` incluye `"progress_sent"`.
  - `TrabajoEmail` incluye `Destinatario & { tipo: "avance"; nota: string | null; rutas: { titulo: string; completos: number; total: number }[]; enCurso: { caso: string; leccion: string | null } | null; pasos: string[]; enlace: string }`.

- [ ] **Step 1: Write the failing test.** En `apps/worker/src/emails/mensajes.test.ts`, agrega esta fila al final del arreglo `casos`, antes de `];`:

```ts
  [
    {
      tipo: "avance",
      para: "ana@correo.cl",
      nombre: "Ana",
      nota: "Vi que te quedaste en BUSCARV: <b>prueba la pista 2</b>.",
      rutas: [{ titulo: "Data Analyst", completos: 3, total: 9 }],
      enCurso: { caso: "Clases de Excel", leccion: "BUSCARV" },
      pasos: ["Llevas varios intentos en BUSCARV: abre las pistas o pregúntale al tutor."],
      enlace,
    },
    "Tu avance en syntaxError.cl",
  ],
```

Agrega también estas pruebas dentro de `describe("construirEmail", …)`:

```ts
  it("el avance trae la nota escapada, cada ruta, dónde va y los pasos", () => {
    const email = construirEmail(casos.find(([trabajo]) => trabajo.tipo === "avance")![0]);
    expect(email.texto).toContain("Nota del equipo: Vi que te quedaste en BUSCARV: <b>prueba la pista 2</b>.");
    expect(email.html).not.toContain("<b>prueba");
    expect(email.texto).toContain("Data Analyst: 3 de 9 casos");
    expect(email.texto).toContain("Vas en BUSCARV, de Clases de Excel.");
    expect(email.texto).toContain("Llevas varios intentos en BUSCARV");
  });

  it("el avance sin nota ni ruta en curso no deja párrafos vacíos", () => {
    const email = construirEmail({ tipo: "avance", para: "a@b.cl", nombre: null, nota: null, rutas: [], enCurso: null, pasos: ["Elige una ruta en tu panel y empieza el primer caso."], enlace });
    expect(email.texto).not.toContain("Nota del equipo");
    expect(email.texto).not.toContain("Vas en");
    expect(email.texto).toContain("Elige una ruta en tu panel");
  });
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `docker compose run --rm tools pnpm --filter worker exec vitest run src/emails/mensajes.test.ts`
Expected: FAIL. TypeScript o Vitest reclaman el tipo `"avance"` desconocido, o `construirEmail` devuelve `undefined`.

- [ ] **Step 3: Add the type and the audit action.** En `packages/queue/src/emails.ts`, agrega el tipo después de la línea de `"mensaje-nuevo"`. Mueve el `;` final a la línea nueva:

```ts
  | (Destinatario & { tipo: "mensaje-nuevo"; asunto: string; enlace: string })
  // El avance que un admin le envía a un alumno: su nota (si escribió una), cada ruta, dónde va y qué sigue.
  | (Destinatario & {
      tipo: "avance";
      nota: string | null;
      rutas: { titulo: string; completos: number; total: number }[];
      enCurso: { caso: string; leccion: string | null } | null;
      pasos: string[];
      enlace: string;
    });
```

En `packages/db/src/audit.ts`, agrega `"progress_sent",` después de `"ruta_estado_cambiado",`. En `apps/web/src/lib/admin/etiquetas.ts`, agrega `progress_sent: "Avance enviado",` después de `ruta_estado_cambiado: …`.

- [ ] **Step 4: Write the email.** En `apps/worker/src/emails/mensajes.ts`, agrega este caso dentro del `switch`, después de `case "mensaje-nuevo"`:

```ts
    case "avance":
      return plantillaSyntaxError({
        asunto: "Tu avance en syntaxError.cl",
        estado: { etiqueta: "INFO", mensaje: "Resumen de tu avance" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          ...(trabajo.nota ? [`Nota del equipo: ${trabajo.nota}`] : []),
          ...trabajo.rutas.map((ruta) => `${ruta.titulo}: ${ruta.completos} de ${ruta.total} casos`),
          ...(trabajo.enCurso ? [trabajo.enCurso.leccion ? `Vas en ${trabajo.enCurso.leccion}, de ${trabajo.enCurso.caso}.` : `Vas en ${trabajo.enCurso.caso}.`] : []),
          ...trabajo.pasos,
        ],
        enlace: { texto: "Ver tu avance", url: trabajo.enlace },
        comandoCierre: "git status",
      });
```

- [ ] **Step 5: Run the tests to verify they pass.**

Run: `docker compose run --rm tools sh -c "pnpm --filter worker exec vitest run src/emails && pnpm --filter web exec tsc --noEmit && pnpm --filter worker exec tsc --noEmit"`
Expected: todas las pruebas de `src/emails` pasan y los dos `tsc` terminan sin errores. `ETIQUETAS_ACCION` es `Record<AuditAction, string>`: si falta la etiqueta, `tsc` de web falla.

- [ ] **Step 6: Commit.**

```bash
git add packages/db/src/audit.ts packages/queue/src/emails.ts apps/worker/src/emails/mensajes.ts apps/worker/src/emails/mensajes.test.ts apps/web/src/lib/admin/etiquetas.ts
git commit -m "feat(emails): el email de avance y la accion progress_sent de la bitacora

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `avanceDelAlumno`

**Files:**
- Create: `apps/web/src/lib/avance/datos.ts`
- Test: `apps/web/src/lib/avance/datos.test.ts`

**Interfaces:**
- Consumes: `obtenerNivel(db, userId): Promise<Nivel>` (`@/lib/puntos/servicio`), `esRol` y `Rol` (`@/lib/roles`), y `unidad(tipo)` (`@/lib/unidad`).
- Produces: los tipos y la función de abajo, que usan las tareas 3 a 6.

- [ ] **Step 1: Write the failing test.** Crea `apps/web/src/lib/avance/datos.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casoInscripciones, casos, entregables, misionProgreso, preguntasProfesor, rutaCasos, rutaInscripciones, rutas, transaccionesPuntos, tutorPreguntas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { avanceDelAlumno, LIMITE_ACTIVIDAD } from "./datos";

const { db, close } = createTestDb();

async function persona(email = "ana@correo.cl") {
  const [fila] = await db.insert(users).values({ email, name: "Ana", role: "student" }).returning({ id: users.id });
  return fila.id;
}

async function caso(slug: string, tipo: "caso" | "clases", misiones: string[]) {
  const [fila] = await db
    .insert(casos)
    .values({ slug, tipo, titulo: `Título ${slug}`, cargo: "Analista", empresa: "Empresa", entregable: "README", misiones: misiones.map((mision) => ({ slug: mision, titulo: `Lección ${mision}`, tareas: ["t"] })) })
    .returning({ id: casos.id });
  return fila.id;
}

async function ruta(slug: string, casoIds: string[]) {
  const [fila] = await db.insert(rutas).values({ slug, titulo: `Ruta ${slug}`, cargo: "Analista", descripcion: "d", estado: "publicada" }).returning({ id: rutas.id });
  await db.insert(rutaCasos).values(casoIds.map((casoId, orden) => ({ rutaId: fila.id, casoId, orden })));
  return fila.id;
}

const dia = (n: number) => new Date(Date.UTC(2026, 9, n, 12));

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("avanceDelAlumno", () => {
  it("una persona que no existe es null", async () => {
    expect(await avanceDelAlumno(db, "0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11")).toBeNull();
  });

  it("persona nueva: sin rutas, sin casos, sin actividad", async () => {
    const id = await persona();
    const avance = await avanceDelAlumno(db, id);
    expect(avance).toMatchObject({ ultimaActividad: null, rutas: [], otrosCasos: [], entregas: [], preguntasPendientes: [], actividad: [] });
    expect(avance?.perfil).toMatchObject({ email: "ana@correo.cl", nombre: "Ana", rol: "student", probador: false, verificado: false });
  });

  it("arma cada ruta con sus casos en orden y cada caso con sus lecciones y estados", async () => {
    const id = await persona();
    const excel = await caso("excel", "clases", ["01", "02", "03"]);
    const ventas = await caso("ventas", "caso", ["m1"]);
    const rutaId = await ruta("data", [excel, ventas]);
    await db.insert(rutaInscripciones).values({ userId: id, rutaId });
    await db.insert(casoInscripciones).values({ userId: id, casoId: excel });
    await db.insert(misionProgreso).values([
      { userId: id, casoId: excel, mision: "01", estado: "aprobada", intentos: 2, fallidos: 1, aprobadaEn: dia(1), actualizadoEn: dia(1) },
      { userId: id, casoId: excel, mision: "02", estado: "en_curso", intentos: 6, fallidos: 6, actualizadoEn: dia(3) },
      // Una lección que ya no está en el caso: se omite.
      { userId: id, casoId: excel, mision: "99-borrada", estado: "en_curso", intentos: 1, fallidos: 1, actualizadoEn: dia(2) },
    ]);
    const avance = (await avanceDelAlumno(db, id))!;
    expect(avance.ultimaActividad).toEqual(dia(3));
    expect(avance.rutas).toHaveLength(1);
    const [data] = avance.rutas;
    expect(data).toMatchObject({ slug: "data", titulo: "Ruta data", completos: 0 });
    expect(data.casos.map((fila) => [fila.slug, fila.estado, fila.aprobadas, fila.total])).toEqual([
      ["excel", "en_curso", 1, 3],
      ["ventas", "pendiente", 0, 1],
    ]);
    expect(data.casos[0].lecciones.map((leccion) => [leccion.slug, leccion.estado, leccion.fallidos])).toEqual([
      ["01", "aprobada", 1],
      ["02", "en_curso", 6],
      ["03", "sin_empezar", 0],
    ]);
    expect(data.casos[0].lecciones[1].href).toBe("/casos/excel/02");
    expect(avance.otrosCasos).toEqual([]);
  });

  it("un caso completo cuenta en la ruta y un caso fuera de sus rutas va en otrosCasos", async () => {
    const id = await persona();
    const excel = await caso("excel", "clases", ["01"]);
    const suelto = await caso("suelto", "caso", ["m1"]);
    const rutaId = await ruta("data", [excel]);
    await db.insert(rutaInscripciones).values({ userId: id, rutaId });
    await db.insert(casoInscripciones).values([{ userId: id, casoId: excel, completadoEn: dia(2) }, { userId: id, casoId: suelto }]);
    await db.insert(misionProgreso).values([
      { userId: id, casoId: excel, mision: "01", estado: "aprobada", intentos: 1, aprobadaEn: dia(2), actualizadoEn: dia(2) },
      { userId: id, casoId: suelto, mision: "m1", estado: "en_curso", intentos: 1, fallidos: 1, actualizadoEn: dia(4) },
    ]);
    const avance = (await avanceDelAlumno(db, id))!;
    expect(avance.rutas[0]).toMatchObject({ completos: 1 });
    expect(avance.rutas[0].casos[0].estado).toBe("completo");
    expect(avance.otrosCasos.map((fila) => [fila.slug, fila.estado])).toEqual([["suelto", "en_curso"]]);
  });

  it("la ruta elegida en la bienvenida aparece aunque no tenga inscripción", async () => {
    const id = await persona();
    const excel = await caso("excel", "clases", ["01"]);
    const rutaId = await ruta("data", [excel]);
    await db.update(users).set({ rutaElegida: rutaId });
    expect((await avanceDelAlumno(db, id))!.rutas.map((fila) => fila.slug)).toEqual(["data"]);
  });

  it("trae las entregas, las preguntas pendientes y la actividad ordenada y limitada", async () => {
    const id = await persona();
    const ventas = await caso("ventas", "caso", ["m1"]);
    await db.insert(casoInscripciones).values({ userId: id, casoId: ventas });
    await db.insert(misionProgreso).values({ userId: id, casoId: ventas, mision: "m1", estado: "aprobada", intentos: 1, aprobadaEn: dia(1), actualizadoEn: dia(1) });
    await db.insert(entregables).values({ userId: id, casoId: ventas, url: "https://github.com/ana/ventas", estado: "observado", puntajes: { claridad: 1 }, observaciones: { claridad: "Falta el README." }, comentario: "Casi", creadoEn: dia(2), revisadoEn: dia(3) });
    await db.insert(preguntasProfesor).values([
      { alumnoId: id, casoId: ventas, mision: "m1", texto: "¿Cómo?", estado: "pendiente", creadaEn: dia(4) },
      { alumnoId: id, casoId: ventas, mision: "m1", texto: "¿Y esto?", estado: "respondida", respuesta: "Así.", creadaEn: dia(1) },
    ]);
    await db.insert(tutorPreguntas).values(Array.from({ length: 25 }, (_, indice) => ({ userId: id, casoId: ventas, mision: "m1", pregunta: `p${indice}`, estado: "respondida", creadoEn: dia(5 + indice) })));
    await db.insert(transaccionesPuntos).values({ userId: id, casoId: ventas, clave: "caso", motivo: "Caso completo", cantidad: 50, creadoEn: dia(3) });
    const avance = (await avanceDelAlumno(db, id))!;
    expect(avance.entregas).toEqual([
      expect.objectContaining({ caso: { slug: "ventas", titulo: "Título ventas" }, estado: "observado", puntajes: { claridad: 1 }, observaciones: { claridad: "Falta el README." }, comentario: "Casi", revisadaEn: dia(3) }),
    ]);
    expect(avance.preguntasPendientes.map((pregunta) => pregunta.mision)).toEqual(["m1"]);
    expect(avance.actividad).toHaveLength(LIMITE_ACTIVIDAD);
    expect(avance.actividad[0]).toMatchObject({ tipo: "tutor", fecha: dia(29) });
    const fechas = avance.actividad.map((evento) => evento.fecha.getTime());
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
  });

  it("la actividad nombra la unidad: lección en clases y misión en casos", async () => {
    const id = await persona();
    const excel = await caso("excel", "clases", ["01"]);
    const ventas = await caso("ventas", "caso", ["m1"]);
    await db.insert(misionProgreso).values([
      { userId: id, casoId: excel, mision: "01", estado: "aprobada", intentos: 1, aprobadaEn: dia(1), actualizadoEn: dia(1) },
      { userId: id, casoId: ventas, mision: "m1", estado: "aprobada", intentos: 1, aprobadaEn: dia(2), actualizadoEn: dia(2) },
    ]);
    const textos = (await avanceDelAlumno(db, id))!.actividad.map((evento) => evento.texto);
    expect(textos).toEqual(["Misión aprobada: Lección m1 · Título ventas", "Lección aprobada: Lección 01 · Título excel"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/avance/datos.test.ts`
Expected: FAIL con "Cannot find module './datos'".

- [ ] **Step 3: Write the implementation.** Crea `apps/web/src/lib/avance/datos.ts`:

```ts
import { desc, eq, inArray } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { casoInscripciones, casos, entregables, misionProgreso, preguntasProfesor, rutaCasos, rutaInscripciones, rutas, transaccionesPuntos, tutorPreguntas, users } from "@syntaxerror/db/schema";
import type { Nivel } from "@/lib/puntos/niveles";
import { obtenerNivel } from "@/lib/puntos/servicio";
import { esRol, type Rol } from "@/lib/roles";
import { unidad } from "@/lib/unidad";

export const LIMITE_ACTIVIDAD = 20;

export type EstadoLeccion = "aprobada" | "en_curso" | "sin_empezar";
export type EstadoCasoAvance = "completo" | "en_curso" | "pendiente";
export type LeccionAvance = { slug: string; titulo: string; estado: EstadoLeccion; intentos: number; fallidos: number; actualizadoEn: Date | null; href: string };
export type CasoAvance = { slug: string; titulo: string; tipo: "caso" | "clases"; estado: EstadoCasoAvance; aprobadas: number; total: number; lecciones: LeccionAvance[]; href: string };
export type RutaAvance = { slug: string; titulo: string; completos: number; casos: CasoAvance[] };
export type CasoCorto = { slug: string; titulo: string };
export type EntregaAvance = {
  caso: CasoCorto;
  estado: "pendiente" | "aprobado" | "observado";
  url: string;
  puntajes: Partial<Record<string, number>>;
  observaciones: Partial<Record<string, string>>;
  comentario: string | null;
  enviadaEn: Date;
  revisadaEn: Date | null;
};
export type PreguntaPendiente = { id: string; caso: CasoCorto; mision: string; creadaEn: Date };
export type TipoEvento = "leccion" | "entrega" | "tutor" | "docente" | "puntos";
export type EventoAvance = { fecha: Date; tipo: TipoEvento; texto: string; href: string | null };
export type PerfilAvance = { id: string; nombre: string | null; email: string; rol: Rol; probador: boolean; verificado: boolean; registradoEn: Date; nivel: Nivel };
export type AvanceAlumno = {
  perfil: PerfilAvance;
  ultimaActividad: Date | null;
  rutas: RutaAvance[];
  // Casos empezados que no están en ninguna de sus rutas.
  otrosCasos: CasoAvance[];
  entregas: EntregaAvance[];
  preguntasPendientes: PreguntaPendiente[];
  actividad: EventoAvance[];
};

const ESTADOS_ENTREGA = new Set(["pendiente", "aprobado", "observado"]);

// Todo el avance de una persona, para su ficha en administración, su página de avance y el email. Solo lee.
export async function avanceDelAlumno(db: AppDb, userId: string): Promise<AvanceAlumno | null> {
  const [persona] = await db
    .select({ id: users.id, nombre: users.name, email: users.email, rol: users.role, probador: users.probador, verificadoEn: users.emailVerified, registradoEn: users.createdAt, rutaElegida: users.rutaElegida })
    .from(users)
    .where(eq(users.id, userId));
  if (!persona) return null;

  const [progreso, inscripcionesCaso, inscripcionesRuta, filasEntregas, preguntas, tutor, puntos, nivel] = await Promise.all([
    db
      .select({ casoId: misionProgreso.casoId, mision: misionProgreso.mision, estado: misionProgreso.estado, intentos: misionProgreso.intentos, fallidos: misionProgreso.fallidos, aprobadaEn: misionProgreso.aprobadaEn, actualizadoEn: misionProgreso.actualizadoEn })
      .from(misionProgreso)
      .where(eq(misionProgreso.userId, userId)),
    db.select({ casoId: casoInscripciones.casoId, completadoEn: casoInscripciones.completadoEn }).from(casoInscripciones).where(eq(casoInscripciones.userId, userId)),
    db.select({ rutaId: rutaInscripciones.rutaId }).from(rutaInscripciones).where(eq(rutaInscripciones.userId, userId)),
    db
      .select({ casoId: entregables.casoId, estado: entregables.estado, url: entregables.url, puntajes: entregables.puntajes, observaciones: entregables.observaciones, comentario: entregables.comentario, creadoEn: entregables.creadoEn, revisadoEn: entregables.revisadoEn })
      .from(entregables)
      .where(eq(entregables.userId, userId))
      .orderBy(desc(entregables.creadoEn)),
    db.select({ id: preguntasProfesor.id, casoId: preguntasProfesor.casoId, mision: preguntasProfesor.mision, estado: preguntasProfesor.estado, creadaEn: preguntasProfesor.creadaEn }).from(preguntasProfesor).where(eq(preguntasProfesor.alumnoId, userId)),
    db.select({ casoId: tutorPreguntas.casoId, mision: tutorPreguntas.mision, creadoEn: tutorPreguntas.creadoEn }).from(tutorPreguntas).where(eq(tutorPreguntas.userId, userId)).orderBy(desc(tutorPreguntas.creadoEn)).limit(LIMITE_ACTIVIDAD),
    db.select({ casoId: transaccionesPuntos.casoId, motivo: transaccionesPuntos.motivo, cantidad: transaccionesPuntos.cantidad, creadoEn: transaccionesPuntos.creadoEn }).from(transaccionesPuntos).where(eq(transaccionesPuntos.userId, userId)).orderBy(desc(transaccionesPuntos.creadoEn)).limit(LIMITE_ACTIVIDAD),
    obtenerNivel(db, userId),
  ]);

  const rutaIds = [...new Set([...inscripcionesRuta.map((fila) => fila.rutaId), ...(persona.rutaElegida ? [persona.rutaElegida] : [])])];
  const [filasRutas, enlaces] = rutaIds.length
    ? await Promise.all([
        db.select({ id: rutas.id, slug: rutas.slug, titulo: rutas.titulo }).from(rutas).where(inArray(rutas.id, rutaIds)),
        db.select({ rutaId: rutaCasos.rutaId, casoId: rutaCasos.casoId }).from(rutaCasos).where(inArray(rutaCasos.rutaId, rutaIds)).orderBy(rutaCasos.orden),
      ])
    : [[], []];

  const casoIds = new Set([
    ...enlaces.map((fila) => fila.casoId),
    ...progreso.map((fila) => fila.casoId),
    ...inscripcionesCaso.map((fila) => fila.casoId),
    ...filasEntregas.map((fila) => fila.casoId),
    ...preguntas.map((fila) => fila.casoId),
    ...tutor.map((fila) => fila.casoId),
    ...puntos.map((fila) => fila.casoId),
  ]);
  const filasCasos = casoIds.size ? await db.select({ id: casos.id, slug: casos.slug, titulo: casos.titulo, tipo: casos.tipo, misiones: casos.misiones }).from(casos).where(inArray(casos.id, [...casoIds])) : [];
  const casoPorId = new Map(filasCasos.map((fila) => [fila.id, fila]));
  const completados = new Set(inscripcionesCaso.filter((fila) => fila.completadoEn !== null).map((fila) => fila.casoId));
  const corto = (casoId: string): CasoCorto => ({ slug: casoPorId.get(casoId)?.slug ?? "", titulo: casoPorId.get(casoId)?.titulo ?? "" });
  const tituloMision = (casoId: string, mision: string) => casoPorId.get(casoId)?.misiones.find((fila) => fila.slug === mision)?.titulo ?? mision;

  function armarCaso(casoId: string): CasoAvance | null {
    const caso = casoPorId.get(casoId);
    if (!caso) return null;
    const propias = new Map(progreso.filter((fila) => fila.casoId === casoId).map((fila) => [fila.mision, fila]));
    // Solo cuentan las lecciones que siguen en el caso: una guardada que se renombró o borró se omite.
    const lecciones: LeccionAvance[] = caso.misiones.map((mision) => {
      const fila = propias.get(mision.slug);
      return {
        slug: mision.slug,
        titulo: mision.titulo,
        estado: !fila ? "sin_empezar" : fila.estado === "aprobada" ? "aprobada" : "en_curso",
        intentos: fila?.intentos ?? 0,
        fallidos: fila?.fallidos ?? 0,
        actualizadoEn: fila?.actualizadoEn ?? null,
        href: `/casos/${caso.slug}/${mision.slug}`,
      };
    });
    const empezado = lecciones.some((leccion) => leccion.estado !== "sin_empezar");
    return {
      slug: caso.slug,
      titulo: caso.titulo,
      tipo: caso.tipo === "clases" ? "clases" : "caso",
      estado: completados.has(casoId) ? "completo" : empezado ? "en_curso" : "pendiente",
      aprobadas: lecciones.filter((leccion) => leccion.estado === "aprobada").length,
      total: lecciones.length,
      lecciones,
      href: `/casos/${caso.slug}`,
    };
  }

  const listaRutas: RutaAvance[] = filasRutas
    .map((ruta) => {
      const casosDeRuta = enlaces.filter((fila) => fila.rutaId === ruta.id).flatMap((fila) => armarCaso(fila.casoId) ?? []);
      return { slug: ruta.slug, titulo: ruta.titulo, completos: casosDeRuta.filter((fila) => fila.estado === "completo").length, casos: casosDeRuta };
    })
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
  const enRutas = new Set(enlaces.map((fila) => fila.casoId));
  const empezados = new Set([...progreso.map((fila) => fila.casoId), ...inscripcionesCaso.map((fila) => fila.casoId)]);
  const otrosCasos = [...empezados].filter((casoId) => !enRutas.has(casoId)).flatMap((casoId) => armarCaso(casoId) ?? []).sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));

  const actividad: EventoAvance[] = [
    ...progreso.flatMap((fila) => {
      const caso = casoPorId.get(fila.casoId);
      if (!fila.aprobadaEn || !caso || !caso.misiones.some((mision) => mision.slug === fila.mision)) return [];
      const nombre = unidad(caso.tipo === "clases" ? "clases" : "caso").Nombre;
      return [{ fecha: fila.aprobadaEn, tipo: "leccion" as const, texto: `${nombre} aprobada: ${tituloMision(fila.casoId, fila.mision)} · ${caso.titulo}`, href: `/casos/${caso.slug}/${fila.mision}` }];
    }),
    ...filasEntregas.flatMap((fila) => [
      { fecha: fila.creadoEn, tipo: "entrega" as const, texto: `Entrega enviada · ${corto(fila.casoId).titulo}`, href: `/casos/${corto(fila.casoId).slug}` },
      ...(fila.revisadoEn && fila.estado !== "pendiente")
        ? [{ fecha: fila.revisadoEn, tipo: "entrega" as const, texto: `Entrega ${fila.estado === "aprobado" ? "aprobada" : "observada"} · ${corto(fila.casoId).titulo}`, href: `/casos/${corto(fila.casoId).slug}` }]
        : [],
    ]),
    ...tutor.map((fila) => ({ fecha: fila.creadoEn, tipo: "tutor" as const, texto: `Pregunta al tutor · ${tituloMision(fila.casoId, fila.mision)} · ${corto(fila.casoId).titulo}`, href: `/casos/${corto(fila.casoId).slug}/${fila.mision}` })),
    ...preguntas.map((fila) => ({ fecha: fila.creadaEn, tipo: "docente" as const, texto: `Pregunta a un docente · ${tituloMision(fila.casoId, fila.mision)} · ${corto(fila.casoId).titulo}`, href: `/casos/${corto(fila.casoId).slug}/${fila.mision}` })),
    ...puntos.map((fila) => ({ fecha: fila.creadoEn, tipo: "puntos" as const, texto: `+${fila.cantidad} puntos · ${fila.motivo}`, href: null })),
  ]
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    .slice(0, LIMITE_ACTIVIDAD);

  const fechas = progreso.map((fila) => fila.actualizadoEn.getTime());
  return {
    perfil: {
      id: persona.id,
      nombre: persona.nombre,
      email: persona.email,
      rol: esRol(persona.rol) ? persona.rol : "student",
      probador: persona.probador,
      verificado: persona.verificadoEn !== null,
      registradoEn: persona.registradoEn,
      nivel,
    },
    ultimaActividad: fechas.length ? new Date(Math.max(...fechas)) : null,
    rutas: listaRutas,
    otrosCasos,
    entregas: filasEntregas.map((fila) => ({
      caso: corto(fila.casoId),
      estado: ESTADOS_ENTREGA.has(fila.estado) ? (fila.estado as EntregaAvance["estado"]) : "pendiente",
      url: fila.url,
      puntajes: fila.puntajes,
      observaciones: fila.observaciones,
      comentario: fila.comentario,
      enviadaEn: fila.creadoEn,
      revisadaEn: fila.revisadoEn,
    })),
    preguntasPendientes: preguntas.filter((fila) => fila.estado === "pendiente").map((fila) => ({ id: fila.id, caso: corto(fila.casoId), mision: fila.mision, creadaEn: fila.creadaEn })),
    actividad,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec vitest run src/lib/avance/datos.test.ts && cd apps/web && npx tsc --noEmit"`
Expected: las 7 pruebas pasan y `tsc` termina sin errores. Si `truncateAll` no limpia `rutas` o `ruta_casos`, revisa `packages/db/src/testing.ts`: trunca todas las tablas del esquema.

- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/lib/avance/datos.ts apps/web/src/lib/avance/datos.test.ts
git commit -m "feat(avance): el avance completo de una persona, leccion por leccion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Trabas, siguiente paso y fechas relativas

**Files:**
- Create: `apps/web/src/lib/avance/trabas.ts`
- Test: `apps/web/src/lib/avance/trabas.test.ts`

**Interfaces:**
- Consumes: los tipos `AvanceAlumno`, `CasoAvance` y `LeccionAvance` de la Task 2.
- Produces:
  - `DIAS_INACTIVO = 7` y `FALLIDOS_TRABA = 5`;
  - `type Traba = { tipo: "inactivo" | "leccion" | "entrega" | "pregunta"; admin: string; alumno: string; href: string }`;
  - `trabasDelAlumno(avance: AvanceAlumno, ahora: Date): Traba[]`;
  - `type Siguiente = { texto: string; href: string }`;
  - `siguienteDelAvance(avance: AvanceAlumno): Siguiente`;
  - `casoEnCurso(avance: AvanceAlumno): { caso: CasoAvance; leccion: LeccionAvance | null } | null`;
  - `haceCuanto(fecha: Date, ahora: Date): string`.

- [ ] **Step 1: Write the failing test.** Crea `apps/web/src/lib/avance/trabas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { AvanceAlumno, CasoAvance, LeccionAvance } from "./datos";
import { casoEnCurso, DIAS_INACTIVO, FALLIDOS_TRABA, haceCuanto, siguienteDelAvance, trabasDelAlumno } from "./trabas";

const AHORA = new Date(Date.UTC(2026, 9, 20, 12));
const haceDias = (n: number) => new Date(AHORA.getTime() - n * 86_400_000);

function leccion(slug: string, estado: LeccionAvance["estado"], fallidos = 0, actualizadoEn: Date | null = null): LeccionAvance {
  return { slug, titulo: `Lección ${slug}`, estado, intentos: fallidos, fallidos, actualizadoEn, href: `/casos/excel/${slug}` };
}

function caso(lecciones: LeccionAvance[], estado: CasoAvance["estado"] = "en_curso", tipo: CasoAvance["tipo"] = "clases", slug = "excel"): CasoAvance {
  return { slug, titulo: `Caso ${slug}`, tipo, estado, aprobadas: lecciones.filter((fila) => fila.estado === "aprobada").length, total: lecciones.length, lecciones, href: `/casos/${slug}` };
}

function avance(parcial: Partial<AvanceAlumno> = {}): AvanceAlumno {
  return {
    perfil: { id: "u", nombre: "Ana", email: "ana@correo.cl", rol: "student", probador: false, verificado: true, registradoEn: haceDias(30), nivel: { puntos: 0, nivel: 1, faltan: 100 } },
    ultimaActividad: null,
    rutas: [],
    otrosCasos: [],
    entregas: [],
    preguntasPendientes: [],
    actividad: [],
    ...parcial,
  };
}

describe("trabasDelAlumno", () => {
  it("sin avance no hay trabas", () => {
    expect(trabasDelAlumno(avance(), AHORA)).toEqual([]);
  });

  it(`inactivo: con ${DIAS_INACTIVO} días no aparece y con uno más sí, y sugiere retomar la lección en curso`, () => {
    const enCurso = caso([leccion("01", "aprobada"), leccion("02", "en_curso", 1, haceDias(8))]);
    const rutas = [{ slug: "data", titulo: "Data", completos: 0, casos: [enCurso] }];
    expect(trabasDelAlumno(avance({ rutas, ultimaActividad: haceDias(DIAS_INACTIVO) }), AHORA)).toEqual([]);
    expect(trabasDelAlumno(avance({ rutas, ultimaActividad: haceDias(DIAS_INACTIVO + 1) }), AHORA)).toEqual([
      { tipo: "inactivo", admin: "sin actividad hace 8 días · Caso excel", alumno: "Hace 8 días que no avanzas en Caso excel. Retoma en Lección 02.", href: "/casos/excel/02" },
    ]);
  });

  it("inactivo no aplica si no tiene casos en curso", () => {
    const completo = caso([leccion("01", "aprobada")], "completo");
    expect(trabasDelAlumno(avance({ otrosCasos: [completo], ultimaActividad: haceDias(40) }), AHORA)).toEqual([]);
  });

  it(`lección: ${FALLIDOS_TRABA} fallidos sin aprobar es traba; ${FALLIDOS_TRABA - 1} no, y una aprobada tampoco`, () => {
    const otros = [caso([leccion("01", "en_curso", FALLIDOS_TRABA - 1), leccion("02", "en_curso", FALLIDOS_TRABA), leccion("03", "aprobada", 9)])];
    expect(trabasDelAlumno(avance({ otrosCasos: otros, ultimaActividad: AHORA }), AHORA)).toEqual([
      { tipo: "leccion", admin: "5 intentos fallidos · Caso excel / Lección 02", alumno: "Llevas varios intentos en Lección 02: abre las pistas o pregúntale al tutor.", href: "/casos/excel/02" },
    ]);
  });

  it("un caso que está en dos rutas no repite sus trabas", () => {
    const repetido = caso([leccion("01", "en_curso", 6)]);
    const rutas = [{ slug: "a", titulo: "A", completos: 0, casos: [repetido] }, { slug: "b", titulo: "B", completos: 0, casos: [repetido] }];
    expect(trabasDelAlumno(avance({ rutas, ultimaActividad: AHORA }), AHORA)).toHaveLength(1);
  });

  it("entrega observada y pregunta pendiente", () => {
    const entregas = [{ caso: { slug: "ventas", titulo: "Ventas" }, estado: "observado" as const, url: "u", puntajes: {}, observaciones: {}, comentario: null, enviadaEn: haceDias(3), revisadaEn: haceDias(2) }];
    const preguntasPendientes = [{ id: "p", caso: { slug: "ventas", titulo: "Ventas" }, mision: "m1", creadaEn: haceDias(1) }];
    expect(trabasDelAlumno(avance({ entregas, preguntasPendientes }), AHORA)).toEqual([
      { tipo: "entrega", admin: "entrega observada · Ventas", alumno: "Tu entrega de Ventas tiene observaciones: revísalas y vuelve a enviarla.", href: "/casos/ventas" },
      { tipo: "pregunta", admin: "pregunta sin responder hace 1 día · Ventas", alumno: "Tu pregunta en Ventas todavía espera respuesta: te avisaremos por email.", href: "/casos/ventas/m1" },
    ]);
  });
});

describe("siguienteDelAvance y casoEnCurso", () => {
  it("sin casos en curso, sugiere elegir una ruta", () => {
    expect(siguienteDelAvance(avance())).toEqual({ texto: "Elige una ruta en tu panel y empieza el primer caso.", href: "/dashboard" });
    expect(casoEnCurso(avance())).toBeNull();
  });

  it("el caso en curso más reciente y su lección en curso o la primera sin aprobar", () => {
    const viejo = caso([leccion("01", "en_curso", 0, haceDias(9))], "en_curso", "clases", "viejo");
    const nuevo = caso([leccion("01", "aprobada", 0, haceDias(1)), leccion("02", "sin_empezar")], "en_curso", "clases", "nuevo");
    const datos = avance({ otrosCasos: [viejo, nuevo] });
    expect(casoEnCurso(datos)?.caso.slug).toBe("nuevo");
    expect(siguienteDelAvance(datos)).toEqual({ texto: "Sigue con Lección 02, de Caso nuevo.", href: "/casos/excel/02" });
  });

  it("un caso con todas las misiones aprobadas y sin completar pide el entregable", () => {
    const listo = caso([leccion("m1", "aprobada", 0, haceDias(1))], "en_curso", "caso", "ventas");
    expect(siguienteDelAvance(avance({ otrosCasos: [listo] }))).toEqual({ texto: "Te falta enlazar tu entregable de Caso ventas para completarlo.", href: "/casos/ventas" });
  });
});

describe("haceCuanto", () => {
  it("hoy, ayer y hace N días", () => {
    expect(haceCuanto(haceDias(0), AHORA)).toBe("hoy");
    expect(haceCuanto(haceDias(1), AHORA)).toBe("ayer");
    expect(haceCuanto(haceDias(12), AHORA)).toBe("hace 12 días");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/avance/trabas.test.ts`
Expected: FAIL con "Cannot find module './trabas'".

- [ ] **Step 3: Write the implementation.** Crea `apps/web/src/lib/avance/trabas.ts`:

```ts
import type { AvanceAlumno, CasoAvance, LeccionAvance } from "./datos";

export const DIAS_INACTIVO = 7;
// El umbral de la última pista (propuesta pedagógica, sección 6): con 5 intentos fallidos ya vio todas las ayudas.
export const FALLIDOS_TRABA = 5;

export type Traba = { tipo: "inactivo" | "leccion" | "entrega" | "pregunta"; admin: string; alumno: string; href: string };
export type Siguiente = { texto: string; href: string };

const DIA_MS = 86_400_000;
const diasEntre = (desde: Date, ahora: Date) => Math.floor((ahora.getTime() - desde.getTime()) / DIA_MS);
const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

export function haceCuanto(fecha: Date, ahora: Date): string {
  const n = diasEntre(fecha, ahora);
  if (n <= 0) return "hoy";
  if (n === 1) return "ayer";
  return `hace ${n} días`;
}

// Un caso puede estar en varias rutas: se cuenta una vez.
function casosDelAvance(avance: AvanceAlumno): CasoAvance[] {
  const porSlug = new Map<string, CasoAvance>();
  for (const caso of [...avance.rutas.flatMap((ruta) => ruta.casos), ...avance.otrosCasos]) porSlug.set(caso.slug, caso);
  return [...porSlug.values()];
}

const ultimaFecha = (caso: CasoAvance) => Math.max(0, ...caso.lecciones.map((leccion) => leccion.actualizadoEn?.getTime() ?? 0));

// El caso en curso que tocó más recientemente, con su lección en curso más reciente o la primera sin aprobar.
export function casoEnCurso(avance: AvanceAlumno): { caso: CasoAvance; leccion: LeccionAvance | null } | null {
  const [caso] = casosDelAvance(avance)
    .filter((fila) => fila.estado === "en_curso")
    .sort((a, b) => ultimaFecha(b) - ultimaFecha(a));
  if (!caso) return null;
  const enCurso = caso.lecciones.filter((leccion) => leccion.estado === "en_curso").sort((a, b) => (b.actualizadoEn?.getTime() ?? 0) - (a.actualizadoEn?.getTime() ?? 0))[0];
  return { caso, leccion: enCurso ?? caso.lecciones.find((leccion) => leccion.estado !== "aprobada") ?? null };
}

export function siguienteDelAvance(avance: AvanceAlumno): Siguiente {
  const actual = casoEnCurso(avance);
  if (!actual) return { texto: "Elige una ruta en tu panel y empieza el primer caso.", href: "/dashboard" };
  if (actual.leccion) return { texto: `Sigue con ${actual.leccion.titulo}, de ${actual.caso.titulo}.`, href: actual.leccion.href };
  return { texto: `Te falta enlazar tu entregable de ${actual.caso.titulo} para completarlo.`, href: actual.caso.href };
}

export function trabasDelAlumno(avance: AvanceAlumno, ahora: Date): Traba[] {
  const trabas: Traba[] = [];
  const actual = casoEnCurso(avance);
  if (actual && avance.ultimaActividad) {
    const n = diasEntre(avance.ultimaActividad, ahora);
    if (n > DIAS_INACTIVO) {
      trabas.push({
        tipo: "inactivo",
        admin: `sin actividad hace ${dias(n)} · ${actual.caso.titulo}`,
        alumno: `Hace ${dias(n)} que no avanzas en ${actual.caso.titulo}.${actual.leccion ? ` Retoma en ${actual.leccion.titulo}.` : ""}`,
        href: actual.leccion?.href ?? actual.caso.href,
      });
    }
  }
  for (const caso of casosDelAvance(avance)) {
    for (const leccion of caso.lecciones) {
      if (leccion.estado === "aprobada" || leccion.fallidos < FALLIDOS_TRABA) continue;
      trabas.push({
        tipo: "leccion",
        admin: `${leccion.fallidos} intentos fallidos · ${caso.titulo} / ${leccion.titulo}`,
        alumno: `Llevas varios intentos en ${leccion.titulo}: abre las pistas o pregúntale al tutor.`,
        href: leccion.href,
      });
    }
  }
  for (const entrega of avance.entregas) {
    if (entrega.estado !== "observado") continue;
    trabas.push({
      tipo: "entrega",
      admin: `entrega observada · ${entrega.caso.titulo}`,
      alumno: `Tu entrega de ${entrega.caso.titulo} tiene observaciones: revísalas y vuelve a enviarla.`,
      href: `/casos/${entrega.caso.slug}`,
    });
  }
  for (const pregunta of avance.preguntasPendientes) {
    trabas.push({
      tipo: "pregunta",
      admin: `pregunta sin responder hace ${dias(diasEntre(pregunta.creadaEn, ahora))} · ${pregunta.caso.titulo}`,
      alumno: `Tu pregunta en ${pregunta.caso.titulo} todavía espera respuesta: te avisaremos por email.`,
      href: `/casos/${pregunta.caso.slug}/${pregunta.mision}`,
    });
  }
  return trabas;
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/avance/trabas.test.ts`
Expected: todas las pruebas pasan.

- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/lib/avance/trabas.ts apps/web/src/lib/avance/trabas.test.ts
git commit -m "feat(avance): las trabas de una persona y su siguiente paso

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Enviar el avance (servicio y ruta)

**Files:**
- Modify: `apps/web/src/lib/cuenta/enlaces.ts`
- Create: `apps/web/src/lib/avance/enviar.ts`
- Test: `apps/web/src/lib/avance/enviar.test.ts`
- Create: `apps/web/src/app/api/admin/usuarios/[id]/avance/route.ts`
- Test: `apps/web/src/app/api/admin/usuarios/[id]/avance/route.test.ts`

**Interfaces:**
- Consumes:
  - `avanceDelAlumno` (Task 2) y `trabasDelAlumno`, `siguienteDelAvance` y `casoEnCurso` (Task 3);
  - `insertAuditLogEntry` (`@syntaxerror/db/audit`), `Encolar` y `encolarEmail` (`@/lib/emails`), `MetaRequest`, `SIN_META` y `metaDeRequest` (`@/lib/cuenta/meta`), `exigirAdmin` (`@/lib/permisos`) y `esUuid` (`@/lib/uuid`).
- Produces:
  - `ESPERA_ENVIO_MS = 600_000` y `MAXIMO_NOTA = 1000`;
  - `type UltimoEnvio = { fecha: Date; actorEmail: string | null }`;
  - `ultimoEnvio(db: AppDb, userId: string): Promise<UltimoEnvio | null>`;
  - `enviarAvance(db: AppDb, datos: { admin: { id: string; email: string }; userId: string; nota: string | null }, deps: { encolar: Encolar; meta: MetaRequest; ahora?: Date }): Promise<"ok" | "no_existe" | "reciente">`;
  - `enlaceAvance(): string`;
  - `POST /api/admin/usuarios/[id]/avance`, con el cuerpo `{ nota?: string }`. Responde 200 `{ ok: true }`, 400, 401, 403, 404, 429 `{ error: "reciente" }` o 503 `{ error: "cola_no_disponible" }`.

- [ ] **Step 1: Write the failing service test.** Crea `apps/web/src/lib/avance/enviar.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, casos, misionProgreso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { enviarAvance, ESPERA_ENVIO_MS, ultimoEnvio } from "./enviar";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const AHORA = new Date(Date.UTC(2026, 9, 20, 12));

async function persona(email: string, rol = "student") {
  const [fila] = await db.insert(users).values({ email, role: rol, name: email === "ana@correo.cl" ? "Ana" : null }).returning({ id: users.id });
  return { id: fila.id, email };
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("enviarAvance", () => {
  it("encola el email con la nota recortada, deja la bitácora y no repite antes de 10 minutos", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl");
    const [excel] = await db.insert(casos).values({ slug: "excel", tipo: "clases", titulo: "Clases de Excel", cargo: "c", empresa: "e", entregable: "r", misiones: [{ slug: "01", titulo: "BUSCARV", tareas: ["t"] }] }).returning({ id: casos.id });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: excel.id, mision: "01", estado: "en_curso", intentos: 5, fallidos: 5, actualizadoEn: AHORA });

    expect(await enviarAvance(db, { admin, userId: ana.id, nota: "  Prueba la pista 2.  " }, { encolar, meta: SIN_META, ahora: AHORA })).toBe("ok");
    expect(enviados).toEqual([
      {
        tipo: "avance",
        para: "ana@correo.cl",
        nombre: "Ana",
        nota: "Prueba la pista 2.",
        rutas: [],
        enCurso: { caso: "Clases de Excel", leccion: "BUSCARV" },
        pasos: ["Llevas varios intentos en BUSCARV: abre las pistas o pregúntale al tutor."],
        enlace: expect.stringMatching(/\/dashboard\/avance$/),
      },
    ]);
    const bitacora = await db.select({ action: auditLog.action, targetId: auditLog.targetId, metadata: auditLog.metadata, actorEmail: auditLog.actorEmail }).from(auditLog);
    expect(bitacora).toEqual([{ action: "progress_sent", targetId: ana.id, metadata: { nota: "Prueba la pista 2.", email: "ana@correo.cl" }, actorEmail: "admin@correo.cl" }]);

    const despues = (ms: number) => new Date(AHORA.getTime() + ms);
    // ultimoEnvio lee created_at de la base (la hora real), así que se fija la fecha del registro para comparar.
    await db.update(auditLog).set({ createdAt: AHORA });
    expect(await enviarAvance(db, { admin, userId: ana.id, nota: null }, { encolar, meta: SIN_META, ahora: despues(ESPERA_ENVIO_MS - 1000) })).toBe("reciente");
    expect(enviados).toHaveLength(1);
    expect(await enviarAvance(db, { admin, userId: ana.id, nota: null }, { encolar, meta: SIN_META, ahora: despues(ESPERA_ENVIO_MS + 1000) })).toBe("ok");
    expect(await ultimoEnvio(db, ana.id)).toMatchObject({ actorEmail: "admin@correo.cl" });
  });

  it("una nota con solo espacios no se envía y una persona que no existe es no_existe", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl");
    await enviarAvance(db, { admin, userId: ana.id, nota: "   " }, { encolar, meta: SIN_META, ahora: AHORA });
    expect(enviados[0]).toMatchObject({ nota: null, pasos: ["Elige una ruta en tu panel y empieza el primer caso."], enCurso: null });
    expect(await enviarAvance(db, { admin, userId: "0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11", nota: null }, { encolar, meta: SIN_META, ahora: AHORA })).toBe("no_existe");
  });

  it("si la cola falla, el error sale y no queda bitácora", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl");
    const falla: Encolar = async () => {
      throw new Error("La cola de emails no responde.");
    };
    await expect(enviarAvance(db, { admin, userId: ana.id, nota: null }, { encolar: falla, meta: SIN_META, ahora: AHORA })).rejects.toThrow("no responde");
    expect(await db.select().from(auditLog)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/avance/enviar.test.ts`
Expected: FAIL con "Cannot find module './enviar'".

- [ ] **Step 3: Write the service.** En `apps/web/src/lib/cuenta/enlaces.ts`, agrega al final:

```ts
export const enlaceAvance = () => absoluteUrl("/dashboard/avance");
```

Crea `apps/web/src/lib/avance/enviar.ts`:

```ts
import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { auditLog } from "@syntaxerror/db/schema";
import { enlaceAvance } from "@/lib/cuenta/enlaces";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { avanceDelAlumno } from "./datos";
import { casoEnCurso, siguienteDelAvance, trabasDelAlumno } from "./trabas";

// Un envío por alumno cada 10 minutos: evita el email doble de un clic repetido.
export const ESPERA_ENVIO_MS = 10 * 60_000;
export const MAXIMO_NOTA = 1000;

export type UltimoEnvio = { fecha: Date; actorEmail: string | null };

// El historial de envíos es la bitácora: no hace falta otra tabla.
export async function ultimoEnvio(db: AppDb, userId: string): Promise<UltimoEnvio | null> {
  const [fila] = await db
    .select({ fecha: auditLog.createdAt, actorEmail: auditLog.actorEmail })
    .from(auditLog)
    .where(and(eq(auditLog.action, "progress_sent"), eq(auditLog.targetId, userId)))
    .orderBy(desc(auditLog.createdAt))
    .limit(1);
  return fila ?? null;
}

export async function enviarAvance(
  db: AppDb,
  { admin, userId, nota }: { admin: { id: string; email: string }; userId: string; nota: string | null },
  { encolar, meta, ahora = new Date() }: { encolar: Encolar; meta: MetaRequest; ahora?: Date }
): Promise<"ok" | "no_existe" | "reciente"> {
  const avance = await avanceDelAlumno(db, userId);
  if (!avance) return "no_existe";
  const ultimo = await ultimoEnvio(db, userId);
  if (ultimo && ahora.getTime() - ultimo.fecha.getTime() < ESPERA_ENVIO_MS) return "reciente";

  const notaLimpia = nota?.trim() || null;
  const trabas = trabasDelAlumno(avance, ahora);
  const actual = casoEnCurso(avance);
  // Si la cola falla, el error sale antes de la bitácora: el envío no queda registrado y se puede reintentar.
  await encolar({
    tipo: "avance",
    para: avance.perfil.email,
    nombre: avance.perfil.nombre,
    nota: notaLimpia,
    rutas: avance.rutas.map((ruta) => ({ titulo: ruta.titulo, completos: ruta.completos, total: ruta.casos.length })),
    enCurso: actual ? { caso: actual.caso.titulo, leccion: actual.leccion?.titulo ?? null } : null,
    pasos: trabas.length > 0 ? trabas.map((traba) => traba.alumno) : [siguienteDelAvance(avance).texto],
    enlace: enlaceAvance(),
  });
  await insertAuditLogEntry(db, {
    actorId: admin.id,
    actorEmail: admin.email,
    action: "progress_sent",
    targetType: "user",
    targetId: userId,
    metadata: { nota: notaLimpia, email: avance.perfil.email },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  return "ok";
}
```

- [ ] **Step 4: Run the service test.**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/avance/enviar.test.ts`
Expected: las 3 pruebas pasan.

- [ ] **Step 5: Write the failing route test.** Crea `apps/web/src/app/api/admin/usuarios/[id]/avance/route.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { POST } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { encolarEmail } = await import("@/lib/emails");
const { db, close } = createTestDb();

async function persona(email: string, rol: Rol) {
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

const pedir = (id: string, cuerpo: unknown) =>
  POST(new Request(`http://localhost:3000/api/admin/usuarios/${id}/avance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }), { params: Promise.resolve({ id }) });

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
  vi.mocked(encolarEmail).mockReset().mockResolvedValue(undefined);
});
afterAll(() => close());

describe("POST /api/admin/usuarios/[id]/avance", () => {
  it("sin sesión 401; alumno o docente 403", async () => {
    const ana = await persona("ana@correo.cl", "student");
    expect((await pedir(ana.id, {})).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("rosa@correo.cl", "teacher"));
    expect((await pedir(ana.id, {})).status).toBe(403);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(ana);
    expect((await pedir(ana.id, {})).status).toBe(403);
    expect(encolarEmail).not.toHaveBeenCalled();
  });

  it("valida el id y la nota, envía una vez y el segundo envío seguido es 429", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl", "student");
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(admin);
    expect((await pedir("no-es-uuid", {})).status).toBe(404);
    expect((await pedir("0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11", {})).status).toBe(404);
    expect((await pedir(ana.id, { nota: "x".repeat(1001) })).status).toBe(400);
    expect((await pedir(ana.id, { nota: 5 })).status).toBe(400);
    expect((await pedir(ana.id, { nota: "Vas bien." })).status).toBe(200);
    const segundo = await pedir(ana.id, {});
    expect(segundo.status).toBe(429);
    expect(await segundo.json()).toEqual({ error: "reciente" });
    expect(encolarEmail).toHaveBeenCalledTimes(1);
  });

  it("si la cola falla responde 503 y no deja bitácora", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl", "student");
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(admin);
    vi.mocked(encolarEmail).mockRejectedValue(new Error("La cola de emails no responde."));
    const respuesta = await pedir(ana.id, {});
    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ error: "cola_no_disponible" });
    expect(await db.select().from(auditLog)).toEqual([]);
  });
});
```

- [ ] **Step 6: Run it to verify it fails.**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run "src/app/api/admin/usuarios/[id]/avance/route.test.ts"`
Expected: FAIL con "Cannot find module './route'".

- [ ] **Step 7: Write the route.** Crea `apps/web/src/app/api/admin/usuarios/[id]/avance/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { enviarAvance, MAXIMO_NOTA } from "@/lib/avance/enviar";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { encolarEmail } from "@/lib/emails";
import { exigirAdmin } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const avanceSchema = z.object({ nota: z.string().max(MAXIMO_NOTA).optional() });
const noExiste = () => NextResponse.json({ error: "no_existe" }, { status: 404 });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirAdmin();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return noExiste();
  const parsed = avanceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  try {
    const resultado = await enviarAvance(getDb(), { admin: usuario, userId: id, nota: parsed.data.nota ?? null }, { encolar: encolarEmail, meta: metaDeRequest(request) });
    if (resultado === "no_existe") return noExiste();
    if (resultado === "reciente") return NextResponse.json({ error: "reciente" }, { status: 429 });
    return NextResponse.json({ ok: true });
  } catch (fallo) {
    // encolarEmail (no encolarSinFallar): si Redis no responde, quien envía lo sabe y puede reintentar.
    console.error("[avance] no se pudo encolar el email", fallo);
    return NextResponse.json({ error: "cola_no_disponible" }, { status: 503 });
  }
}
```

- [ ] **Step 8: Run the tests to verify they pass.**

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec vitest run src/lib/avance 'src/app/api/admin/usuarios' && cd apps/web && npx tsc --noEmit"`
Expected: todas las pruebas pasan y `tsc` termina sin errores.

- [ ] **Step 9: Commit.**

```bash
git add apps/web/src/lib/cuenta/enlaces.ts apps/web/src/lib/avance/enviar.ts apps/web/src/lib/avance/enviar.test.ts "apps/web/src/app/api/admin/usuarios/[id]/avance"
git commit -m "feat(avance): un admin envia el avance por email, una vez cada 10 minutos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Los componentes de terminal y la ficha del admin

**Files:**
- Create: `apps/web/src/components/avance/terminal.tsx`
- Create: `apps/web/src/components/avance/git-log-rutas.tsx`
- Create: `apps/web/src/components/avance/tail-actividad.tsx`
- Create: `apps/web/src/components/avance/entregas.tsx`
- Create: `apps/web/src/components/admin/enviar-avance.tsx`
- Modify: `apps/web/src/app/(dashboard)/admin/usuarios/[id]/page.tsx` (se rehace entera)

**Interfaces:**
- Consumes:
  - `avanceDelAlumno` y sus tipos (Task 2), `trabasDelAlumno` y `haceCuanto` (Task 3);
  - `ultimoEnvio` y `MAXIMO_NOTA` (Task 4);
  - `NOMBRES_DIMENSION` y `DIMENSIONES` (`@syntaxerror/content/rubrica`), `enviarJson` (`@/lib/cuenta/cliente`), `ETIQUETAS_ROL` (`@/lib/admin/etiquetas`) y `unidad` (`@/lib/unidad`).
- Produces:
  - `SeccionTerminal({ comando, children, etiqueta? })`;
  - `GitLogRutas({ rutas, otrosCasos, modo, trabadas })`, con `modo: "admin" | "alumno"` y `trabadas: ReadonlySet<string>` (los `href` de las lecciones trabadas);
  - `TailActividad({ eventos, ahora })`;
  - `ListaEntregas({ entregas, modo, email })`.

- [ ] **Step 1: The terminal section.** Crea `apps/web/src/components/avance/terminal.tsx`:

```tsx
import type { ReactNode } from "react";

// Una sección con el prompt de una terminal: $ comando, y el contenido en monoespaciado.
export function SeccionTerminal({ comando, etiqueta, children }: { comando: string; etiqueta?: string; children: ReactNode }) {
  return (
    <section className="card grid gap-3 p-5" aria-label={etiqueta ?? comando}>
      <p className="font-mono text-sm font-bold text-primary">{`$ ${comando}`}</p>
      <div className="grid gap-2 font-mono text-sm">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: The routes, case by case.** Crea `apps/web/src/components/avance/git-log-rutas.tsx`:

```tsx
import Link from "next/link";
import { cn } from "@syntaxerror/ui/cn";
import type { CasoAvance, RutaAvance } from "@/lib/avance/datos";
import { unidad } from "@/lib/unidad";
import { SeccionTerminal } from "./terminal";

const MARCA: Record<CasoAvance["estado"], string> = { completo: "✓", en_curso: "▶", pendiente: "·" };
const COLOR: Record<CasoAvance["estado"], string> = { completo: "text-success", en_curso: "text-primary", pendiente: "text-muted-foreground" };
const ESTADO_LECCION = { aprobada: "aprobada", en_curso: "en curso", sin_empezar: "sin empezar" } as const;

function fecha(valor: Date | null): string {
  return valor ? valor.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Santiago" }) : "";
}

// Las lecciones de un caso. El admin ve los intentos y los fallidos; el alumno, solo el estado y la fecha.
function Lecciones({ caso, modo, trabadas }: { caso: CasoAvance; modo: "admin" | "alumno"; trabadas: ReadonlySet<string> }) {
  return (
    <ol className="grid gap-1 border-l border-border pl-4">
      {caso.lecciones.map((leccion, indice) => (
        <li key={leccion.slug} className={cn("flex flex-wrap gap-x-3", trabadas.has(leccion.href) ? "font-bold text-destructive" : leccion.estado === "aprobada" ? "text-success" : leccion.estado === "en_curso" ? "text-primary" : "text-muted-foreground")}>
          <Link href={leccion.href} className="hover:underline">{`${String(indice + 1).padStart(2, "0")} ${leccion.titulo}`}</Link>
          <span>{ESTADO_LECCION[leccion.estado]}</span>
          {modo === "admin" && leccion.intentos > 0 ? <span>{`${leccion.intentos} intentos · ${leccion.fallidos} fallidos`}</span> : null}
          {leccion.actualizadoEn ? <span className="text-muted-foreground">{fecha(leccion.actualizadoEn)}</span> : null}
        </li>
      ))}
    </ol>
  );
}

function Caso({ caso, modo, trabadas }: { caso: CasoAvance; modo: "admin" | "alumno"; trabadas: ReadonlySet<string> }) {
  const resumen = (
    <span className={cn("flex flex-wrap gap-x-3", COLOR[caso.estado])}>
      <span aria-hidden="true">{MARCA[caso.estado]}</span>
      <span className="font-bold">{caso.titulo}</span>
      <span>{`${caso.aprobadas}/${caso.total} ${caso.total === 1 ? unidad(caso.tipo).nombre : caso.tipo === "clases" ? "lecciones" : "misiones"}`}</span>
    </span>
  );
  // El caso en curso se abre solo: es donde están las trabas. Los demás, con un clic.
  return (
    <li>
      <details open={caso.estado === "en_curso"} className="grid gap-1">
        <summary className="cursor-pointer list-none">{resumen}</summary>
        <div className="mt-1">
          <Lecciones caso={caso} modo={modo} trabadas={trabadas} />
        </div>
      </details>
    </li>
  );
}

export function GitLogRutas({ rutas, otrosCasos, modo, trabadas }: { rutas: RutaAvance[]; otrosCasos: CasoAvance[]; modo: "admin" | "alumno"; trabadas: ReadonlySet<string> }) {
  if (rutas.length === 0 && otrosCasos.length === 0) {
    return (
      <SeccionTerminal comando="git log --ruta">
        <p className="text-muted-foreground">{modo === "admin" ? "Todavía no empieza ninguna ruta." : "Todavía no empiezas ninguna ruta."}</p>
      </SeccionTerminal>
    );
  }
  return (
    <>
      {rutas.map((ruta) => (
        <SeccionTerminal key={ruta.slug} comando={`git log --ruta ${ruta.slug}`} etiqueta={`Ruta ${ruta.titulo}`}>
          <p className="text-muted-foreground">{`${ruta.titulo} · ${ruta.completos} de ${ruta.casos.length} casos completos`}</p>
          <ul className="grid gap-2">{ruta.casos.map((caso) => <Caso key={caso.slug} caso={caso} modo={modo} trabadas={trabadas} />)}</ul>
        </SeccionTerminal>
      ))}
      {otrosCasos.length > 0 ? (
        <SeccionTerminal comando="git log --otros-casos" etiqueta="Otros casos">
          <ul className="grid gap-2">{otrosCasos.map((caso) => <Caso key={caso.slug} caso={caso} modo={modo} trabadas={trabadas} />)}</ul>
        </SeccionTerminal>
      ) : null}
    </>
  );
}
```

Antes de seguir, comprueba que existan las clases de color `text-success` y `text-destructive`:

Run: `grep -rn "\-\-success\|\-\-destructive" apps/web/src/app/globals.css packages/ui/src/*.css 2>/dev/null | head`

Si `--success` no existe, usa `text-emerald-600 dark:text-emerald-400` en lugar de `text-success`, en `COLOR` y en `Lecciones`.

- [ ] **Step 3: Activity and deliveries.** Crea `apps/web/src/components/avance/tail-actividad.tsx`:

```tsx
import Link from "next/link";
import type { EventoAvance } from "@/lib/avance/datos";
import { haceCuanto } from "@/lib/avance/trabas";
import { SeccionTerminal } from "./terminal";

const ETIQUETA: Record<EventoAvance["tipo"], string> = { leccion: "ok", entrega: "push", tutor: "ask", docente: "ask", puntos: "xp" };

export function TailActividad({ eventos, ahora }: { eventos: EventoAvance[]; ahora: Date }) {
  return (
    <SeccionTerminal comando="tail -n 20 actividad.log" etiqueta="Actividad reciente">
      {eventos.length === 0 ? (
        <p className="text-muted-foreground">Sin actividad todavía.</p>
      ) : (
        <ol className="grid gap-1">
          {eventos.map((evento, indice) => (
            <li key={indice} className="flex flex-wrap gap-x-3">
              <span className="w-20 shrink-0 text-muted-foreground">{haceCuanto(evento.fecha, ahora)}</span>
              <span className="w-10 shrink-0 font-bold text-primary">{ETIQUETA[evento.tipo]}</span>
              {evento.href ? <Link href={evento.href} className="hover:underline">{evento.texto}</Link> : <span>{evento.texto}</span>}
            </li>
          ))}
        </ol>
      )}
    </SeccionTerminal>
  );
}
```

Crea `apps/web/src/components/avance/entregas.tsx`:

```tsx
import Link from "next/link";
import { DIMENSIONES, NOMBRES_DIMENSION } from "@syntaxerror/content/rubrica";
import { cn } from "@syntaxerror/ui/cn";
import type { EntregaAvance } from "@/lib/avance/datos";
import { SeccionTerminal } from "./terminal";

const ESTADO: Record<EntregaAvance["estado"], { texto: string; color: string }> = {
  pendiente: { texto: "en revisión", color: "text-primary" },
  aprobado: { texto: "aprobada", color: "text-success" },
  observado: { texto: "con observaciones", color: "text-destructive" },
};

// El admin va a la revisión; el alumno, al caso, donde ve las observaciones y vuelve a enviar.
export function ListaEntregas({ entregas, modo, email }: { entregas: EntregaAvance[]; modo: "admin" | "alumno"; email: string }) {
  if (entregas.length === 0) return null;
  return (
    <SeccionTerminal comando="git log --entregas" etiqueta="Entregas">
      <ul className="grid gap-3">
        {entregas.map((entrega) => (
          <li key={entrega.caso.slug} className="grid gap-1">
            <p className="flex flex-wrap gap-x-3">
              <Link href={modo === "admin" ? `/profesor/entregables?q=${encodeURIComponent(email)}` : `/casos/${entrega.caso.slug}`} className="font-bold hover:underline">{entrega.caso.titulo}</Link>
              <span className={cn(ESTADO[entrega.estado].color)}>{ESTADO[entrega.estado].texto}</span>
            </p>
            {entrega.estado !== "pendiente" ? (
              <ul className="grid gap-0.5 pl-4 text-muted-foreground">
                {DIMENSIONES.filter((dimension) => entrega.puntajes[dimension] !== undefined).map((dimension) => (
                  <li key={dimension}>{`${NOMBRES_DIMENSION[dimension]}: ${entrega.puntajes[dimension]}/3${entrega.observaciones[dimension] ? ` · ${entrega.observaciones[dimension]}` : ""}`}</li>
                ))}
                {entrega.comentario ? <li>{`Comentario: ${entrega.comentario}`}</li> : null}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </SeccionTerminal>
  );
}
```

Comprueba que `NOMBRES_DIMENSION` sea `Record<Dimension, string>`:

Run: `grep -n "NOMBRES_DIMENSION" packages/content/src/rubrica.ts`

Si es un objeto con otra forma (por ejemplo `{ nombre, descripcion }`), usa el campo del nombre.

- [ ] **Step 4: The send form.** Crea `apps/web/src/components/admin/enviar-avance.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

const MENSAJES: Record<number, string> = {
  429: "Ya enviaste el avance hace menos de 10 minutos.",
  503: "El servicio de emails no responde. Intenta de nuevo en unos minutos.",
};

// Le envía a la persona su avance por email, con una nota opcional que va arriba del resumen.
export function EnviarAvance({ userId, maximo, ultimo, verificado }: { userId: string; maximo: number; ultimo: string | null; verificado: boolean }) {
  const router = useRouter();
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson(`/api/admin/usuarios/${userId}/avance`, "POST", nota.trim() ? { nota } : {});
    setEnviando(false);
    setAviso(respuesta.ok ? "Avance enviado." : MENSAJES[respuesta.status] ?? "No se pudo enviar.");
    if (respuesta.ok) {
      setNota("");
      router.refresh();
    }
  }

  return (
    <form className="grid gap-3" onSubmit={enviar}>
      {!verificado ? <p className="text-sm text-muted-foreground">Esta persona no confirmó su email: puede que no lo reciba.</p> : null}
      <label className="grid gap-1 text-sm font-bold">
        Nota (opcional)
        <textarea value={nota} onChange={(evento) => setNota(evento.target.value)} maxLength={maximo} rows={3} placeholder="Vi que te quedaste en BUSCARV: prueba la pista 2." className="field font-normal" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={enviando}>Enviar avance</Button>
        <span className="text-sm text-muted-foreground">{ultimo ?? "Nunca se le envió el avance."}</span>
      </div>
      {aviso ? <p role="status" className="text-sm font-bold">{aviso}</p> : null}
    </form>
  );
}
```

Comprueba lo que devuelve `enviarJson`:

Run: `sed -n 1,30p apps/web/src/lib/cuenta/cliente.ts`

Si no expone `status`, usa el campo que sí exponga, por ejemplo `respuesta.error` con `"reciente"` o `"cola_no_disponible"`, y ajusta `MENSAJES` a esa forma.

- [ ] **Step 5: Rewrite the ficha.** Reemplaza el contenido completo de `apps/web/src/app/(dashboard)/admin/usuarios/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { EliminarUsuario } from "@/components/admin/eliminar-usuario";
import { EnviarAvance } from "@/components/admin/enviar-avance";
import { FormularioProbador } from "@/components/admin/formulario-probador";
import { FormularioRol } from "@/components/admin/formulario-rol";
import { ListaEntregas } from "@/components/avance/entregas";
import { GitLogRutas } from "@/components/avance/git-log-rutas";
import { TailActividad } from "@/components/avance/tail-actividad";
import { SeccionTerminal } from "@/components/avance/terminal";
import { adminDePagina } from "@/lib/admin/acceso";
import { ETIQUETAS_ROL } from "@/lib/admin/etiquetas";
import { avanceDelAlumno } from "@/lib/avance/datos";
import { MAXIMO_NOTA, ultimoEnvio } from "@/lib/avance/enviar";
import { haceCuanto, trabasDelAlumno } from "@/lib/avance/trabas";
import { esUuid } from "@/lib/uuid";

export const metadata = { title: "Usuario · Administración" };

export default async function UsuarioAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await adminDePagina(`/admin/usuarios/${id}`);
  if (!esUuid(id)) notFound();
  const db = getDb();
  const [avance, envio] = await Promise.all([avanceDelAlumno(db, id), ultimoEnvio(db, id)]);
  if (!avance) notFound();
  const ahora = new Date();
  const { perfil } = avance;
  const trabas = trabasDelAlumno(avance, ahora);
  const trabadas = new Set(trabas.filter((traba) => traba.tipo === "leccion").map((traba) => traba.href));
  const esPropia = perfil.id === admin.id;
  return (
    <main className="grid gap-6">
      <nav className="text-sm" aria-label="Volver"><Link className="font-bold text-primary hover:underline" href="/admin/usuarios">← Usuarios</Link></nav>
      <SeccionTerminal comando="whoami" etiqueta="Perfil">
        <h1 className="font-sans text-3xl font-black">{perfil.nombre ?? perfil.email}</h1>
        <p>{`${perfil.email} · ${ETIQUETAS_ROL[perfil.rol]}${perfil.probador ? " · probador" : ""} · ${perfil.verificado ? "email confirmado" : "email sin confirmar"}`}</p>
        <p className="text-muted-foreground">
          {`registro ${haceCuanto(perfil.registradoEn, ahora)} · última actividad ${avance.ultimaActividad ? haceCuanto(avance.ultimaActividad, ahora) : "nunca"} · nivel ${perfil.nivel.nivel} (${perfil.nivel.puntos} puntos)`}
        </p>
      </SeccionTerminal>
      <SeccionTerminal comando="status" etiqueta="Trabas">
        {trabas.length === 0 ? (
          <p className="text-success">0 problemas · todo en orden</p>
        ) : (
          <ul className="grid gap-1">
            {trabas.map((traba) => (
              <li key={`${traba.tipo}-${traba.href}`} className="text-destructive">
                <span className="font-bold">{`[${traba.tipo}] `}</span>
                <Link href={traba.href} className="hover:underline">{traba.admin}</Link>
              </li>
            ))}
          </ul>
        )}
      </SeccionTerminal>
      <GitLogRutas rutas={avance.rutas} otrosCasos={avance.otrosCasos} modo="admin" trabadas={trabadas} />
      <TailActividad eventos={avance.actividad} ahora={ahora} />
      <ListaEntregas entregas={avance.entregas} modo="admin" email={perfil.email} />
      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Enviar avance</h2>
        <EnviarAvance userId={perfil.id} maximo={MAXIMO_NOTA} verificado={perfil.verificado} ultimo={envio ? `Último envío: ${haceCuanto(envio.fecha, ahora)}, por ${envio.actorEmail ?? "alguien de administración"}.` : null} />
      </section>
      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Rol</h2>
        {esPropia ? <p className="text-sm text-muted-foreground">Es tu cuenta: tu rol no se cambia desde aquí.</p> : <FormularioRol userId={perfil.id} rolActual={perfil.rol} />}
      </section>
      <section className="card grid gap-3 p-5">
        <h2 className="text-xl font-black">Probador</h2>
        <FormularioProbador userId={perfil.id} probadorActual={perfil.probador} />
      </section>
      {esPropia ? null : (
        <section className="card grid gap-3 border-destructive/40 p-5">
          <h2 className="text-xl font-black">Eliminar cuenta</h2>
          <p className="text-sm text-muted-foreground">Para solicitudes de eliminación por derechos ARCO. No se puede deshacer, y la persona recibe un aviso por email.</p>
          <EliminarUsuario userId={perfil.id} />
        </section>
      )}
    </main>
  );
}
```

Revisa si `detalleUsuario` se usa en otra parte:

Run: `grep -rn "detalleUsuario" apps/web/src --include=*.ts --include=*.tsx | grep -v test`

Si solo lo usaba esta página, déjalo igual: sus pruebas en `usuarios.test.ts` lo siguen usando.

- [ ] **Step 6: Typecheck and existing tests.**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx tsc --noEmit && cd /app && pnpm --filter web exec vitest run src/lib/admin src/lib/avance"`
Expected: sin errores de tipos y todas las pruebas pasan.

- [ ] **Step 7: Look at it in the browser.**
  1. Abre http://localhost:3100/admin/usuarios con la cuenta admin y entra a la ficha de un alumno que tenga progreso.
  2. Saca capturas en claro, oscuro y 390 px con un spec temporal en `e2e/claude-tmp/`, con su propio `playwright.config.ts` (`testDir: "."`, `baseURL: "http://web:3000"`). Córrelo con `docker compose --profile e2e run --rm e2e ./node_modules/.bin/playwright test --config claude-tmp/playwright.config.ts` y bórralo al terminar.
  3. Comprueba que en 390 px `document.documentElement.scrollWidth` sea igual a `window.innerWidth`.
  4. Muéstrale las capturas al usuario antes del commit.

- [ ] **Step 8: Commit.**

```bash
git add apps/web/src/components/avance apps/web/src/components/admin/enviar-avance.tsx "apps/web/src/app/(dashboard)/admin/usuarios/[id]/page.tsx"
git commit -m "feat(admin): la ficha del alumno con sus trabas, sus rutas leccion por leccion y el envio del avance

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: La página del alumno y el enlace del panel

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/avance/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx` (la sección "Continuar", dentro del `div` de los botones)

**Interfaces:**
- Consumes: `avanceDelAlumno` (Task 2), `trabasDelAlumno` y `siguienteDelAvance` (Task 3), y los componentes de la Task 5 con `modo="alumno"`.

- [ ] **Step 1: The page.** Crea `apps/web/src/app/(dashboard)/dashboard/avance/page.tsx`:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { ListaEntregas } from "@/components/avance/entregas";
import { GitLogRutas } from "@/components/avance/git-log-rutas";
import { SeccionTerminal } from "@/components/avance/terminal";
import { avanceDelAlumno } from "@/lib/avance/datos";
import { siguienteDelAvance, trabasDelAlumno } from "@/lib/avance/trabas";
import { obtenerUsuarioId } from "@/lib/sesion";

export const metadata = { title: "Tu avance" };

export default async function AvancePage() {
  const userId = await obtenerUsuarioId();
  if (!userId) redirect("/login?callbackUrl=/dashboard/avance");
  const avance = await avanceDelAlumno(getDb(), userId);
  if (!avance) notFound();
  const trabas = trabasDelAlumno(avance, new Date());
  const siguiente = siguienteDelAvance(avance);
  // El alumno ve sus trabas como pasos a seguir, sin el conteo de fallidos ni los datos de su cuenta.
  const trabadas = new Set(trabas.filter((traba) => traba.tipo === "leccion").map((traba) => traba.href));
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <SeccionTerminal comando="whoami" etiqueta="Tu perfil">
        <h1 className="font-sans text-3xl font-black">Tu avance</h1>
        <p className="text-muted-foreground">{`${avance.perfil.nombre ?? avance.perfil.email} · nivel ${avance.perfil.nivel.nivel} (${avance.perfil.nivel.puntos} puntos)`}</p>
      </SeccionTerminal>
      <SeccionTerminal comando="next" etiqueta="Qué sigue">
        {trabas.length > 0 ? (
          <ul className="grid gap-2">
            {trabas.map((traba) => (
              <li key={`${traba.tipo}-${traba.href}`}>
                <Link href={traba.href} className="hover:underline">{`→ ${traba.alumno}`}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>{`→ ${siguiente.texto}`}</p>
        )}
        <div>
          <Link href={trabas[0]?.href ?? siguiente.href} className="btn btn-primary font-sans">Ir ahora</Link>
        </div>
      </SeccionTerminal>
      <GitLogRutas rutas={avance.rutas} otrosCasos={avance.otrosCasos} modo="alumno" trabadas={trabadas} />
      <ListaEntregas entregas={avance.entregas} modo="alumno" email={avance.perfil.email} />
    </main>
  );
}
```

- [ ] **Step 2: The link from the panel.** En `apps/web/src/app/(dashboard)/dashboard/page.tsx`, dentro de la sección "Continuar" (la que tiene `aria-label="Continuar"` y `{paso ? (`), agrega el enlace después del de "Ver el mapa de la ruta", dentro del mismo `div className="flex flex-wrap items-center gap-3"`:

```tsx
            <Link href="/dashboard/avance" className="text-sm font-bold text-primary hover:underline">Ver tu avance</Link>
```

- [ ] **Step 3: Typecheck.**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx tsc --noEmit"`
Expected: sin errores.

- [ ] **Step 4: Look at it in the browser.** Con el spec temporal de la Task 5, registra un alumno, aprueba una lección por la API (`aprobar` de `e2e/tests/progreso.ts`) y abre `/dashboard/avance`. Saca capturas en claro, oscuro y 390 px, y revisa que no haya desplazamiento horizontal. Comprueba también que en la página no aparezca la palabra "fallidos". Muéstrale las capturas al usuario.

- [ ] **Step 5: Commit.**

```bash
git add "apps/web/src/app/(dashboard)/dashboard/avance/page.tsx" "apps/web/src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(dashboard): tu avance leccion por leccion, con el siguiente paso

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: e2e de punta a punta

**Files:**
- Create: `e2e/tests/ficha-alumno.spec.ts`

**Interfaces:**
- Consumes: `registrarse` y `MISIONES` (`./progreso`), `entrarComoAdmin` (`./revision`), `esperarEmail` y `rutaDelEnlace` (`./mailpit`), y `test`, `expect` y la fixture `nuevaPagina` (`./fixtures`).

- [ ] **Step 1: Write the spec.** Crea `e2e/tests/ficha-alumno.spec.ts`:

```ts
import { expect, test } from "./fixtures";
import { esperarEmail, rutaDelEnlace } from "./mailpit";
import { MISIONES, registrarse } from "./progreso";
import { entrarComoAdmin } from "./revision";

const CASO = "herramientas-del-oficio";

test("el admin ve la traba de un alumno, le envía su avance y el alumno lo abre desde el email", async ({ page, ip, nuevaPagina }) => {
  const email = await registrarse(page, "Bruno Tapia");
  const [mision, tarea] = MISIONES[CASO][0];
  for (let intento = 0; intento < 5; intento += 1) {
    const respuesta = await page.request.post("/api/progreso", { headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip }, data: { caso: CASO, mision, tarea, aprobada: false } });
    expect(respuesta.ok()).toBe(true);
  }

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto(`/admin/usuarios?q=${encodeURIComponent(email)}`);
  await admin.getByRole("link", { name: email }).click();
  const trabas = admin.getByRole("region", { name: "Trabas" });
  await expect(trabas).toContainText("5 intentos fallidos");
  await admin.getByLabel("Nota (opcional)").fill("Prueba la pista 2.");
  await admin.getByRole("button", { name: "Enviar avance" }).click();
  await expect(admin.getByRole("status")).toHaveText("Avance enviado.");
  await admin.getByRole("button", { name: "Enviar avance" }).click();
  await expect(admin.getByRole("status")).toHaveText("Ya enviaste el avance hace menos de 10 minutos.");

  const recibido = await esperarEmail(email, "Tu avance en syntaxError.cl");
  expect(recibido.texto).toContain("Nota del equipo: Prueba la pista 2.");
  expect(recibido.texto).toContain("Llevas varios intentos");
  await page.goto(rutaDelEnlace(recibido.texto, "/dashboard/avance"));
  const siguiente = page.getByRole("region", { name: "Qué sigue" });
  await expect(siguiente).toContainText("Llevas varios intentos");
  await expect(page.locator("main")).not.toContainText("fallidos");
});
```

Antes de correrlo, comprueba que el primer paso de `herramientas-del-oficio` se pueda intentar sin requisitos. `avance.spec.ts` ya lo hace con `aprobar` en ese caso. Comprueba también que `nuevaPagina` cree un contexto sin sesión, como en `listas.spec.ts`.

- [ ] **Step 2: Run it against the production images.**

Run (en la raíz del repo): `COMPOSE_FILE="docker-compose.yml:<scratchpad>/puerto-3100.yml" npm run test:e2e -- tests/ficha-alumno.spec.ts`
Expected: 1 passed. Si el override de puerto ya no existe, vuelve a crearlo: un servicio `web` que publica `3100:3000` en lugar de `3000:3000`.

- [ ] **Step 3: Run the whole suite.**

Run: `COMPOSE_FILE="docker-compose.yml:<scratchpad>/puerto-3100.yml" npm run test:e2e`
Expected: todo pasa (hoy son 70 pruebas, más esta) y ninguna falla.

- [ ] **Step 4: Commit.**

```bash
git add e2e/tests/ficha-alumno.spec.ts
git commit -m "test(e2e): la ficha del alumno, el envio del avance y la pagina del alumno

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Después del plan

- El despliegue a producción no es parte del plan. Se hace solo con el visto bueno del usuario, con el procedimiento `serviceInstanceDeployV2` que está en la memoria `fase-5-despliegue`.
- Al terminar, el spec pasa a **Estado: implementado**, con las diferencias de este plan marcadas como **(al implementar)**.
