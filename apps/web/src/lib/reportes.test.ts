import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { reportes, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Encolar } from "@/lib/emails";
import { contextoDePagina, crearReporte, paginaValida } from "./reportes";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("reportes", () => {
  it("solo acepta rutas internas como página", () => {
    expect(paginaValida("/casos/ventas/m1?x=1")).toBe(true);
    expect(paginaValida("/")).toBe(true);
    expect(paginaValida("https://otro.sitio")).toBe(false);
    expect(paginaValida("//otro.sitio")).toBe(false);
    expect(paginaValida("/con espacio")).toBe(false);
  });

  it("saca el caso y la misión de la página", () => {
    expect(contextoDePagina("/casos/ventas/m1?x=1")).toEqual({ caso: "ventas", mision: "m1" });
    expect(contextoDePagina("/casos/ventas")).toEqual({ caso: "ventas", mision: null });
    expect(contextoDePagina("/dashboard")).toEqual({ caso: null, mision: null });
  });

  it("guarda el reporte con su contexto y avisa a administración", async () => {
    const [autora] = await db.insert(users).values({ email: "ana@correo.cl", name: "Ana" }).returning({ id: users.id });
    await db.insert(users).values({ email: "admin@correo.cl", name: "Admin", role: "admin" });
    await crearReporte(
      db,
      { id: autora.id, email: "ana@correo.cl", nombre: "Ana" },
      { tipo: "error", descripcion: "La tabla no carga en la misión.", pagina: "/casos/ventas/m1" },
      { encolar }
    );
    const [guardado] = await db.select().from(reportes);
    expect(guardado).toMatchObject({ userId: autora.id, tipo: "error", caso: "ventas", mision: "m1", estado: "pendiente" });
    expect(enviados).toEqual([
      {
        tipo: "reporte-nuevo",
        para: "admin@correo.cl",
        nombre: "Admin",
        tipoReporte: "error",
        descripcion: "La tabla no carga en la misión.",
        pagina: "/casos/ventas/m1",
        autor: "Ana (ana@correo.cl)",
      },
    ]);
  });
});
