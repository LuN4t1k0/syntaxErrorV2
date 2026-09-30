import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, preguntasProfesor, reportes, resenasCaso, solicitudesDocente, tutorPreguntas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { resumenAdmin } from "./resumen";

const { db, close } = createTestDb();
const AHORA = new Date("2026-09-30T12:00:00Z");
const hace = (dias: number) => new Date(AHORA.getTime() - dias * 86_400_000);

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("resumenAdmin", () => {
  it("cuenta lo que espera revisión y la actividad de la semana", async () => {
    const [ana, rosa, beto] = await db
      .insert(users)
      .values([
        { email: "ana@correo.cl", createdAt: hace(2) },
        { email: "rosa@correo.cl", role: "teacher", createdAt: hace(30) },
        { email: "beto@correo.cl", createdAt: hace(10) },
      ])
      .returning({ id: users.id });
    const [caso] = await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [] }).returning({ id: casos.id });
    await db.insert(solicitudesDocente).values([{ userId: ana.id }, { userId: beto.id, estado: "rechazada" }]);
    await db.insert(resenasCaso).values([
      { userId: ana.id, casoId: caso.id, estrellas: 5, comentario: "Bien", estadoComentario: "pendiente" },
      { userId: beto.id, casoId: caso.id, estrellas: 4, comentario: "Ok", estadoComentario: "aprobado" },
    ]);
    await db.insert(reportes).values([
      { userId: ana.id, tipo: "error", descripcion: "No carga", pagina: "/" },
      { userId: ana.id, tipo: "error", descripcion: "Ya visto", pagina: "/", estado: "resuelto" },
    ]);
    await db.insert(preguntasProfesor).values([
      { alumnoId: ana.id, casoId: caso.id, mision: "m1", texto: "¿Sin docente?" },
      { alumnoId: ana.id, casoId: caso.id, mision: "m1", texto: "¿Con docente?", profesorId: rosa.id },
    ]);
    await db.insert(tutorPreguntas).values([
      { userId: ana.id, casoId: caso.id, mision: "m1", pregunta: "¿Hoy?", estado: "respondida", creadoEn: hace(1) },
      { userId: ana.id, casoId: caso.id, mision: "m1", pregunta: "¿Antes?", estado: "respondida", creadoEn: hace(9) },
    ]);

    expect(await resumenAdmin(db, AHORA)).toEqual({
      usuarios: 3,
      nuevosSemana: 1,
      docentes: 1,
      solicitudesPendientes: 1,
      comentariosPendientes: 1,
      reportesPendientes: 1,
      preguntasSinDocente: 1,
      preguntasTutorSemana: 1,
    });
  });
});
