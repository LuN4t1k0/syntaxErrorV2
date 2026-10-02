import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, casoInscripciones, casos, certificados, claseCasos, claseInscripciones, clases, entregables, misionProgreso, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import type { Rol } from "@/lib/roles";
import { avisarRevision, listarEntregablesPorRevisar, revisarEntregable } from "./revision";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const deps = { encolar, meta: SIN_META };
const SUFICIENTE = { claridad: 2, ejecucion: 3, coherencia: 2 };

async function persona(email: string, rol: Rol, nombre: string | null = null) {
  const [fila] = await db.insert(users).values({ email, role: rol, name: nombre }).returning({ id: users.id });
  return { id: fila.id, email, nombre, rol };
}

async function escenario() {
  const ana = await persona("ana@correo.cl", "student", "Ana");
  const rosa = await persona("rosa@correo.cl", "teacher", "Rosa");
  const otra = await persona("otra@correo.cl", "teacher");
  const admin = await persona("admin@correo.cl", "admin", "Admin");
  const [caso] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "E", entregable: "R", misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }] })
    .returning({ id: casos.id });
  await db.insert(casoInscripciones).values({ userId: ana.id, casoId: caso.id });
  await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m1", estado: "aprobada", tareasAprobadas: ["t1"] });
  const [entregable] = await db.insert(entregables).values({ userId: ana.id, casoId: caso.id, url: "https://github.com/ana/ventas" }).returning({ id: entregables.id });
  return { ana, rosa, otra, admin, casoId: caso.id, entregableId: entregable.id };
}

async function enClaseDeRosa(alumnoId: string, profesorId: string, casoId: string) {
  const [ruta] = await db.insert(rutas).values({ slug: "r", titulo: "R", cargo: "A", descripcion: "R" }).returning({ id: rutas.id });
  const [clase] = await db.insert(clases).values({ profesorId, rutaId: ruta.id, titulo: "3°A", codigo: "ABC234" }).returning({ id: clases.id });
  await db.insert(claseCasos).values({ claseId: clase.id, casoId });
  await db.insert(claseInscripciones).values({ claseId: clase.id, userId: alumnoId, estado: "activa" });
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("revisión de entregables", () => {
  it("lista los pendientes a administración y a la docente de la clase, no a otra docente", async () => {
    const { ana, rosa, otra, admin, casoId } = await escenario();
    expect(await listarEntregablesPorRevisar(db, admin)).toHaveLength(1);
    expect(await listarEntregablesPorRevisar(db, rosa)).toEqual([]);
    await enClaseDeRosa(ana.id, rosa.id, casoId);
    expect(await listarEntregablesPorRevisar(db, rosa)).toEqual([
      { id: expect.any(String), estudiante: { nombre: "Ana", email: "ana@correo.cl" }, caso: { slug: "ventas", titulo: "Ventas" }, url: "https://github.com/ana/ventas", enviadoEn: expect.any(Date) },
    ]);
    expect(await listarEntregablesPorRevisar(db, otra)).toEqual([]);
  });

  it("avisa a la docente de la clase o, si no hay, a administración", async () => {
    const { ana, rosa, casoId } = await escenario();
    await avisarRevision(db, { alumnoId: ana.id, casoSlug: "ventas" }, { encolar });
    expect(enviados.map((email) => [email.tipo, email.para])).toEqual([["entregable-por-revisar", "admin@correo.cl"]]);
    enviados.length = 0;
    await enClaseDeRosa(ana.id, rosa.id, casoId);
    await avisarRevision(db, { alumnoId: ana.id, casoSlug: "ventas" }, { encolar });
    expect(enviados.map((email) => email.para)).toEqual(["rosa@correo.cl"]);
  });

  it("con 2 o más en las tres dimensiones aprueba, completa el caso y emite el certificado una sola vez", async () => {
    const { admin, entregableId } = await escenario();
    const revisar = (puntajes: Record<string, number>) => revisarEntregable(db, { entregableId, revisor: admin, puntajes, observaciones: {}, comentario: null }, deps);
    expect(await revisar({ claridad: 2, ejecucion: 3 })).toEqual({ ok: false, motivo: "puntajes_incompletos" });
    expect(await revisar(SUFICIENTE)).toEqual({ ok: true, decision: "aprobado", certificados: [{ codigo: expect.any(String), tipo: "caso", titulo: "Ventas" }] });
    expect(await revisar(SUFICIENTE)).toEqual({ ok: false, motivo: "no_existe" });
    const [fila] = await db.select().from(entregables);
    expect(fila).toMatchObject({ estado: "aprobado", puntajes: SUFICIENTE, observaciones: {} });
    expect(await db.select().from(certificados)).toHaveLength(1);
    expect(enviados.map((email) => email.tipo)).toEqual(["certificado-emitido"]);
    expect((await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action)).toEqual(["deliverable_reviewed"]);
  });

  it("con un 1 pide cambios, exige el comentario de esa dimensión y avisa por email", async () => {
    const { admin, entregableId } = await escenario();
    const puntajes = { claridad: 3, ejecucion: 2, coherencia: 1 };
    const observar = (observaciones: Record<string, string>) => revisarEntregable(db, { entregableId, revisor: admin, puntajes, observaciones, comentario: " Buen README. " }, deps);
    expect(await observar({ coherencia: "corto" })).toEqual({ ok: false, motivo: "falta_observacion" });
    expect(await observar({ coherencia: "Falta explicar las conclusiones en el README." })).toEqual({ ok: true, decision: "observado", certificados: [] });
    expect(enviados).toEqual([
      {
        tipo: "entregable-observado",
        para: "ana@correo.cl",
        nombre: "Ana",
        caso: "Ventas",
        observaciones: ["Coherencia de las conclusiones (Insuficiente): Falta explicar las conclusiones en el README.", "Comentario general: Buen README."],
        enlace: expect.stringContaining("/casos/ventas"),
      },
    ]);
    const [fila] = await db.select().from(entregables);
    expect(fila).toMatchObject({ estado: "observado", puntajes, observaciones: { coherencia: "Falta explicar las conclusiones en el README." }, comentario: "Buen README.", revisadoPor: admin.id });
  });

  it("una docente que no es de la clase no puede revisar", async () => {
    const { otra, entregableId } = await escenario();
    expect(await revisarEntregable(db, { entregableId, revisor: otra, puntajes: SUFICIENTE, observaciones: {}, comentario: null }, deps)).toEqual({ ok: false, motivo: "prohibido" });
  });
});
