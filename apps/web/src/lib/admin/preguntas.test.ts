import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { auditLog, casos, preguntasProfesor, tutorCache, tutorPreguntas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import { borrarRespuestaCache, listarCacheTutor, listarPreguntasDocentes, listarPreguntasTutor } from "./preguntas";

const { db, close } = createTestDb();
const vector = () => Array.from({ length: 768 }, (_, indice) => (indice === 0 ? 1 : 0));

async function escenario() {
  const [ana, rosa, admin] = await db
    .insert(users)
    .values([{ email: "ana@correo.cl", name: "Ana" }, { email: "rosa@correo.cl", name: "Rosa", role: "teacher" }, { email: "admin@correo.cl", role: "admin" }])
    .returning({ id: users.id });
  const [ventas, stock] = await db
    .insert(casos)
    .values([
      { slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [] },
      { slug: "stock", titulo: "Stock", cargo: "A", empresa: "D", entregable: "R", misiones: [] },
    ])
    .returning({ id: casos.id });
  await db.insert(preguntasProfesor).values([
    { alumnoId: ana.id, casoId: ventas.id, mision: "m1", texto: "¿Con docente?", profesorId: rosa.id },
    { alumnoId: ana.id, casoId: ventas.id, mision: "m1", texto: "¿Sin docente?", estado: "respondida", respuesta: "Sí." },
  ]);
  await db.insert(tutorPreguntas).values([
    { userId: ana.id, casoId: ventas.id, mision: "m1", pregunta: "¿Qué es WHERE?", respuesta: "Filtra filas.", estado: "respondida" },
    { userId: ana.id, casoId: ventas.id, mision: "m1", pregunta: "¿Quién ganó el mundial?", respuesta: "Fuera de tema", estado: "fuera_de_tema" },
  ]);
  const [cacheVentas] = await db
    .insert(tutorCache)
    .values([
      { casoId: ventas.id, mision: "m1", pregunta: "¿Qué es WHERE?", respuesta: "Filtra filas.", embedding: vector() },
      { casoId: stock.id, mision: "m1", pregunta: "¿Qué es SUM?", respuesta: "Suma.", embedding: vector() },
    ])
    .returning({ id: tutorCache.id });
  return { admin: { id: admin.id, email: "admin@correo.cl" }, cacheId: cacheVentas.id };
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("preguntas en administración", () => {
  it("lista las preguntas a docentes con su docente, y filtra por estado", async () => {
    await escenario();
    const todas = await listarPreguntasDocentes(db, { pagina: 1 });
    expect(todas.total).toBe(2);
    expect(todas.filas.map((fila) => [fila.texto, fila.docente, fila.estudiante, fila.caso.titulo]).sort()).toEqual([
      ["¿Con docente?", "Rosa", "Ana", "Ventas"],
      ["¿Sin docente?", null, "Ana", "Ventas"],
    ]);
    expect((await listarPreguntasDocentes(db, { estado: "pendiente", pagina: 1 })).filas.map((fila) => fila.texto)).toEqual(["¿Con docente?"]);
  });

  it("lista las preguntas del tutor y filtra por estado", async () => {
    await escenario();
    expect((await listarPreguntasTutor(db, { pagina: 1 })).total).toBe(2);
    expect((await listarPreguntasTutor(db, { estado: "fuera_de_tema", pagina: 1 })).filas).toEqual([
      { id: expect.any(String), estudiante: "Ana", caso: { slug: "ventas", titulo: "Ventas" }, mision: "m1", pregunta: "¿Quién ganó el mundial?", respuesta: "Fuera de tema", estado: "fuera_de_tema", creadoEn: expect.any(Date) },
    ]);
  });

  it("lista la caché por caso y borra una respuesta una sola vez, dejando registro", async () => {
    const { admin, cacheId } = await escenario();
    expect((await listarCacheTutor(db, { pagina: 1 })).total).toBe(2);
    expect((await listarCacheTutor(db, { casoSlug: "ventas", pagina: 1 })).filas.map((fila) => fila.pregunta)).toEqual(["¿Qué es WHERE?"]);
    expect(await borrarRespuestaCache(db, { id: cacheId, admin }, SIN_META)).toBe(true);
    expect(await borrarRespuestaCache(db, { id: cacheId, admin }, SIN_META)).toBe(false);
    expect((await listarCacheTutor(db, { casoSlug: "ventas", pagina: 1 })).total).toBe(0);
    expect(await db.select({ action: auditLog.action, metadata: auditLog.metadata }).from(auditLog)).toEqual([
      { action: "tutor_cache_deleted", metadata: { caso: "ventas", mision: "m1", pregunta: "¿Qué es WHERE?" } },
    ]);
  });
});
