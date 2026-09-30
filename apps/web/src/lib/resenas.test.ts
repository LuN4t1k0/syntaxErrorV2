import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, casoInscripciones, casos, resenasCaso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { crearResena, miResena, moderarComentario, resumenResenas } from "./resenas";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

async function preparar({ completo }: { completo: boolean }) {
  const [alumna] = await db.insert(users).values({ email: "ana@correo.cl", name: "Ana María Soto" }).returning({ id: users.id });
  const [admin] = await db.insert(users).values({ email: "admin@correo.cl", name: "Admin", role: "admin" }).returning({ id: users.id });
  const [caso] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
    .returning({ id: casos.id });
  await db.insert(casoInscripciones).values({ userId: alumna.id, casoId: caso.id, completadoEn: completo ? new Date() : null });
  return { alumnaId: alumna.id, adminId: admin.id };
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("reseñas por caso", () => {
  it("solo quien completó el caso puede reseñar", async () => {
    const { alumnaId } = await preparar({ completo: false });
    expect(await miResena(db, alumnaId, "ventas")).toEqual({ estado: "no_completado" });
    expect(await crearResena(db, { userId: alumnaId, casoSlug: "ventas", estrellas: 5, comentario: null }, { encolar })).toEqual({
      ok: false,
      motivo: "no_completado",
    });
  });

  it("sin sesión, o con un caso que no existe", async () => {
    await preparar({ completo: true });
    expect(await miResena(db, null, "ventas")).toEqual({ estado: "sin_sesion" });
    expect(await miResena(db, null, "otro")).toBeNull();
    expect(await resumenResenas(db, "otro")).toBeNull();
  });

  it("una reseña con comentario queda pendiente, avisa a administración y no se publica hasta aprobarla", async () => {
    const { alumnaId, adminId } = await preparar({ completo: true });
    expect(await crearResena(db, { userId: alumnaId, casoSlug: "ventas", estrellas: 4, comentario: "  Muy claro  " }, { encolar })).toEqual({ ok: true });
    expect(enviados).toEqual([
      { tipo: "resena-nueva", para: "admin@correo.cl", nombre: "Admin", caso: "Ventas", estrellas: 4, comentario: "Muy claro" },
    ]);
    expect(await miResena(db, alumnaId, "ventas")).toEqual({ estado: "ya_reseno", estrellas: 4, comentario: "Muy claro", estadoComentario: "pendiente" });
    expect(await resumenResenas(db, "ventas")).toEqual({ promedio: 4, cantidad: 1, comentarios: [] });

    const [resena] = await db.select().from(resenasCaso);
    expect(await moderarComentario(db, { resenaId: resena.id, admin: { id: adminId, email: "admin@correo.cl" }, decision: "aprobado" }, SIN_META)).toBe(true);
    expect(await moderarComentario(db, { resenaId: resena.id, admin: { id: adminId, email: "admin@correo.cl" }, decision: "rechazado" }, SIN_META)).toBe(false);
    expect((await resumenResenas(db, "ventas"))?.comentarios).toEqual([
      { id: resena.id, nombre: "Ana", estrellas: 4, comentario: "Muy claro", creadaEn: expect.any(String) },
    ]);
    expect((await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action)).toEqual(["review_moderated"]);
  });

  it("la segunda reseña del mismo caso se rechaza", async () => {
    const { alumnaId } = await preparar({ completo: true });
    await crearResena(db, { userId: alumnaId, casoSlug: "ventas", estrellas: 5, comentario: null }, { encolar });
    expect(await crearResena(db, { userId: alumnaId, casoSlug: "ventas", estrellas: 1, comentario: null }, { encolar })).toEqual({
      ok: false,
      motivo: "ya_reseno",
    });
    expect(enviados).toEqual([]);
    expect(await resumenResenas(db, "ventas")).toEqual({ promedio: 5, cantidad: 1, comentarios: [] });
  });

  it("el promedio se redondea a un decimal", async () => {
    await preparar({ completo: true });
    const [caso] = await db.select({ id: casos.id }).from(casos);
    const otras = await db
      .insert(users)
      .values([{ email: "b@correo.cl" }, { email: "c@correo.cl" }, { email: "d@correo.cl" }])
      .returning({ id: users.id });
    await db.insert(resenasCaso).values(otras.map((persona, indice) => ({ userId: persona.id, casoId: caso.id, estrellas: [5, 4, 4][indice] })));
    expect((await resumenResenas(db, "ventas"))?.promedio).toBe(4.3);
  });
});
