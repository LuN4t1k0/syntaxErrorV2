import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, casos, mensajes, reportes, resenasCaso, solicitudesDocente, transaccionesPuntos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { moderarComentario } from "@/lib/resenas";
import {
  listarComentariosPendientes,
  listarReportes,
  listarSolicitudesPendientes,
  resolverReporte,
  resolverSolicitudDocente,
} from "./moderacion";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const deps = { encolar, meta: SIN_META };
const ADMIN = { id: "", email: "admin@correo.cl" };

async function persona(email: string, nombre: string | null = null) {
  const [fila] = await db.insert(users).values({ email, name: nombre }).returning({ id: users.id, role: users.role });
  return fila;
}

async function acciones() {
  return (await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action);
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
  const [admin] = await db.insert(users).values({ email: "admin@correo.cl", role: "admin" }).returning({ id: users.id });
  ADMIN.id = admin.id;
});
afterAll(() => close());

describe("solicitudes docentes", () => {
  it("aprobar sube el rol, avisa por mensaje interno y deja registro; la segunda vez no hace nada", async () => {
    const rosa = await persona("rosa@correo.cl", "Rosa");
    const [solicitud] = await db.insert(solicitudesDocente).values({ userId: rosa.id }).returning({ id: solicitudesDocente.id });
    expect(await listarSolicitudesPendientes(db)).toEqual([{ id: solicitud.id, userId: rosa.id, nombre: "Rosa", email: "rosa@correo.cl", creadaEn: expect.any(Date) }]);

    expect(await resolverSolicitudDocente(db, { solicitudId: solicitud.id, admin: ADMIN, decision: "aprobada" }, deps)).toBe(true);
    expect(await resolverSolicitudDocente(db, { solicitudId: solicitud.id, admin: ADMIN, decision: "rechazada" }, deps)).toBe(false);

    const [actualizada] = await db.select({ role: users.role }).from(users).where(eq(users.id, rosa.id));
    expect(actualizada.role).toBe("teacher");
    expect((await db.select({ asunto: mensajes.asunto }).from(mensajes)).map((fila) => fila.asunto)).toEqual(["Tu acceso docente fue aprobado"]);
    expect(enviados.map((email) => [email.tipo, email.para])).toEqual([["mensaje-nuevo", "rosa@correo.cl"]]);
    expect(await acciones()).toEqual(["role_changed", "teacher_request_decided"]);
    expect(await listarSolicitudesPendientes(db)).toEqual([]);
  });

  it("una solicitud que no existe devuelve false", async () => {
    expect(await resolverSolicitudDocente(db, { solicitudId: "0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11", admin: ADMIN, decision: "aprobada" }, deps)).toBe(false);
  });
});

describe("comentarios de reseñas", () => {
  it("lista solo los comentarios pendientes, con su caso", async () => {
    const ana = await persona("ana@correo.cl", "Ana");
    const [caso] = await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [] }).returning({ id: casos.id });
    const [resena] = await db
      .insert(resenasCaso)
      .values({ userId: ana.id, casoId: caso.id, estrellas: 4, comentario: "Muy claro", estadoComentario: "pendiente" })
      .returning({ id: resenasCaso.id });
    expect(await listarComentariosPendientes(db)).toEqual([
      { id: resena.id, caso: { slug: "ventas", titulo: "Ventas" }, nombre: "Ana", email: "ana@correo.cl", estrellas: 4, comentario: "Muy claro", creadaEn: expect.any(Date) },
    ]);
    await moderarComentario(db, { resenaId: resena.id, admin: ADMIN, decision: "aprobado" }, SIN_META);
    expect(await listarComentariosPendientes(db)).toEqual([]);
  });
});

describe("reportes", () => {
  async function reporte(tipo: "error" | "sugerencia", caso: string | null) {
    const ana = await persona(`ana-${tipo}@correo.cl`, "Ana");
    const [fila] = await db
      .insert(reportes)
      .values({ userId: ana.id, tipo, descripcion: "La tabla no carga en la misión.", pagina: caso ? `/casos/${caso}/m1` : "/", caso, mision: caso ? "m1" : null })
      .returning({ id: reportes.id });
    return { reporteId: fila.id, userId: ana.id };
  }

  it("resolver un error útil de un caso suma 25 puntos una vez, responde por mensaje y deja registro", async () => {
    await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [] });
    const { reporteId, userId } = await reporte("error", "ventas");
    const respuesta = { asunto: "Gracias por tu reporte", cuerpo: "Ya lo corregimos." };
    expect(await resolverReporte(db, { reporteId, admin: ADMIN, util: true, respuesta }, deps)).toBe(true);
    expect(await resolverReporte(db, { reporteId, admin: ADMIN, util: true, respuesta }, deps)).toBe(false);

    expect(await db.select({ userId: transaccionesPuntos.userId, cantidad: transaccionesPuntos.cantidad, motivo: transaccionesPuntos.motivo }).from(transaccionesPuntos)).toEqual([
      { userId, cantidad: 25, motivo: "reporte_util" },
    ]);
    expect(await db.select({ reporteId: mensajes.reporteId, asunto: mensajes.asunto }).from(mensajes)).toEqual([{ reporteId, asunto: "Gracias por tu reporte" }]);
    expect(await acciones()).toEqual(["report_resolved"]);
    const resueltos = await listarReportes(db, { estado: "resuelto", pagina: 1 });
    expect(resueltos).toMatchObject({ total: 1, filas: [{ id: reporteId, estado: "resuelto", autor: { email: "ana-error@correo.cl" } }] });
  });

  it("una sugerencia, o un error marcado como no útil, se resuelve sin puntos ni mensaje", async () => {
    await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [] });
    const sugerencia = await reporte("sugerencia", null);
    const error = await reporte("error", "ventas");
    expect(await resolverReporte(db, { reporteId: sugerencia.reporteId, admin: ADMIN, util: true, respuesta: null }, deps)).toBe(true);
    expect(await resolverReporte(db, { reporteId: error.reporteId, admin: ADMIN, util: false, respuesta: null }, deps)).toBe(true);
    expect(await db.select().from(transaccionesPuntos)).toEqual([]);
    expect(await db.select().from(mensajes)).toEqual([]);
    expect(await listarReportes(db, { estado: "pendiente", pagina: 1 })).toMatchObject({ total: 0, filas: [] });
  });
});
