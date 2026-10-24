import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, rutaCasos, rutas } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Bloque } from "./esquemas";
import { RUBRICA_BASE } from "./rubrica";
import { sincronizarContenido } from "./sincronizar";
import type { Contenido } from "./tipos";

const { db, close } = createTestDb();

function tarea(id: string): Bloque {
  return {
    tipo: "SqlTask",
    props: { id, inicial: "", solucion: "SELECT 1", comparar: "filas-en-orden", pistas: [] },
    texto: null,
  };
}

function contenido(): Contenido {
  return {
    rutas: [
      {
        slug: "analista",
        titulo: "Analista",
        cargo: "Analista junior",
        descripcion: "Ruta de prueba",
        estado: "publicada",
        casos: ["ventas"],
        tecnologias: [],
      },
    ],
    casos: [
      {
        tipo: "caso",
        slug: "ventas",
        titulo: "Ventas",
        cargo: "Analista junior",
        empresa: "Distribuidora",
        dataset: "Ventas",
        entregable: "Repositorio",
        archivos: [],
        rubrica: RUBRICA_BASE,
        datos: [],
        misiones: [
          { slug: "m1", titulo: "M1", tiempo: 5, sinGuia: false, fuente: "", bloques: [tarea("t1"), tarea("t2")] },
          { slug: "m2", titulo: "M2", tiempo: 5, sinGuia: false, fuente: "", bloques: [tarea("t3")] },
        ],
      },
    ],
  };
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("sincronizarContenido", () => {
  it("crea rutas, casos con sus tareas y el orden de la ruta", async () => {
    expect(await sincronizarContenido(db, contenido())).toEqual({ rutas: 1, casos: 1 });
    const [caso] = await db.select().from(casos);
    expect(caso.misiones).toEqual([
      { slug: "m1", titulo: "M1", tareas: ["t1", "t2"] },
      { slug: "m2", titulo: "M2", tareas: ["t3"] },
    ]);
    const [ruta] = await db.select().from(rutas);
    expect(ruta).toMatchObject({ slug: "analista", estado: "publicada" });
    expect(await db.select().from(rutaCasos)).toEqual([{ rutaId: ruta.id, casoId: caso.id, orden: 0 }]);
  });

  it("es idempotente", async () => {
    await sincronizarContenido(db, contenido());
    await sincronizarContenido(db, contenido());
    expect(await db.select().from(rutas)).toHaveLength(1);
    expect(await db.select().from(casos)).toHaveLength(1);
    expect(await db.select().from(rutaCasos)).toHaveLength(1);
  });

  it("actualiza el tipo, los títulos y las tareas sin cambiar el id del caso", async () => {
    await sincronizarContenido(db, contenido());
    const [antes] = await db.select().from(casos);
    const cambiado = contenido();
    cambiado.casos[0].titulo = "Ventas de marzo";
    cambiado.casos[0].tipo = "clases";
    cambiado.casos[0].misiones[1].bloques.push(tarea("t4"));
    await sincronizarContenido(db, cambiado);
    const [despues] = await db.select().from(casos).where(eq(casos.slug, "ventas"));
    expect(antes.tipo).toBe("caso");
    expect(despues.id).toBe(antes.id);
    expect(despues).toMatchObject({ titulo: "Ventas de marzo", tipo: "clases" });
    expect(despues.misiones[1].tareas).toEqual(["t3", "t4"]);
  });

  it("actualiza el estado inicial y el teaser sin pisar el estado que eligió el admin", async () => {
    await sincronizarContenido(db, contenido());
    await db.update(rutas).set({ estadoAdmin: "oculta" }).where(eq(rutas.slug, "analista"));
    const cambiado = contenido();
    cambiado.rutas[0] = { ...cambiado.rutas[0], estado: "beta", teaser: "Pronto" };
    await sincronizarContenido(db, cambiado);
    const [ruta] = await db.select().from(rutas);
    expect(ruta).toMatchObject({ estado: "beta", teaser: "Pronto", estadoAdmin: "oculta" });
  });

  it("una ruta que sale del contenido pasa a borrador", async () => {
    await sincronizarContenido(db, contenido());
    await sincronizarContenido(db, { ...contenido(), rutas: [] });
    const [ruta] = await db.select().from(rutas);
    expect(ruta.estado).toBe("borrador");
  });
});
