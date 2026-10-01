import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casoInscripciones, casos, entregables, misionProgreso, rutaCasos, rutaInscripciones, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { verificadorPrueba } from "@/lib/entregables/github";
import {
  ErrorProgreso,
  enviarEntregable,
  listarCasosDelUsuario,
  obtenerProgresoCaso,
  recalcularCaso,
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
const aprobarM1 = async (userId: string) => {
  await registrarIntento(db, userId, intento("m1", "t1"));
  await registrarIntento(db, userId, intento("m1", "t2"));
};

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

  it("un intento fallido suma intentos y fallidos, pero no aprueba la tarea", async () => {
    const { userId } = await prepararCaso();
    expect(await registrarIntento(db, userId, intento("m1", "t1", false))).toEqual({
      misionAprobada: false,
      casoCompleto: false,
    });
    const [fila] = await db.select().from(misionProgreso);
    expect(fila).toMatchObject({ estado: "en_curso", intentos: 1, fallidos: 1, tareasAprobadas: [] });
  });

  it("aprobar dos veces la misma tarea no la duplica ni cambia la fecha de aprobación", async () => {
    const { userId } = await prepararCaso();
    await aprobarM1(userId);
    await registrarIntento(db, userId, intento("m2", "t3"));
    const [primera] = await db.select().from(misionProgreso).where(eq(misionProgreso.mision, "m2"));
    await registrarIntento(db, userId, intento("m2", "t3"));
    const [segunda] = await db.select().from(misionProgreso).where(eq(misionProgreso.mision, "m2"));
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
    const { userId, rutaId, casoId } = await prepararCaso();
    const [siguiente] = await db
      .insert(casos)
      .values({ slug: "stock", titulo: "Stock", cargo: "A", empresa: "E", entregable: "R", misiones: [{ slug: "s1", titulo: "S1", tareas: ["x"] }] })
      .returning({ id: casos.id });
    await db.insert(rutaCasos).values({ rutaId, casoId: siguiente.id, orden: 1 });
    const enStock = { caso: "stock", mision: "s1", tarea: "x", aprobada: true };
    await expect(registrarIntento(db, userId, enStock)).rejects.toMatchObject({ codigo: "caso_bloqueado" });
    expect((await obtenerProgresoCaso(db, userId, "stock"))?.bloqueadoPor).toEqual({ slug: "ventas", titulo: "Ventas" });
    await db.insert(casoInscripciones).values({ userId, casoId, completadoEn: new Date() });
    expect(await registrarIntento(db, userId, enStock)).toMatchObject({ misionAprobada: true });
    expect((await obtenerProgresoCaso(db, userId, "stock"))?.bloqueadoPor).toBeNull();
  });
});

describe("enviarEntregable", () => {
  const verificar = { verificar: verificadorPrueba };
  const enviar = (userId: string, url = "https://github.com/alumna/ventas") => enviarEntregable(db, userId, { caso: "ventas", url, archivos: [] }, verificar);

  it("verificado queda en revisión; aprobado completa el caso y la ruta", async () => {
    const { userId, casoId, rutaId } = await prepararCaso();
    await aprobarM1(userId);
    await registrarIntento(db, userId, intento("m2", "t3"));
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toMatchObject({ completo: false, entregable: null, revision: null });

    expect(await enviar(userId, "https://github.com/alumna/ventas/tree/main")).toEqual({ estado: "en_revision" });
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toMatchObject({ completo: false, entregable: "https://github.com/alumna/ventas", revision: { estado: "pendiente", comentario: null } });
    await db.update(entregables).set({ estado: "aprobado" });
    expect(await recalcularCaso(db, userId, "ventas")).toEqual({ casoCompleto: true });
    const [inscripcion] = await db.select().from(casoInscripciones).where(eq(casoInscripciones.casoId, casoId));
    expect(inscripcion.completadoEn).toBeInstanceOf(Date);
    const [enRuta] = await db.select().from(rutaInscripciones).where(eq(rutaInscripciones.rutaId, rutaId));
    expect(enRuta.completadoEn).toBeInstanceOf(Date);
  });

  it("exige misiones aprobadas y no guarda si la verificación falla", async () => {
    const { userId } = await prepararCaso();
    await expect(enviar(userId)).rejects.toMatchObject({ codigo: "misiones_pendientes" });
    await aprobarM1(userId);
    await registrarIntento(db, userId, intento("m2", "t3"));
    expect(await enviar(userId, "https://github.com/alumna/repo-vacio")).toEqual({
      estado: "no_verificado",
      problemas: ["Falta el README en la carpeta principal del repositorio."],
      reintentable: false,
    });
    expect(await db.select().from(entregables)).toEqual([]);
  });

  it("un entregable observado se puede reenviar y vuelve a pendiente; uno aprobado no se reemplaza", async () => {
    const { userId } = await prepararCaso();
    await aprobarM1(userId);
    await registrarIntento(db, userId, intento("m2", "t3"));
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

describe("sincronizarIntentos", () => {
  it("aplica los válidos, cuenta los rechazados y no duplica lo que ya estaba", async () => {
    const { userId } = await prepararCaso();
    await registrarIntento(db, userId, intento("m1", "t1"));
    const lote = [intento("m1", "t1"), intento("m2", "t3"), intento("m1", "t2"), intento("m1", "t2"), { ...intento("m1", "t1"), caso: "borrado" }];
    expect(await sincronizarIntentos(db, userId, lote)).toEqual({ aplicados: 3, rechazados: 2 });
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toEqual({
      misiones: { m1: { estado: "aprobada", tareasAprobadas: ["t1", "t2"], fallidos: 0 } },
      entregable: null,
      revision: null,
      completo: false,
      bloqueadoPor: null,
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
