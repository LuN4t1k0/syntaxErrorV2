import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  casoInscripciones,
  casos,
  certificados,
  certificadosLegacy,
  rutaCasos,
  rutaInscripciones,
  rutas,
  users,
} from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { buscarCertificado, emitirCertificadosDelCaso, generarCodigo, listarCertificados } from "./servicio";

const { db, close } = createTestDb();

async function escenario({
  nombre = "Ana Rojas" as string | null,
  casoCompleto = true,
  rutaCompleta = true,
} = {}) {
  const [usuario] = await db.insert(users).values({ email: "ana@correo.cl", name: nombre }).returning({ id: users.id });
  const [ruta] = await db
    .insert(rutas)
    .values({
      slug: "data-analyst",
      titulo: "Data Analyst",
      cargo: "Analista de datos junior",
      descripcion: "Ruta",
      estado: "publicada",
    })
    .returning({ id: rutas.id });
  const [caso] = await db
    .insert(casos)
    .values({
      slug: "ventas",
      titulo: "Ventas de marzo",
      cargo: "Analista de datos junior",
      empresa: "Distribuidora",
      entregable: "Repo",
      misiones: [],
    })
    .returning({ id: casos.id });
  await db.insert(rutaCasos).values({ rutaId: ruta.id, casoId: caso.id, orden: 0 });
  await db.insert(casoInscripciones).values({ userId: usuario.id, casoId: caso.id, completadoEn: casoCompleto ? new Date() : null });
  await db.insert(rutaInscripciones).values({ userId: usuario.id, rutaId: ruta.id, completadoEn: rutaCompleta ? new Date() : null });
  return usuario.id;
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("generarCodigo", () => {
  it("genera 12 caracteres sin letras ni números ambiguos", () => {
    for (let i = 0; i < 50; i += 1) expect(generarCodigo()).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);
  });
});

describe("emitirCertificadosDelCaso", () => {
  it("emite el certificado del caso y el de la ruta, con una foto fija del alumno y el título", async () => {
    const userId = await escenario();
    const emitidos = await emitirCertificadosDelCaso(db, userId, "ventas");
    expect(emitidos.map(({ tipo, titulo }) => ({ tipo, titulo }))).toEqual([
      { tipo: "caso", titulo: "Ventas de marzo" },
      { tipo: "ruta", titulo: "Data Analyst" },
    ]);
    const filas = await db.select().from(certificados);
    expect(filas.map((fila) => [fila.nombreAlumno, fila.cargo])).toEqual([
      ["Ana Rojas", "Analista de datos junior"],
      ["Ana Rojas", "Analista de datos junior"],
    ]);
  });

  it("no emite dos veces el mismo certificado", async () => {
    const userId = await escenario();
    await emitirCertificadosDelCaso(db, userId, "ventas");
    expect(await emitirCertificadosDelCaso(db, userId, "ventas")).toEqual([]);
    expect(await db.select().from(certificados)).toHaveLength(2);
  });

  it("no emite nada si el caso no está completo", async () => {
    const userId = await escenario({ casoCompleto: false, rutaCompleta: false });
    expect(await emitirCertificadosDelCaso(db, userId, "ventas")).toEqual([]);
  });

  it("sin nombre usa la parte del email antes de la @", async () => {
    const userId = await escenario({ nombre: null, rutaCompleta: false });
    await emitirCertificadosDelCaso(db, userId, "ventas");
    const [fila] = await db.select().from(certificados);
    expect(fila.nombreAlumno).toBe("ana");
  });

  it("un caso que no existe no emite nada", async () => {
    const userId = await escenario();
    expect(await emitirCertificadosDelCaso(db, userId, "otro")).toEqual([]);
  });
});

describe("buscarCertificado y listarCertificados", () => {
  it("encuentra los certificados nuevos y los de la v1", async () => {
    const userId = await escenario({ rutaCompleta: false });
    const [nuevo] = await emitirCertificadosDelCaso(db, userId, "ventas");
    await db.insert(certificadosLegacy).values({
      codigo: "V1codigo1234",
      nombreAlumno: "Pedro Soto",
      titulo: "SQL inicial",
      tipo: "curso",
      emitidoEn: new Date("2026-03-01T12:00:00Z"),
    });

    expect(await buscarCertificado(db, nuevo.codigo)).toMatchObject({ tipo: "caso", titulo: "Ventas de marzo", legado: false });
    expect(await buscarCertificado(db, "V1codigo1234")).toMatchObject({
      tipo: "curso",
      nombreAlumno: "Pedro Soto",
      cargo: null,
      legado: true,
    });
    expect(await buscarCertificado(db, "no-existe")).toBeNull();
  });

  it("lista los certificados de la alumna", async () => {
    const userId = await escenario();
    await emitirCertificadosDelCaso(db, userId, "ventas");
    expect((await listarCertificados(db, userId)).map((certificado) => certificado.tipo).sort()).toEqual(["caso", "ruta"]);
  });
});
