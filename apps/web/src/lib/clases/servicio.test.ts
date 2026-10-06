import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { casoInscripciones, casos, claseInscripciones, misionProgreso, rutaCasos, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Encolar } from "@/lib/emails";
import {
  cambiarEstadoClase,
  cambiarCasoHabilitado,
  casosDeClase,
  clasesDelEstudiante,
  clasesDelProfesor,
  crearClase,
  decidirInscripcion,
  paginaClasesDelProfesor,
  rosterDeClase,
  unirseAClase,
} from "./servicio";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

async function escenario() {
  const [docente, otraDocente, ana] = await db
    .insert(users)
    .values([
      { email: "rosa@correo.cl", name: "Rosa", role: "teacher" },
      { email: "otra@correo.cl", name: "Otra", role: "teacher" },
      { email: "ana@correo.cl", name: "Ana" },
    ])
    .returning({ id: users.id });
  const [ruta] = await db.insert(rutas).values({ slug: "analista", titulo: "Analista", cargo: "Analista", descripcion: "Ruta" }).returning({ id: rutas.id });
  const [ventas, stock] = await db
    .insert(casos)
    .values([
      { slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }, { slug: "m2", titulo: "M2", tareas: ["t1"] }] },
      { slug: "stock", titulo: "Stock", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }] },
    ])
    .returning({ id: casos.id });
  await db.insert(rutaCasos).values([
    { rutaId: ruta.id, casoId: ventas.id, orden: 0 },
    { rutaId: ruta.id, casoId: stock.id, orden: 1 },
  ]);
  const clase = await crearClase(db, { profesorId: docente.id, titulo: "3°A", rutaSlug: "analista" });
  if (!clase) throw new Error("no se creó la clase");
  return { docenteId: docente.id, otraId: otraDocente.id, anaId: ana.id, clase, ventasId: ventas.id };
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("clases", () => {
  it("crear una clase copia los casos de la ruta, habilitados y en orden", async () => {
    const { docenteId, clase } = await escenario();
    expect(clase.codigo).toMatch(/^[A-Z2-9]{6}$/);
    expect(await casosDeClase(db, clase.id)).toEqual([
      { slug: "ventas", titulo: "Ventas", habilitado: true },
      { slug: "stock", titulo: "Stock", habilitado: true },
    ]);
    expect(await clasesDelProfesor(db, docenteId)).toEqual([
      { id: clase.id, titulo: "3°A", codigo: clase.codigo, estado: "activa", ruta: "Analista", pendientes: 0, activas: 0 },
    ]);
    expect(await crearClase(db, { profesorId: docenteId, titulo: "X", rutaSlug: "no-existe" })).toBeNull();
  });

  it("unirse con el código deja la inscripción pendiente, una sola vez, y avisa a la docente", async () => {
    const { anaId, clase } = await escenario();
    const codigoEscrito = `${clase.codigo.slice(0, 3).toLowerCase()}-${clase.codigo.slice(3)}`;
    expect(await unirseAClase(db, { userId: anaId, codigo: codigoEscrito }, { encolar })).toEqual({ ok: true, estado: "pendiente", clase: "3°A" });
    expect(await unirseAClase(db, { userId: anaId, codigo: clase.codigo }, { encolar })).toEqual({ ok: true, estado: "pendiente", clase: "3°A" });
    expect(await db.select().from(claseInscripciones)).toHaveLength(1);
    expect(enviados).toEqual([
      { tipo: "clase-solicitud", para: "rosa@correo.cl", nombre: "Rosa", alumno: "Ana (ana@correo.cl)", clase: "3°A", enlace: expect.stringContaining(`/profesor/clases/${clase.id}`) },
    ]);
  });

  it("un código que no existe o la propia clase no sirven", async () => {
    const { docenteId, clase } = await escenario();
    expect(await unirseAClase(db, { userId: docenteId, codigo: "ZZZZZZ" }, { encolar })).toEqual({ ok: false, motivo: "codigo_invalido" });
    expect(await unirseAClase(db, { userId: docenteId, codigo: clase.codigo }, { encolar })).toEqual({ ok: false, motivo: "es_tu_clase" });
  });

  it("solo la docente de la clase decide inscripciones y cambia casos", async () => {
    const { docenteId, otraId, anaId, clase } = await escenario();
    await unirseAClase(db, { userId: anaId, codigo: clase.codigo }, { encolar });
    enviados.length = 0;

    expect(await decidirInscripcion(db, { profesorId: otraId, claseId: clase.id, userId: anaId, estado: "activa" }, { encolar })).toBe(false);
    expect(await cambiarCasoHabilitado(db, { profesorId: otraId, claseId: clase.id, casoSlug: "stock", habilitado: false })).toBe(false);
    expect(await rosterDeClase(db, { profesorId: otraId, claseId: clase.id })).toBeNull();

    expect(await decidirInscripcion(db, { profesorId: docenteId, claseId: clase.id, userId: anaId, estado: "activa" }, { encolar })).toBe(true);
    expect(await decidirInscripcion(db, { profesorId: docenteId, claseId: clase.id, userId: anaId, estado: "activa" }, { encolar })).toBe(true);
    expect(enviados.map((email) => [email.tipo, email.para])).toEqual([["clase-decision", "ana@correo.cl"]]);
    expect(await cambiarCasoHabilitado(db, { profesorId: docenteId, claseId: clase.id, casoSlug: "stock", habilitado: false })).toBe(true);
    expect(await decidirInscripcion(db, { profesorId: docenteId, claseId: clase.id, userId: otraId, estado: "activa" }, { encolar })).toBe(false);
  });

  it("el roster muestra el avance de cada estudiante en los casos habilitados", async () => {
    const { docenteId, anaId, clase, ventasId } = await escenario();
    await unirseAClase(db, { userId: anaId, codigo: clase.codigo }, { encolar });
    await decidirInscripcion(db, { profesorId: docenteId, claseId: clase.id, userId: anaId, estado: "activa" }, { encolar });
    await cambiarCasoHabilitado(db, { profesorId: docenteId, claseId: clase.id, casoSlug: "stock", habilitado: false });
    await db.insert(misionProgreso).values({ userId: anaId, casoId: ventasId, mision: "m1", estado: "aprobada" });
    await db.insert(casoInscripciones).values({ userId: anaId, casoId: ventasId });

    expect(await rosterDeClase(db, { profesorId: docenteId, claseId: clase.id })).toEqual([
      {
        userId: anaId,
        nombre: "Ana",
        email: "ana@correo.cl",
        estado: "activa",
        casos: [{ slug: "ventas", titulo: "Ventas", aprobadas: 1, total: 2, completo: false }],
      },
    ]);
  });

  it("el estudiante ve sus clases y, solo si está activo, los casos habilitados", async () => {
    const { docenteId, anaId, clase } = await escenario();
    await unirseAClase(db, { userId: anaId, codigo: clase.codigo }, { encolar });
    expect(await clasesDelEstudiante(db, anaId)).toEqual([{ id: clase.id, titulo: "3°A", docente: "Rosa", estado: "pendiente", casos: [] }]);
    await decidirInscripcion(db, { profesorId: docenteId, claseId: clase.id, userId: anaId, estado: "activa" }, { encolar });
    expect((await clasesDelEstudiante(db, anaId))[0].casos.map((caso) => caso.slug).sort()).toEqual(["stock", "ventas"]);
  });
});

describe("archivar clases", () => {
  it("la docente archiva y restaura su clase; archivada no recibe estudiantes nuevos; otra docente no puede", async () => {
    const { docenteId, otraId, anaId, clase } = await escenario();
    expect(await cambiarEstadoClase(db, { profesorId: otraId, claseId: clase.id, estado: "archivada" })).toBe(false);
    expect(await cambiarEstadoClase(db, { profesorId: docenteId, claseId: clase.id, estado: "archivada" })).toBe(true);
    const activas = await paginaClasesDelProfesor(db, docenteId, { estado: "activa", pagina: 1 });
    const archivadas = await paginaClasesDelProfesor(db, docenteId, { estado: "archivada", pagina: 1 });
    expect([activas.total, archivadas.total, archivadas.filas[0].titulo, archivadas.archivadas]).toEqual([0, 1, "3°A", 1]);
    expect((await unirseAClase(db, { userId: anaId, codigo: clase.codigo }, { encolar })).ok).toBe(false);
    expect(await cambiarEstadoClase(db, { profesorId: docenteId, claseId: clase.id, estado: "activa" })).toBe(true);
    expect((await paginaClasesDelProfesor(db, docenteId, { estado: "activa", pagina: 1 })).total).toBe(1);
  });
});
