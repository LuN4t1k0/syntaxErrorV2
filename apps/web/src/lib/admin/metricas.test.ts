import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casoInscripciones, casos, misionProgreso, rutaCasos, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { metricasDeCaso, resumenContenido } from "./metricas";

const { db, close } = createTestDb();
const AHORA = new Date("2026-09-30T12:00:00Z");
const haceDias = (dias: number) => new Date(AHORA.getTime() - dias * 86_400_000);

async function escenario() {
  const [a, b, c, d] = await db
    .insert(users)
    .values([{ email: "a@correo.cl" }, { email: "b@correo.cl" }, { email: "c@correo.cl" }, { email: "d@correo.cl" }])
    .returning({ id: users.id });
  const [ventas, stock] = await db
    .insert(casos)
    .values([
      { slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "Clientes", tareas: ["t1", "t2"] }, { slug: "m2", titulo: "Totales", tareas: ["t1"] }] },
      { slug: "stock", titulo: "Stock", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "Bodega", tareas: ["t1"] }] },
    ])
    .returning({ id: casos.id });
  const [ruta] = await db.insert(rutas).values({ slug: "analista", titulo: "Analista", cargo: "A", descripcion: "R", estado: "publicada" }).returning({ id: rutas.id });
  await db.insert(rutaCasos).values({ rutaId: ruta.id, casoId: ventas.id, orden: 0 });
  await db.insert(casoInscripciones).values([
    { userId: a.id, casoId: ventas.id, completadoEn: AHORA },
    { userId: b.id, casoId: ventas.id },
  ]);
  await db.insert(misionProgreso).values([
    { userId: a.id, casoId: ventas.id, mision: "m1", estado: "aprobada", intentos: 3, tareasAprobadas: ["t1", "t2"], actualizadoEn: AHORA },
    { userId: b.id, casoId: ventas.id, mision: "m1", estado: "en_curso", intentos: 5, tareasAprobadas: ["t1"], actualizadoEn: haceDias(20) },
    { userId: c.id, casoId: ventas.id, mision: "m1", estado: "en_curso", intentos: 2, tareasAprobadas: [], actualizadoEn: haceDias(1) },
    { userId: a.id, casoId: ventas.id, mision: "m2", estado: "en_curso", intentos: 1, tareasAprobadas: [], actualizadoEn: AHORA },
    { userId: d.id, casoId: stock.id, mision: "m1", estado: "en_curso", intentos: 9, tareasAprobadas: [], actualizadoEn: haceDias(30) },
  ]);
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("métricas de administración", () => {
  it("el resumen de contenido cuenta inscripciones y casos completos, con sus rutas", async () => {
    await escenario();
    expect(await resumenContenido(db)).toEqual([
      { slug: "stock", titulo: "Stock", rutas: [], inscritos: 0, completados: 0 },
      { slug: "ventas", titulo: "Ventas", rutas: [{ slug: "analista", titulo: "Analista", estado: "publicada" }], inscritos: 2, completados: 1 },
    ]);
  });

  it("por misión: iniciaron, aprobaron, intentos, abandono y dónde se traban", async () => {
    await escenario();
    expect(await metricasDeCaso(db, "ventas", AHORA)).toEqual({
      caso: { slug: "ventas", titulo: "Ventas" },
      misiones: [
        {
          slug: "m1",
          titulo: "Clientes",
          iniciaron: 3,
          aprobaron: 1,
          tasaAprobacion: 0.33,
          intentosPromedio: 3.3,
          abandonos: 1,
          trabas: [
            { tarea: "t1", estudiantes: 1 },
            { tarea: "t2", estudiantes: 1 },
          ],
        },
        { slug: "m2", titulo: "Totales", iniciaron: 1, aprobaron: 0, tasaAprobacion: 0, intentosPromedio: 1, abandonos: 0, trabas: [{ tarea: "t1", estudiantes: 1 }] },
      ],
    });
  });

  it("un caso sin actividad da ceros y uno que no existe da null", async () => {
    await escenario();
    await db.insert(casos).values({ slug: "nuevo", titulo: "Nuevo", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "Uno", tareas: ["t1"] }] });
    expect((await metricasDeCaso(db, "nuevo", AHORA))?.misiones).toEqual([
      { slug: "m1", titulo: "Uno", iniciaron: 0, aprobaron: 0, tasaAprobacion: 0, intentosPromedio: 0, abandonos: 0, trabas: [] },
    ]);
    expect(await metricasDeCaso(db, "no-existe", AHORA)).toBeNull();
  });
});
