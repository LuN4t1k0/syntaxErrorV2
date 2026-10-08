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
