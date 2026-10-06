import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoAviso } from "@syntaxerror/queue/avisos";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { EVENTO_PREGUNTA_NUEVA, EVENTO_PREGUNTA_RESPONDIDA } from "@syntaxerror/queue/eventos";
import { auditLog, casos, claseCasos, claseInscripciones, clases, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Rol } from "@/lib/roles";
import { crearPreguntaProfesor, paginaPreguntasParaDocente, preguntasDelEstudiante, preguntasParaDocente, responderPregunta } from "./preguntas-profesor";

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
