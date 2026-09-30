import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casoInscripciones, casos, misionProgreso, rutaCasos, rutaInscripciones, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import {
  ErrorProgreso,
  guardarEntregable,
  listarCasosDelUsuario,
  obtenerProgresoCaso,
  registrarIntento,
  sincronizarIntentos,
} from "./servicio";

const { db, close } = createTestDb();

async function prepararCaso() {
  const [usuario] = await db.insert(users).values({ email: "alumna@correo.cl" }).returning({ id: users.id });
  const [ruta] = await db
    .insert(rutas)
    .values({ slug: "analista", titulo: "Analista", cargo: "Analista junior", descripcion: "Ruta", estado: "publicada" })
    .returning({ id: rutas.id });
  const [caso] = await db
    .insert(casos)
    .values({
      slug: "ventas",
      titulo: "Ventas",
      cargo: "Analista junior",
      empresa: "Distribuidora",
      entregable: "Repositorio",
      misiones: [
        { slug: "m1", titulo: "M1", tareas: ["t1", "t2"] },
        { slug: "m2", titulo: "M2", tareas: ["t3"] },
      ],
    })
    .returning({ id: casos.id });
  await db.insert(rutaCasos).values({ rutaId: ruta.id, casoId: caso.id, orden: 0 });
  return { userId: usuario.id, rutaId: ruta.id, casoId: caso.id };
}

const intento = (mision: string, tarea: string, aprobada = true) => ({ caso: "ventas", mision, tarea, aprobada });

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("registrarIntento", () => {
  it("aprueba la misión cuando todas sus tareas están aprobadas", async () => {
    const { userId } = await prepararCaso();
    expect(await registrarIntento(db, userId, intento("m1", "t1"))).toEqual({ misionAprobada: false, casoCompleto: false });
    expect(await registrarIntento(db, userId, intento("m1", "t2"))).toEqual({ misionAprobada: true, casoCompleto: false });
    const [fila] = await db.select().from(misionProgreso);
    expect(fila).toMatchObject({ mision: "m1", estado: "aprobada", intentos: 2, tareasAprobadas: ["t1", "t2"] });
    expect(fila.aprobadaEn).toBeInstanceOf(Date);
  });

  it("un intento fallido suma intentos pero no aprueba la tarea", async () => {
    const { userId } = await prepararCaso();
    expect(await registrarIntento(db, userId, intento("m2", "t3", false))).toEqual({
      misionAprobada: false,
      casoCompleto: false,
    });
    const [fila] = await db.select().from(misionProgreso);
    expect(fila).toMatchObject({ estado: "en_curso", intentos: 1, tareasAprobadas: [] });
  });

  it("aprobar dos veces la misma tarea no la duplica ni cambia la fecha de aprobación", async () => {
    const { userId } = await prepararCaso();
    await registrarIntento(db, userId, intento("m2", "t3"));
    const [primera] = await db.select().from(misionProgreso);
    await registrarIntento(db, userId, intento("m2", "t3"));
    const [segunda] = await db.select().from(misionProgreso);
    expect(segunda).toMatchObject({ estado: "aprobada", intentos: 2, tareasAprobadas: ["t3"] });
    expect(segunda.aprobadaEn).toEqual(primera.aprobadaEn);
  });

  it("inscribe a la alumna en el caso y en sus rutas", async () => {
    const { userId } = await prepararCaso();
    await registrarIntento(db, userId, intento("m1", "t1"));
    expect(await db.select().from(casoInscripciones)).toHaveLength(1);
    expect(await db.select().from(rutaInscripciones)).toHaveLength(1);
  });

  it("rechaza caso, misión o tarea que no existen", async () => {
    const { userId } = await prepararCaso();
    await expect(registrarIntento(db, userId, { ...intento("m1", "t1"), caso: "otro" })).rejects.toMatchObject({
      codigo: "caso_no_existe",
    });
    await expect(registrarIntento(db, userId, intento("m9", "t1"))).rejects.toMatchObject({ codigo: "mision_no_existe" });
    await expect(registrarIntento(db, userId, intento("m1", "t9"))).rejects.toBeInstanceOf(ErrorProgreso);
  });
});

describe("guardarEntregable", () => {
  it("con todas las misiones aprobadas completa el caso y la ruta", async () => {
    const { userId, casoId, rutaId } = await prepararCaso();
    for (const [mision, tarea] of [["m1", "t1"], ["m1", "t2"], ["m2", "t3"]]) {
      await registrarIntento(db, userId, intento(mision, tarea));
    }
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toMatchObject({ completo: false, entregable: null });

    expect(await guardarEntregable(db, userId, { caso: "ventas", url: "https://github.com/alumna/ventas" })).toEqual({
      casoCompleto: true,
    });
    const [inscripcion] = await db.select().from(casoInscripciones).where(eq(casoInscripciones.casoId, casoId));
    expect(inscripcion.completadoEn).toBeInstanceOf(Date);
    const [enRuta] = await db.select().from(rutaInscripciones).where(eq(rutaInscripciones.rutaId, rutaId));
    expect(enRuta.completadoEn).toBeInstanceOf(Date);
  });

  it("sin las misiones no completa el caso, y guardarlo de nuevo reemplaza la URL", async () => {
    const { userId } = await prepararCaso();
    expect(await guardarEntregable(db, userId, { caso: "ventas", url: "https://github.com/alumna/v1" })).toEqual({
      casoCompleto: false,
    });
    await guardarEntregable(db, userId, { caso: "ventas", url: "https://github.com/alumna/v2" });
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toMatchObject({ entregable: "https://github.com/alumna/v2" });
  });
});

describe("sincronizarIntentos", () => {
  it("aplica los válidos, cuenta los rechazados y no duplica lo que ya estaba", async () => {
    const { userId } = await prepararCaso();
    await registrarIntento(db, userId, intento("m1", "t1"));
    const lote = [intento("m1", "t1"), intento("m1", "t2"), intento("m1", "t2"), { ...intento("m1", "t1"), caso: "borrado" }];
    expect(await sincronizarIntentos(db, userId, lote)).toEqual({ aplicados: 3, rechazados: 1 });
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toEqual({
      misiones: { m1: { estado: "aprobada", tareasAprobadas: ["t1", "t2"] } },
      entregable: null,
      completo: false,
    });
  });
});

describe("consultas", () => {
  it("obtenerProgresoCaso devuelve null si el caso no existe", async () => {
    const { userId } = await prepararCaso();
    expect(await obtenerProgresoCaso(db, userId, "otro")).toBeNull();
  });

  it("listarCasosDelUsuario resume el avance de cada caso", async () => {
    const { userId } = await prepararCaso();
    await registrarIntento(db, userId, intento("m1", "t1"));
    await registrarIntento(db, userId, intento("m1", "t2"));
    expect(await listarCasosDelUsuario(db, userId)).toEqual([
      { slug: "ventas", titulo: "Ventas", misionesAprobadas: 1, totalMisiones: 2, completo: false },
    ]);
  });
});
